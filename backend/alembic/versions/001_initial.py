"""Initial CDR, CMR, and ImportJob tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-11-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cdr_records",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("record_hash", sa.String(length=64), nullable=False),
        sa.Column("cdr_record_type", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("global_call_id_cm", sa.Integer(), nullable=True),
        sa.Column("global_call_id", sa.BigInteger(), nullable=True),
        sa.Column("orig_leg_call_identifier", sa.BigInteger(), nullable=True),
        sa.Column("dest_leg_identifier", sa.BigInteger(), nullable=True),
        sa.Column("date_time_origination", sa.DateTime(timezone=True), nullable=True),
        sa.Column("date_time_connect", sa.DateTime(timezone=True), nullable=True),
        sa.Column("date_time_disconnect", sa.DateTime(timezone=True), nullable=True),
        sa.Column("calling_party_number", sa.String(length=64), nullable=True),
        sa.Column("original_called_party_number", sa.String(length=64), nullable=True),
        sa.Column("final_called_party_number", sa.String(length=64), nullable=True),
        sa.Column("last_redirect_dn", sa.String(length=64), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("answered", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("orig_cause_value", sa.Integer(), nullable=True),
        sa.Column("dest_cause_value", sa.Integer(), nullable=True),
        sa.Column("orig_device_name", sa.String(length=128), nullable=True),
        sa.Column("dest_device_name", sa.String(length=128), nullable=True),
        sa.Column("orig_ip_addr", sa.String(length=45), nullable=True),
        sa.Column("dest_ip_addr", sa.String(length=45), nullable=True),
        sa.Column("orig_call_termination_on_behalf_of", sa.Integer(), nullable=True),
        sa.Column("dest_call_termination_on_behalf_of", sa.Integer(), nullable=True),
        sa.Column("raw_extra", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("source_file", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("record_hash"),
    )
    op.create_index("ix_cdr_date_origination", "cdr_records", ["date_time_origination"])
    op.create_index("ix_cdr_calling_party", "cdr_records", ["calling_party_number"])
    op.create_index("ix_cdr_final_called", "cdr_records", ["final_called_party_number"])
    op.create_index("ix_cdr_orig_device", "cdr_records", ["orig_device_name"])
    op.create_index("ix_cdr_dest_device", "cdr_records", ["dest_device_name"])
    op.create_index("ix_cdr_global_call", "cdr_records", ["global_call_id_cm", "global_call_id"])

    op.create_table(
        "cmr_records",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("record_hash", sa.String(length=64), nullable=False),
        sa.Column("global_call_id_cm", sa.Integer(), nullable=True),
        sa.Column("global_call_id", sa.BigInteger(), nullable=True),
        sa.Column("call_identifier", sa.BigInteger(), nullable=True),
        sa.Column("device_name", sa.String(length=128), nullable=True),
        sa.Column("directory_number", sa.String(length=64), nullable=True),
        sa.Column("date_time_stamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("number_packets_sent", sa.BigInteger(), nullable=True),
        sa.Column("number_packets_received", sa.BigInteger(), nullable=True),
        sa.Column("number_packets_lost", sa.BigInteger(), nullable=True),
        sa.Column("jitter", sa.Integer(), nullable=True),
        sa.Column("latency", sa.Integer(), nullable=True),
        sa.Column("var_vq_metrics", sa.Text(), nullable=True),
        sa.Column("source_file", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("record_hash"),
    )
    op.create_index("ix_cmr_global_call", "cmr_records", ["global_call_id_cm", "global_call_id"])
    op.create_index("ix_cmr_call_identifier", "cmr_records", ["call_identifier"])

    op.create_table(
        "import_jobs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("file_type", sa.String(length=32), nullable=False, server_default="cdr"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="processing"),
        sa.Column("total_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("inserted_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("import_jobs")
    op.drop_index("ix_cmr_call_identifier", table_name="cmr_records")
    op.drop_index("ix_cmr_global_call", table_name="cmr_records")
    op.drop_table("cmr_records")
    op.drop_index("ix_cdr_global_call", table_name="cdr_records")
    op.drop_index("ix_cdr_dest_device", table_name="cdr_records")
    op.drop_index("ix_cdr_orig_device", table_name="cdr_records")
    op.drop_index("ix_cdr_final_called", table_name="cdr_records")
    op.drop_index("ix_cdr_calling_party", table_name="cdr_records")
    op.drop_index("ix_cdr_date_origination", table_name="cdr_records")
    op.drop_table("cdr_records")
