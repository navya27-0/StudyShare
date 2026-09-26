import enum


class ResourceType(enum.StrEnum):
    NOTES = "notes"
    PDF = "pdf"
    PAPER = "paper"
    LAB_RECORD = "lab_record"
    QUESTION_BANK = "question_bank"
    LINK = "link"


class VoteType(enum.StrEnum):
    UP = "up"
    DOWN = "down"


class ReportStatus(enum.StrEnum):
    OPEN = "open"
    REVIEWED = "reviewed"
    DISMISSED = "dismissed"


class UserRole(enum.StrEnum):
    STUDENT = "student"
    MODERATOR = "moderator"
    ADMIN = "admin"
