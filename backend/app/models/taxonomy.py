from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.resource import Resource


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    semester: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    units: Mapped[list["Unit"]] = relationship(
        "Unit",
        back_populates="subject",
        order_by="Unit.ordering",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("ix_subjects_sem_code", "semester", "code"),)

    def __repr__(self) -> str:
        return f"<Subject code={self.code} name={self.name} sem={self.semester}>"


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("subjects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    unit_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    ordering: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    subject: Mapped["Subject"] = relationship("Subject", back_populates="units")
    topics: Mapped[list["Topic"]] = relationship(
        "Topic",
        back_populates="unit",
        order_by="Topic.ordering",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("subject_id", "unit_number", name="uq_unit_subject_number"),
        Index("ix_units_subject_order", "subject_id", "ordering"),
    )

    def __repr__(self) -> str:
        return f"<Unit id={self.id} subject_id={self.subject_id} unit_num={self.unit_number} title={self.title}>"


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    unit_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    ordering: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    unit: Mapped["Unit"] = relationship("Unit", back_populates="topics")
    resources: Mapped[list["Resource"]] = relationship(
        "Resource",
        back_populates="topic",
        order_by="Resource.created_at.desc()",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("ix_topics_unit_order", "unit_id", "ordering"),)

    def __repr__(self) -> str:
        return f"<Topic id={self.id} unit_id={self.unit_id} title={self.title}>"
