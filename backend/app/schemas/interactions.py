from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ReportStatus, VoteType
from app.schemas.resource import ResourceListItemResponse


# --- Vote Schemas ---
class VoteRequest(BaseModel):
    value: VoteType = Field(..., description="Vote direction: 'up' or 'down'")


class VoteResponse(BaseModel):
    resource_id: int
    user_vote: VoteType | None = Field(
        None, description="Current user's vote direction, or null if toggled off"
    )
    upvotes_count: int
    downvotes_count: int
    action: str = Field(..., description="Action taken: 'created', 'switched', or 'removed'")
    message: str


# --- Rating Schemas ---
class RatingRequest(BaseModel):
    stars: int = Field(..., ge=1, le=5, description="Star rating between 1 and 5 inclusive")


class RatingResponse(BaseModel):
    resource_id: int
    user_stars: int
    rating_avg: float
    rating_count: int
    message: str


# --- Bookmark Schemas ---
class BookmarkResponse(BaseModel):
    resource_id: int
    bookmarked: bool
    message: str


class UserBookmarkItemResponse(BaseModel):
    id: int
    user_id: int
    resource_id: int
    created_at: datetime
    resource: ResourceListItemResponse

    model_config = ConfigDict(from_attributes=True)


class UserBookmarksListResponse(BaseModel):
    user_id: int
    total: int
    page: int
    page_size: int
    items: list[UserBookmarkItemResponse]


# --- Report Schemas ---
class ReportRequest(BaseModel):
    reason: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Detailed reason for reporting the resource",
    )


class ReportResponse(BaseModel):
    id: int
    resource_id: int
    reporter_id: int
    reason: str
    status: ReportStatus
    created_at: datetime
    message: str

    model_config = ConfigDict(from_attributes=True)
