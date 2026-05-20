"""Remove manual subscription status.

Revision ID: 20260520_0007
Revises: 20260517_0006
Create Date: 2026-05-20
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260520_0007"
down_revision: str | None = "20260517_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'subscription_status'
                  AND e.enumlabel = 'manual'
            ) THEN
                UPDATE subscription_activations SET status = 'active' WHERE status = 'manual';
                ALTER TYPE subscription_status RENAME TO subscription_status_old;
                CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
                ALTER TABLE subscription_activations ALTER COLUMN status DROP DEFAULT;
                ALTER TABLE subscription_activations
                ALTER COLUMN status TYPE subscription_status
                USING status::text::subscription_status;
                ALTER TABLE subscription_activations ALTER COLUMN status SET DEFAULT 'active';
                DROP TYPE subscription_status_old;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = 'subscription_status'
                  AND e.enumlabel = 'manual'
            ) THEN
                ALTER TYPE subscription_status RENAME TO subscription_status_old;
                CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'manual');
                ALTER TABLE subscription_activations ALTER COLUMN status DROP DEFAULT;
                ALTER TABLE subscription_activations
                ALTER COLUMN status TYPE subscription_status
                USING status::text::subscription_status;
                ALTER TABLE subscription_activations ALTER COLUMN status SET DEFAULT 'active';
                DROP TYPE subscription_status_old;
            END IF;
        END $$;
        """
    )
