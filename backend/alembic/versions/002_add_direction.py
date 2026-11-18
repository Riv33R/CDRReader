"""Add call direction column (inbound / outbound / internal) to cdr_records.

Revision ID: 002_add_direction
Revises: 001_initial
Create Date: 2026-11-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_add_direction"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cdr_records",
        sa.Column("direction", sa.String(length=16), nullable=False, server_default="internal"),
    )
    # Backfill existing rows using CUCM device & number heuristics
    op.execute(
        sa.text(
            """
            WITH classified AS (
                SELECT
                    id,
                    (
                        CASE
                            WHEN UPPER(COALESCE(orig_device_name, '')) ~ '^(SEP|CSF|TCT|BOT|TAB|ATA|CIPC|UPC|HUNTPILOT|UNITY|UCCX|CTI)' THEN false
                            WHEN UPPER(COALESCE(orig_device_name, '')) ~ '(TRUNK|SIP|CUBE|MGCP|H323|PSTN|SBC|FXO|S0/|S1/|GW)' THEN true
                            WHEN COALESCE(calling_party_number, '') LIKE '+%' OR LENGTH(REGEXP_REPLACE(COALESCE(calling_party_number, ''), '[^0-9]', '', 'g')) > 6 THEN true
                            ELSE false
                        END
                    ) AS orig_ext,
                    (
                        CASE
                            WHEN UPPER(COALESCE(dest_device_name, '')) ~ '^(SEP|CSF|TCT|BOT|TAB|ATA|CIPC|UPC|HUNTPILOT|UNITY|UCCX|CTI)' THEN false
                            WHEN UPPER(COALESCE(dest_device_name, '')) ~ '(TRUNK|SIP|CUBE|MGCP|H323|PSTN|SBC|FXO|S0/|S1/|GW)' THEN true
                            WHEN COALESCE(final_called_party_number, original_called_party_number, '') LIKE '+%'
                                 OR LENGTH(REGEXP_REPLACE(COALESCE(final_called_party_number, original_called_party_number, ''), '[^0-9]', '', 'g')) > 6 THEN true
                            ELSE false
                        END
                    ) AS dest_ext
                FROM cdr_records
            )
            UPDATE cdr_records AS r
            SET direction = CASE
                WHEN c.orig_ext AND NOT c.dest_ext THEN 'inbound'
                WHEN c.dest_ext THEN 'outbound'
                ELSE 'internal'
            END
            FROM classified AS c
            WHERE r.id = c.id
            """
        )
    )
    op.create_index("ix_cdr_direction", "cdr_records", ["direction"])


def downgrade() -> None:
    op.drop_index("ix_cdr_direction", table_name="cdr_records")
    op.drop_column("cdr_records", "direction")
