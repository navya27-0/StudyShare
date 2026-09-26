from datetime import UTC, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ReportStatus, VoteType

if TYPE_CHECKING:
    from app.models.resource import Resource
    from app.models.user import User


class Vote(Base):
    __tablename__ = "votes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    value: Mapped[VoteType] = mapped_column(String(10), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    resource: Mapped["Resource"] = relationship("Resource", back_populates="votes")
    user: Mapped["User"] = relationship("User", back_populates="votes")

    __table_args__ = (UniqueConstraint("user_id", "resource_id", name="uq_user_resource_vote"),)

    def __repr__(self) -> str:
        return f"<Vote user={self.user_id} res={self.resource_id} val={self.value}>"


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stars: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    resource: Mapped["Resource"] = relationship("Resource", back_populates="ratings")
    user: Mapped["User"] = relationship("User", back_populates="ratings")

    __table_args__ = (
        UniqueConstraint("user_id", "resource_id", name="uq_user_resource_rating"),
        CheckConstraint("stars >= 1 AND stars <= 5", name="ck_rating_stars_range"),
    )

    def __repr__(self) -> str:
        return f"<Rating user={self.user_id} res={self.resource_id} stars={self.stars}>"


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    resource_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reporter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ReportStatus] = mapped_column(
        String(20), default=ReportStatus.OPEN, nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    resource: Mapped["Resource"] = relationship("Resource", back_populates="reports")
    reporter: Mapped["User"] = relationship(
        "User", back_populates="reports_submitted", foreign_keys=[reporter_id]
    )

    __table_args__ = (Index("ix_reports_status_created", "status", "created_at"),)

    def __repr__(self) -> str:
        return f"<Report id={self.id} res={self.resource_id} status={self.status}>"


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resource_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="bookmarks")
    resource: Mapped["Resource"] = relationship("Resource", back_populates="bookmarks")

    __table_args__ = (
        UniqueConstraint("user_id", "resource_id", name="uq_user_resource_bookmark"),
        Index("ix_bookmarks_user_created", "user_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Bookmark user={self.user_id} res={self.resource_id}>"


class ModerationAction(Base):
    __tablename__ = "moderation_actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    resource_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    admin: Mapped[Optional["User"]] = relationship(
        "User", back_populates="moderation_actions", foreign_keys=[admin_id]
    )
    resource: Mapped["Resource"] = relationship("Resource", back_populates="moderation_actions")

    __table_args__ = (Index("ix_moderation_res_created", "resource_id", "created_at"),)

    def __repr__(self) -> str:
        return f"<ModerationAction id={self.id} action={self.action} res={self.resource_id}>"
