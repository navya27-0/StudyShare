from datetime import UTC, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ResourceType

if TYPE_CHECKING:
    from app.models.interactions import Bookmark, ModerationAction, Rating, Report, Vote
    from app.models.taxonomy import Topic
    from app.models.user import User


class Resource(Base):
    __tablename__ = "resources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploader_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    type: Mapped[ResourceType] = mapped_column(
        String(30), default=ResourceType.NOTES, nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    semester: Mapped[int] = mapped_column(Integer, index=True, nullable=False)

    # Circular FK to current active version (resolved via use_alter=True)
    current_version_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey(
            "resource_versions.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_resources_current_version_id",
        ),
        nullable=True,
    )

    # Cached counts & computed metrics for fast queries
    upvotes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False, index=True)
    downvotes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0, nullable=False, index=True)
    rating_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    downloads_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    topic: Mapped["Topic"] = relationship("Topic", back_populates="resources")
    uploader: Mapped["User"] = relationship(
        "User", back_populates="resources", foreign_keys=[uploader_id]
    )
    versions: Mapped[list["ResourceVersion"]] = relationship(
        "ResourceVersion",
        back_populates="resource",
        foreign_keys="ResourceVersion.resource_id",
        cascade="all, delete-orphan",
        order_by="ResourceVersion.version_number.desc()",
    )
    current_version: Mapped[Optional["ResourceVersion"]] = relationship(
        "ResourceVersion",
        foreign_keys=[current_version_id],
        post_update=True,
    )
    votes: Mapped[list["Vote"]] = relationship(
        "Vote", back_populates="resource", cascade="all, delete-orphan"
    )
    ratings: Mapped[list["Rating"]] = relationship(
        "Rating", back_populates="resource", cascade="all, delete-orphan"
    )
    reports: Mapped[list["Report"]] = relationship(
        "Report", back_populates="resource", cascade="all, delete-orphan"
    )
    bookmarks: Mapped[list["Bookmark"]] = relationship(
        "Bookmark", back_populates="resource", cascade="all, delete-orphan"
    )
    moderation_actions: Mapped[list["ModerationAction"]] = relationship(
        "ModerationAction", back_populates="resource", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_resources_topic_recency", "topic_id", "created_at"),
        Index("ix_resources_topic_votes", "topic_id", "upvotes_count"),
        Index("ix_resources_topic_rating", "topic_id", "rating_avg"),
    )

    def __repr__(self) -> str:
        return f"<Resource id={self.id} title={self.title} type={self.type} upvotes={self.upvotes_count}>"


class ResourceVersion(Base):
    __tablename__ = "resource_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    file_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    changelog: Mapped[str | None] = mapped_column(Text, nullable=True)
    uploaded_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    resource: Mapped["Resource"] = relationship(
        "Resource", back_populates="versions", foreign_keys=[resource_id]
    )
    uploader: Mapped["User"] = relationship(
        "User", back_populates="uploaded_versions", foreign_keys=[uploaded_by]
    )

    __table_args__ = (
        UniqueConstraint("resource_id", "version_number", name="uq_resource_version_number"),
    )

    def __repr__(self) -> str:
        return f"<ResourceVersion id={self.id} resource_id={self.resource_id} ver={self.version_number}>"
