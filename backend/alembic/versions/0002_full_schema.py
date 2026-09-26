"""create full studyshare core schema

Revision ID: 0002_full_schema
Revises: 0001_initial
Create Date: 2026-09-26 00:20:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_full_schema"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Users Table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="student"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # 2. Subjects Table
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("semester", sa.Integer(), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subjects_code", "subjects", ["code"], unique=True)
    op.create_index("ix_subjects_semester", "subjects", ["semester"], unique=False)
    op.create_index("ix_subjects_sem_code", "subjects", ["semester", "code"], unique=False)

    # 3. Units Table
    op.create_table(
        "units",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("subject_id", sa.Integer(), nullable=False),
        sa.Column("unit_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("ordering", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["subject_id"], ["subjects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("subject_id", "unit_number", name="uq_unit_subject_number"),
    )
    op.create_index("ix_units_subject_id", "units", ["subject_id"], unique=False)
    op.create_index("ix_units_subject_order", "units", ["subject_id", "ordering"], unique=False)

    # 4. Topics Table
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("unit_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("ordering", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["unit_id"], ["units.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_topics_unit_id", "topics", ["unit_id"], unique=False)
    op.create_index("ix_topics_unit_order", "topics", ["unit_id", "ordering"], unique=False)

    # 5. Resources Table
    op.create_table(
        "resources",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("topic_id", sa.Integer(), nullable=False),
        sa.Column("uploader_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=30), nullable=False, server_default="notes"),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(length=1000), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("semester", sa.Integer(), nullable=False),
        sa.Column("current_version_id", sa.Integer(), nullable=True),
        sa.Column("upvotes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("downvotes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rating_avg", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("rating_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("views_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("downloads_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploader_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resources_topic_id", "resources", ["topic_id"], unique=False)
    op.create_index("ix_resources_uploader_id", "resources", ["uploader_id"], unique=False)
    op.create_index("ix_resources_type", "resources", ["type"], unique=False)
    op.create_index("ix_resources_title", "resources", ["title"], unique=False)
    op.create_index("ix_resources_semester", "resources", ["semester"], unique=False)
    op.create_index("ix_resources_upvotes_count", "resources", ["upvotes_count"], unique=False)
    op.create_index("ix_resources_rating_avg", "resources", ["rating_avg"], unique=False)
    op.create_index("ix_resources_is_verified", "resources", ["is_verified"], unique=False)
    op.create_index("ix_resources_created_at", "resources", ["created_at"], unique=False)
    op.create_index(
        "ix_resources_topic_recency", "resources", ["topic_id", "created_at"], unique=False
    )
    op.create_index(
        "ix_resources_topic_votes", "resources", ["topic_id", "upvotes_count"], unique=False
    )
    op.create_index(
        "ix_resources_topic_rating", "resources", ["topic_id", "rating_avg"], unique=False
    )

    # 6. Resource Versions Table
    op.create_table(
        "resource_versions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("file_url", sa.String(length=1000), nullable=False),
        sa.Column("changelog", sa.Text(), nullable=True),
        sa.Column("uploaded_by", sa.Integer(), nullable=False),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("resource_id", "version_number", name="uq_resource_version_number"),
    )
    op.create_index(
        "ix_resource_versions_resource_id", "resource_versions", ["resource_id"], unique=False
    )
    op.create_index(
        "ix_resource_versions_uploaded_by", "resource_versions", ["uploaded_by"], unique=False
    )

    # Add foreign key from resources to resource_versions (current_version_id)
    op.create_foreign_key(
        "fk_resources_current_version_id",
        "resources",
        "resource_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 7. Votes Table
    op.create_table(
        "votes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("value", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "resource_id", name="uq_user_resource_vote"),
    )
    op.create_index("ix_votes_resource_id", "votes", ["resource_id"], unique=False)
    op.create_index("ix_votes_user_id", "votes", ["user_id"], unique=False)

    # 8. Ratings Table
    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stars", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("stars >= 1 AND stars <= 5", name="ck_rating_stars_range"),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "resource_id", name="uq_user_resource_rating"),
    )
    op.create_index("ix_ratings_resource_id", "ratings", ["resource_id"], unique=False)
    op.create_index("ix_ratings_user_id", "ratings", ["user_id"], unique=False)

    # 9. Reports Table
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("reporter_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_resource_id", "reports", ["resource_id"], unique=False)
    op.create_index("ix_reports_reporter_id", "reports", ["reporter_id"], unique=False)
    op.create_index("ix_reports_status", "reports", ["status"], unique=False)
    op.create_index("ix_reports_created_at", "reports", ["created_at"], unique=False)
    op.create_index("ix_reports_status_created", "reports", ["status", "created_at"], unique=False)

    # 10. Bookmarks Table
    op.create_table(
        "bookmarks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "resource_id", name="uq_user_resource_bookmark"),
    )
    op.create_index("ix_bookmarks_user_id", "bookmarks", ["user_id"], unique=False)
    op.create_index("ix_bookmarks_resource_id", "bookmarks", ["resource_id"], unique=False)
    op.create_index(
        "ix_bookmarks_user_created", "bookmarks", ["user_id", "created_at"], unique=False
    )

    # 11. Moderation Actions Table
    op.create_table(
        "moderation_actions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("admin_id", sa.Integer(), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["admin_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["resource_id"], ["resources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_moderation_actions_admin_id", "moderation_actions", ["admin_id"], unique=False
    )
    op.create_index(
        "ix_moderation_actions_resource_id", "moderation_actions", ["resource_id"], unique=False
    )
    op.create_index(
        "ix_moderation_res_created",
        "moderation_actions",
        ["resource_id", "created_at"],
        unique=False,
    )

    # 12. Full-Text Search GIN Index on Resources
    # Executes PostgreSQL native tsvector index
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            CREATE INDEX ix_resources_fts ON resources USING gin (
                to_tsvector('english', title || ' ' || coalesce(description, ''))
            );
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_resources_fts;")

    op.drop_table("moderation_actions")
    op.drop_table("bookmarks")
    op.drop_table("reports")
    op.drop_table("ratings")
    op.drop_table("votes")

    op.drop_constraint("fk_resources_current_version_id", "resources", type_="foreignkey")
    op.drop_table("resource_versions")
    op.drop_table("resources")
    op.drop_table("topics")
    op.drop_table("units")
    op.drop_table("subjects")
    op.drop_table("users")
