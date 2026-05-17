"""Split person full names into normalized name parts.

Revision ID: 20260517_0006
Revises: 20260517_0005
Create Date: 2026-05-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260517_0006"
down_revision: str | None = "20260517_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


PERSON_TABLES = ("users", "guardians", "students")


def _split_table_names(table_name: str) -> None:
    op.add_column(table_name, sa.Column("first_name", sa.String(length=80), nullable=True))
    op.add_column(table_name, sa.Column("middle_name", sa.String(length=80), nullable=True))
    op.add_column(table_name, sa.Column("last_name", sa.String(length=80), nullable=True))
    op.add_column(table_name, sa.Column("second_surname", sa.String(length=80), nullable=True))
    op.execute(
        sa.text(
            f"""
            WITH parsed AS (
                SELECT
                    id,
                    regexp_split_to_array(NULLIF(BTRIM(full_name), ''), '\\s+') AS parts
                FROM {table_name}
            ),
            normalized AS (
                SELECT id, parts, array_length(parts, 1) AS part_count
                FROM parsed
            )
            UPDATE {table_name} AS target
            SET
                first_name = COALESCE(parts[1], 'Pendiente'),
                middle_name = CASE
                    WHEN part_count >= 4 THEN (
                        SELECT string_agg(value, ' ' ORDER BY ordinal_position)
                        FROM unnest(parts) WITH ORDINALITY AS token(value, ordinal_position)
                        WHERE ordinal_position > 1
                          AND ordinal_position < part_count - 1
                    )
                    ELSE NULL
                END,
                last_name = CASE
                    WHEN part_count = 2 THEN parts[2]
                    WHEN part_count >= 3 THEN parts[part_count - 1]
                    ELSE 'Pendiente'
                END,
                second_surname = CASE
                    WHEN part_count >= 3 THEN parts[part_count]
                    ELSE NULL
                END
            FROM normalized
            WHERE target.id = normalized.id
            """
        )
    )
    op.alter_column(table_name, "first_name", nullable=False)
    op.alter_column(table_name, "last_name", nullable=False)
    op.drop_column(table_name, "full_name")


def _restore_table_full_name(table_name: str) -> None:
    op.add_column(table_name, sa.Column("full_name", sa.String(length=150), nullable=True))
    op.execute(
        sa.text(
            f"""
            UPDATE {table_name}
            SET full_name = BTRIM(
                CONCAT_WS(
                    ' ',
                    first_name,
                    NULLIF(middle_name, ''),
                    last_name,
                    NULLIF(second_surname, '')
                )
            )
            """
        )
    )
    op.alter_column(table_name, "full_name", nullable=False)
    op.drop_column(table_name, "second_surname")
    op.drop_column(table_name, "last_name")
    op.drop_column(table_name, "middle_name")
    op.drop_column(table_name, "first_name")


def upgrade() -> None:
    for table_name in PERSON_TABLES:
        _split_table_names(table_name)


def downgrade() -> None:
    for table_name in reversed(PERSON_TABLES):
        _restore_table_full_name(table_name)
