from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    display_name: str = Field(..., min_length=2, max_length=100)
    semester: int | None = Field(None, ge=1, le=8, description="Academic semester (1 to 8)")
    department: str | None = Field("Computer Science & Engineering", max_length=100)
    bio: str | None = Field(None, max_length=500)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class ContributorProfileResponse(BaseModel):
    id: int
    user_id: int
    bio: str | None
    semester: int | None
    department: str | None
    reputation_points: int
    total_uploads: int
    total_upvotes_received: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    avatar_url: str | None
    role: str
    is_active: bool
    created_at: datetime
    contributor_profile: ContributorProfileResponse | None = None

    model_config = ConfigDict(from_attributes=True)


class AuthSuccessResponse(BaseModel):
    user: UserResponse
    tokens: TokenResponse


class UserActivityItem(BaseModel):
    id: str
    action: str  # 'uploaded', 'rated', 'bookmarked'
    title: str
    resource_id: int
    resource_title: str
    timestamp: datetime
    badge: str | None = None


class UserActivityListResponse(BaseModel):
    user_id: int
    items: list[UserActivityItem]

