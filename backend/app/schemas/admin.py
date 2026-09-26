from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ReportStatus
from app.schemas.resource import ResourceListItemResponse, UploaderBriefResponse


class ReportActionRequest(BaseModel):
    action: str = Field(..., description="Action to take: 'dismiss' or 'resolve'/'action'")
    note: str | None = Field(None, max_length=1000, description="Administrative audit note")


class ResourceModerationRequest(BaseModel):
    note: str | None = Field(
        None, max_length=1000, description="Reason for removing or restoring resource"
    )


class UserBanRequest(BaseModel):
    note: str | None = Field(
        None, max_length=1000, description="Reason for banning or unbanning user"
    )


class AdminReportResponse(BaseModel):
    id: int
    resource_id: int
    reporter_id: int
    reason: str
    status: ReportStatus
    created_at: datetime
    resolved_at: datetime | None = None
    resolved_by: int | None = None
    reporter: UploaderBriefResponse | None = None
    resource: ResourceListItemResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminReportListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AdminReportResponse]


class ModerationActionResponse(BaseModel):
    id: int
    admin_id: int | None = None
    admin_name: str | None = None
    resource_id: int | None = None
    target_user_id: int | None = None
    action: str
    note: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ModerationActionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ModerationActionResponse]


class AdminActionSuccessResponse(BaseModel):
    success: bool = True
    message: str
    details: dict | None = None
