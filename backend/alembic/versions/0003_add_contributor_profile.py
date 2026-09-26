"""add contributor_profiles table

Revision ID: 0003_add_contributor_profile
Revises: 0002_full_schema
Create Date: 2026-09-26 22:25:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_add_contributor_profile"
down_revision: str | None = "0002_full_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contributor_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("semester", sa.Integer(), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("reputation_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_uploads", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_upvotes_received", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_contributor_profile_user_id"),
    )
    op.create_index(
        "ix_contributor_profiles_user_id", "contributor_profiles", ["user_id"], unique=True
    )
    op.create_index(
        "ix_contributor_profiles_reputation",
        "contributor_profiles",
        ["reputation_points"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_contributor_profiles_reputation", table_name="contributor_profiles")
    op.drop_index("ix_contributor_profiles_user_id", table_name="contributor_profiles")
    op.drop_table("contributor_profiles")
