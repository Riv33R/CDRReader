from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, Boolean, DateTime, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CdrRecord(Base):
    """Cisco CUCM Call Detail Record (CDR)."""

    __tablename__ = "cdr_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    record_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    cdr_record_type: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    global_call_id_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    global_call_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    orig_leg_call_identifier: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    dest_leg_identifier: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    date_time_origination: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_time_connect: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_time_disconnect: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    calling_party_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    original_called_party_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    final_called_party_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_redirect_dn: Mapped[str | None] = mapped_column(String(64), nullable=True)

    duration: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    answered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    orig_cause_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dest_cause_value: Mapped[int | None] = mapped_column(Integer, nullable=True)

    orig_device_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    dest_device_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    orig_ip_addr: Mapped[str | None] = mapped_column(String(45), nullable=True)
    dest_ip_addr: Mapped[str | None] = mapped_column(String(45), nullable=True)

    orig_call_termination_on_behalf_of: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dest_call_termination_on_behalf_of: Mapped[int | None] = mapped_column(Integer, nullable=True)

    raw_extra: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    source_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_cdr_date_origination", "date_time_origination"),
        Index("ix_cdr_calling_party", "calling_party_number"),
        Index("ix_cdr_final_called", "final_called_party_number"),
        Index("ix_cdr_orig_device", "orig_device_name"),
        Index("ix_cdr_dest_device", "dest_device_name"),
        Index("ix_cdr_global_call", "global_call_id_cm", "global_call_id"),
    )


class CmrRecord(Base):
    """Cisco CUCM Call Management Record (CMR) - voice quality metrics."""

    __tablename__ = "cmr_records"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    record_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    global_call_id_cm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    global_call_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    call_identifier: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    device_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    directory_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    date_time_stamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    number_packets_sent: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    number_packets_received: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    number_packets_lost: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    jitter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    latency: Mapped[int | None] = mapped_column(Integer, nullable=True)
    var_vq_metrics: Mapped[str | None] = mapped_column(Text, nullable=True)

    source_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_cmr_global_call", "global_call_id_cm", "global_call_id"),
        Index("ix_cmr_call_identifier", "call_identifier"),
    )


class ImportJob(Base):
    """History of manual uploads and automatic watch-dir / SFTP imports."""

    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False)  # upload | watch_dir | sftp
    file_type: Mapped[str] = mapped_column(String(32), default="cdr", nullable=False)  # cdr | cmr | mixed | unknown
    status: Mapped[str] = mapped_column(String(32), default="processing", nullable=False)  # processing | completed | failed

    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    inserted_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
