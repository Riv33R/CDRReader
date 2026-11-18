import csv
import gzip
import hashlib
import io
import socket
import struct
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cdr import CdrRecord, CmrRecord

CDR_KNOWN_COLUMNS = {
    "cdrRecordType",
    "globalCallID_callManagerId",
    "globalCallID_callId",
    "origLegCallIdentifier",
    "destLegIdentifier",
    "dateTimeOrigination",
    "dateTimeConnect",
    "dateTimeDisconnect",
    "callingPartyNumber",
    "originalCalledPartyNumber",
    "finalCalledPartyNumber",
    "lastRedirectDn",
    "duration",
    "origCause_value",
    "destCause_value",
    "origDeviceName",
    "destDeviceName",
    "origMediaTransportAddress_IP",
    "destMediaTransportAddress_IP",
    "origIpAddr",
    "destIpAddr",
    "origCallTerminationOnBehalfOf",
    "destCallTerminationOnBehalfOf",
}

BATCH_SIZE = 1000


@dataclass
class ParseStats:
    file_type: str  # cdr | cmr | mixed | unknown
    total_rows: int = 0
    inserted_rows: int = 0
    duplicate_rows: int = 0


def parse_int(val: str | None) -> int | None:
    if val is None:
        return None
    s = val.strip().strip('"')
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


def parse_unix_ts(val: str | None) -> datetime | None:
    ts = parse_int(val)
    if ts is None or ts <= 0:
        return None
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None


def parse_cucm_ip(val: str | None) -> str | None:
    """Convert CUCM 32-bit integer IP (little-endian) or string IP to dotted IPv4/IPv6."""
    if val is None:
        return None
    s = val.strip().strip('"')
    if not s or s == "0":
        return None
    if "." in s or ":" in s:
        return s[:45]
    try:
        ip_int = int(s)
        if ip_int == 0:
            return None
        return socket.inet_ntoa(struct.pack("<I", ip_int & 0xFFFFFFFF))
    except (ValueError, struct.error, OSError):
        return None


def clean_str(val: str | None, max_len: int | None = None) -> str | None:
    if val is None:
        return None
    s = val.strip()
    if not s:
        return None
    return s[:max_len] if max_len else s


def is_cucm_type_row(row: list[str]) -> bool:
    """CUCM CDR/CMR files contain a 2nd row with SQL column types (INTEGER, VARCHAR(50), ...)."""
    if not row:
        return False
    first = row[0].strip().upper()
    if first in {"INTEGER", "BIGINT", "SMALLINT"} or first.startswith("VARCHAR"):
        return True
    type_tokens = sum(1 for cell in row[:10] if cell.strip().upper().startswith(("INTEGER", "VARCHAR", "CHAR")))
    return type_tokens >= 3


def compute_hash(*parts: Any) -> str:
    raw = "|".join("" if p is None else str(p) for p in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _detect_file_type(headers: list[str]) -> str:
    header_set = {h.strip() for h in headers}
    if "dateTimeOrigination" in header_set or "callingPartyNumber" in header_set:
        return "cdr"
    if "numberPacketsSent" in header_set or "varVQMetrics" in header_set or "jitter" in header_set:
        return "cmr"
    return "unknown"


def _row_to_cdr_dict(row_dict: dict[str, str], source_file: str) -> dict[str, Any]:
    cm_id = parse_int(row_dict.get("globalCallID_callManagerId"))
    call_id = parse_int(row_dict.get("globalCallID_callId"))
    orig_leg = parse_int(row_dict.get("origLegCallIdentifier"))
    dest_leg = parse_int(row_dict.get("destLegIdentifier"))
    ts_orig = parse_unix_ts(row_dict.get("dateTimeOrigination"))
    ts_conn = parse_unix_ts(row_dict.get("dateTimeConnect"))
    ts_disc = parse_unix_ts(row_dict.get("dateTimeDisconnect"))
    calling = clean_str(row_dict.get("callingPartyNumber"), 64)
    orig_called = clean_str(row_dict.get("originalCalledPartyNumber"), 64)
    final_called = clean_str(row_dict.get("finalCalledPartyNumber"), 64)
    last_redir = clean_str(row_dict.get("lastRedirectDn"), 64)
    duration = parse_int(row_dict.get("duration")) or 0

    orig_ip = parse_cucm_ip(row_dict.get("origMediaTransportAddress_IP") or row_dict.get("origIpAddr"))
    dest_ip = parse_cucm_ip(row_dict.get("destMediaTransportAddress_IP") or row_dict.get("destIpAddr"))

    answered = ts_conn is not None and duration > 0

    extra: dict[str, Any] = {}
    for k, v in row_dict.items():
        if k and k not in CDR_KNOWN_COLUMNS and v is not None and v.strip() != "":
            extra[k] = v.strip()

    rec_hash = compute_hash(
        cm_id,
        call_id,
        orig_leg,
        dest_leg,
        row_dict.get("dateTimeOrigination"),
        calling,
        final_called,
        duration,
    )

    return {
        "record_hash": rec_hash,
        "cdr_record_type": parse_int(row_dict.get("cdrRecordType")) or 1,
        "global_call_id_cm": cm_id,
        "global_call_id": call_id,
        "orig_leg_call_identifier": orig_leg,
        "dest_leg_identifier": dest_leg,
        "date_time_origination": ts_orig,
        "date_time_connect": ts_conn,
        "date_time_disconnect": ts_disc,
        "calling_party_number": calling,
        "original_called_party_number": orig_called,
        "final_called_party_number": final_called,
        "last_redirect_dn": last_redir,
        "duration": max(0, duration),
        "answered": answered,
        "orig_cause_value": parse_int(row_dict.get("origCause_value")),
        "dest_cause_value": parse_int(row_dict.get("destCause_value")),
        "orig_device_name": clean_str(row_dict.get("origDeviceName"), 128),
        "dest_device_name": clean_str(row_dict.get("destDeviceName"), 128),
        "orig_ip_addr": orig_ip,
        "dest_ip_addr": dest_ip,
        "orig_call_termination_on_behalf_of": parse_int(row_dict.get("origCallTerminationOnBehalfOf")),
        "dest_call_termination_on_behalf_of": parse_int(row_dict.get("destCallTerminationOnBehalfOf")),
        "raw_extra": extra or None,
        "source_file": source_file[:255],
    }


def _row_to_cmr_dict(row_dict: dict[str, str], source_file: str) -> dict[str, Any]:
    cm_id = parse_int(row_dict.get("globalCallID_callManagerId"))
    call_id = parse_int(row_dict.get("globalCallID_callId"))
    call_ident = parse_int(row_dict.get("callIdentifier"))
    device_name = clean_str(row_dict.get("deviceName"), 128)
    ts = parse_unix_ts(row_dict.get("dateTimeStamp"))
    pkts_sent = parse_int(row_dict.get("numberPacketsSent"))
    pkts_recv = parse_int(row_dict.get("numberPacketsReceived"))

    rec_hash = compute_hash(
        cm_id,
        call_id,
        call_ident,
        device_name,
        row_dict.get("dateTimeStamp"),
        pkts_sent,
        pkts_recv,
    )

    return {
        "record_hash": rec_hash,
        "global_call_id_cm": cm_id,
        "global_call_id": call_id,
        "call_identifier": call_ident,
        "device_name": device_name,
        "directory_number": clean_str(row_dict.get("directoryNum"), 64),
        "date_time_stamp": ts,
        "number_packets_sent": pkts_sent,
        "number_packets_received": pkts_recv,
        "number_packets_lost": parse_int(row_dict.get("numberPacketsLost")),
        "jitter": parse_int(row_dict.get("jitter")),
        "latency": parse_int(row_dict.get("latency")),
        "var_vq_metrics": clean_str(row_dict.get("varVQMetrics")),
        "source_file": source_file[:255],
    }


async def _flush_batch(db: AsyncSession, model: type[CdrRecord] | type[CmrRecord], batch: list[dict[str, Any]]) -> int:
    if not batch:
        return 0
    # Deduplicate within the same batch to avoid ON CONFLICT cardinality issues if file has exact duplicates
    deduped: dict[str, dict[str, Any]] = {}
    for item in batch:
        deduped[item["record_hash"]] = item

    stmt = (
        insert(model)
        .values(list(deduped.values()))
        .on_conflict_do_nothing(index_elements=["record_hash"])
        .returning(model.id)
    )
    result = await db.execute(stmt)
    return len(result.scalars().all())


async def parse_csv_stream(
    db: AsyncSession,
    text_stream: io.TextIOBase,
    filename: str,
) -> ParseStats:
    """Parse a single CUCM CDR or CMR CSV stream into PostgreSQL."""
    reader = csv.reader(text_stream)
    try:
        headers = next(reader)
    except StopIteration:
        return ParseStats(file_type="unknown")

    headers = [h.strip().lstrip("\ufeff") for h in headers]
    file_type = _detect_file_type(headers)
    if file_type == "unknown":
        raise ValueError(f"Unrecognized CUCM CDR/CMR header in file '{filename}'")

    stats = ParseStats(file_type=file_type)
    batch: list[dict[str, Any]] = []
    model: type[CdrRecord] | type[CmrRecord] = CdrRecord if file_type == "cdr" else CmrRecord

    first_data_checked = False
    for row in reader:
        if not row or all(not c.strip() for c in row):
            continue
        if not first_data_checked:
            first_data_checked = True
            if is_cucm_type_row(row):
                continue

        row_dict = dict(zip(headers, row))
        stats.total_rows += 1
        if file_type == "cdr":
            batch.append(_row_to_cdr_dict(row_dict, filename))
        else:
            batch.append(_row_to_cmr_dict(row_dict, filename))

        if len(batch) >= BATCH_SIZE:
            inserted = await _flush_batch(db, model, batch)
            stats.inserted_rows += inserted
            batch.clear()

    if batch:
        inserted = await _flush_batch(db, model, batch)
        stats.inserted_rows += inserted

    stats.duplicate_rows = max(0, stats.total_rows - stats.inserted_rows)
    return stats


async def parse_file_bytes(db: AsyncSession, content: bytes, filename: str) -> ParseStats:
    """Parse raw bytes of a CDR/CMR file (.csv, plain CUCM file, .gz, or .zip)."""
    lower = filename.lower()

    if lower.endswith(".zip"):
        aggregated = ParseStats(file_type="cdr")
        seen_types: set[str] = set()
        try:
            zf_ctx = zipfile.ZipFile(io.BytesIO(content))
        except zipfile.BadZipFile as exc:
            raise ValueError(f"Invalid ZIP archive '{filename}'") from exc
        with zf_ctx as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue
                member_parts = member.filename.replace("\\", "/").split("/")
                if any(p == "__MACOSX" or p.startswith(".") for p in member_parts):
                    continue
                member_bytes = zf.read(member.filename)
                sub_stats = await parse_file_bytes(db, member_bytes, member.filename)
                seen_types.add(sub_stats.file_type)
                aggregated.total_rows += sub_stats.total_rows
                aggregated.inserted_rows += sub_stats.inserted_rows
                aggregated.duplicate_rows += sub_stats.duplicate_rows
        if len(seen_types) > 1:
            aggregated.file_type = "mixed"
        elif seen_types:
            aggregated.file_type = next(iter(seen_types))
        else:
            aggregated.file_type = "unknown"
        return aggregated

    if lower.endswith(".gz"):
        try:
            decompressed = gzip.decompress(content)
        except (gzip.BadGzipFile, OSError, EOFError) as exc:
            raise ValueError(f"Invalid GZIP archive '{filename}'") from exc
        text_stream = io.TextIOWrapper(io.BytesIO(decompressed), encoding="utf-8", errors="replace")
        return await parse_csv_stream(db, text_stream, filename[:-3])

    text_stream = io.TextIOWrapper(io.BytesIO(content), encoding="utf-8", errors="replace")
    return await parse_csv_stream(db, text_stream, filename)
