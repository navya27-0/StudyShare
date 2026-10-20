"""Add revoked_tokens and login_attempts tables for distributed multi-worker security

Revision ID: 0005_revoked_tokens_and_login_attempts
Revises: 0004_soft_delete_moderation
Create Date: 2026-10-20 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic (max 32 chars).
revision: str = "0005_tokens_and_attempts"
down_revision: str | None = "0004_soft_delete_moderation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create revoked_tokens table
    op.create_table(
        "revoked_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_revoked_tokens_id", "revoked_tokens", ["id"], unique=False)
    op.create_index("ix_revoked_tokens_token_hash", "revoked_tokens", ["token_hash"], unique=True)
    op.create_index("ix_revoked_tokens_expires_at", "revoked_tokens", ["expires_at"], unique=False)

    # 2. Create login_attempts table
    op.create_table(
        "login_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("attempted_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_login_attempts_id", "login_attempts", ["id"], unique=False)
    op.create_index("ix_login_attempts_key", "login_attempts", ["key"], unique=False)
    op.create_index(
        "ix_login_attempts_attempted_at", "login_attempts", ["attempted_at"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_login_attempts_attempted_at", table_name="login_attempts")
    op.drop_index("ix_login_attempts_key", table_name="login_attempts")
    op.drop_index("ix_login_attempts_id", table_name="login_attempts")
    op.drop_table("login_attempts")

    op.drop_index("ix_revoked_tokens_expires_at", table_name="revoked_tokens")
    op.drop_index("ix_revoked_tokens_token_hash", table_name="revoked_tokens")
    op.drop_index("ix_revoked_tokens_id", table_name="revoked_tokens")
    op.drop_table("revoked_tokens")
