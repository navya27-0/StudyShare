"""Add soft delete and moderation extensions

Revision ID: 0004_soft_delete_moderation
Revises: 0003_add_contributor_profile
Create Date: 2026-09-27 01:05:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic (max 32 chars).
revision: str = "0004_soft_delete_moderation"
down_revision: str | None = "0003_add_contributor_profile"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add is_deleted to resources for soft-delete and restoration
    op.add_column(
        "resources",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.create_index("ix_resources_is_deleted", "resources", ["is_deleted"], unique=False)

    # 2. Make resource_id nullable on moderation_actions to support user-level actions (ban/unban)
    op.alter_column(
        "moderation_actions",
        "resource_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # 3. Add target_user_id to moderation_actions
    op.add_column(
        "moderation_actions",
        sa.Column("target_user_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_moderation_actions_target_user_id",
        "moderation_actions",
        "users",
        ["target_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_moderation_actions_target_user_id",
        "moderation_actions",
        ["target_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_moderation_actions_target_user_id", table_name="moderation_actions")
    op.drop_constraint(
        "fk_moderation_actions_target_user_id", table_name="moderation_actions", type_="foreignkey"
    )
    op.drop_column("moderation_actions", "target_user_id")

    op.alter_column(
        "moderation_actions",
        "resource_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.drop_index("ix_resources_is_deleted", table_name="resources")
    op.drop_column("resources", "is_deleted")
