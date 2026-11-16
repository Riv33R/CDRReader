import csv
import io
from collections.abc import Sequence

from openpyxl import Workbook
from openpyxl.styles import Font

from app.core.cause_codes import get_cause_info
from app.models.cdr import CdrRecord

EXPORT_HEADERS = [
    "ID",
    "Global Call ID",
    "Дата/время начала (UTC)",
    "Дата/время ответа (UTC)",
    "Дата/время завершения (UTC)",
    "Вызывающий номер",
    "Исходный вызываемый",
    "Конечный вызываемый",
    "Последний переадресованный",
    "Статус",
    "Длительность (сек)",
    "Код отбоя (Orig)",
    "Код отбоя (Dest)",
    "Причина завершения",
    "Устройство исх.",
    "Устройство вх.",
    "IP исх.",
    "IP вх.",
]


def _fmt_dt(dt) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S") if dt else ""


def _record_to_row(rec: CdrRecord) -> list[str | int]:
    cause_code = rec.dest_cause_value if rec.dest_cause_value is not None else rec.orig_cause_value
    cause_info = get_cause_info(cause_code)
    return [
        rec.id,
        rec.global_call_id or "",
        _fmt_dt(rec.date_time_origination),
        _fmt_dt(rec.date_time_connect),
        _fmt_dt(rec.date_time_disconnect),
        rec.calling_party_number or "",
        rec.original_called_party_number or "",
        rec.final_called_party_number or "",
        rec.last_redirect_dn or "",
        "Отвечен" if rec.answered else "Пропущен",
        rec.duration,
        rec.orig_cause_value if rec.orig_cause_value is not None else "",
        rec.dest_cause_value if rec.dest_cause_value is not None else "",
        f"{cause_info.name} ({cause_info.description})",
        rec.orig_device_name or "",
        rec.dest_device_name or "",
        rec.orig_ip_addr or "",
        rec.dest_ip_addr or "",
    ]


def build_csv_bytes(records: Sequence[CdrRecord]) -> bytes:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(EXPORT_HEADERS)
    for rec in records:
        writer.writerow(_record_to_row(rec))
    # UTF-8 with BOM for seamless opening in Microsoft Excel
    return ("\ufeff" + buf.getvalue()).encode("utf-8")


def build_xlsx_bytes(records: Sequence[CdrRecord]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = "CDR Export"

    ws.append(EXPORT_HEADERS)
    bold_font = Font(bold=True)
    for cell in ws[1]:
        cell.font = bold_font

    for rec in records:
        ws.append(_record_to_row(rec))

    for col in ws.columns:
        max_len = max((len(str(c.value or "")) for c in col[:100]), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 42)

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
