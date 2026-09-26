from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ResourceType


class UploaderBriefResponse(BaseModel):
    id: int
    display_name: str
    avatar_url: str | None = None
    role: str

    model_config = ConfigDict(from_attributes=True)


class SubjectBriefResponse(BaseModel):
    id: int
    code: str
    name: str
    semester: int

    model_config = ConfigDict(from_attributes=True)


class UnitBriefResponse(BaseModel):
    id: int
    unit_number: int
    title: str
    subject_id: int

    model_config = ConfigDict(from_attributes=True)


class TopicBriefResponse(BaseModel):
    id: int
    title: str
    unit_id: int

    model_config = ConfigDict(from_attributes=True)


class BreadcrumbHierarchy(BaseModel):
    subject: SubjectBriefResponse
    unit: UnitBriefResponse
    topic: TopicBriefResponse


class ResourceVersionResponse(BaseModel):
    id: int
    resource_id: int
    version_number: int
    file_url: str
    changelog: str | None = None
    file_size_bytes: int | None = None
    page_count: int | None = None
    uploaded_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResourceListItemResponse(BaseModel):
    id: int
    topic_id: int
    type: ResourceType
    title: str
    description: str | None = None
    file_url: str
    file_size_bytes: int | None = None
    page_count: int | None = None
    semester: int
    current_version_id: int | None = None
    upvotes_count: int
    downvotes_count: int
    rating_avg: float
    rating_count: int
    views_count: int
    downloads_count: int
    is_verified: bool
    is_deleted: bool = False
    ranking_score: float | None = None
    created_at: datetime
    updated_at: datetime
    uploader: UploaderBriefResponse
    breadcrumbs: BreadcrumbHierarchy | None = None

    model_config = ConfigDict(from_attributes=True)


class ResourceDetailResponse(ResourceListItemResponse):
    current_version: ResourceVersionResponse | None = None
    versions: list[ResourceVersionResponse] = []


class ResourceListResponse(BaseModel):
    items: list[ResourceListItemResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ResourceCreateForm(BaseModel):
    topic_id: int = Field(..., description="ID of the topic this resource belongs to")
    type: ResourceType = Field(ResourceType.NOTES, description="Type of study resource")
    title: str = Field(..., min_length=3, max_length=255, description="Resource title")
    description: str | None = Field(
        None, max_length=5000, description="Description of the material"
    )
    semester: int = Field(..., ge=1, le=8, description="Target semester curriculum")
    external_url: str | None = Field(None, description="External URL if type is link")
    page_count: int | None = Field(None, ge=1, description="Page count of document")
    changelog: str | None = Field("Initial upload", description="Version changelog note")


class ResourceUpdateForm(BaseModel):
    title: str | None = Field(None, min_length=3, max_length=255)
    description: str | None = Field(None, max_length=5000)
    page_count: int | None = Field(None, ge=1)
    changelog: str = Field(
        ..., min_length=3, max_length=500, description="Summary of changes in this version"
    )
    external_url: str | None = None
