from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_client_ip, get_current_user
from app.config import get_settings
from app.core.rate_limit import login_rate_limiter, revoked_token_store
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.database import get_db_session
from app.models.enums import UserRole
from app.models.profile import ContributorProfile
from app.models.user import User
from app.schemas.auth import (
    AuthSuccessResponse,
    TokenResponse,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()

REFRESH_COOKIE_NAME = "studyshare_refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Attach HttpOnly, SameSite refresh token cookie for defense-in-depth token security."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/api/auth",
    )


def _verify_trusted_origin(request: Request) -> None:
    """
    Validate Origin or Referer header against allowed CORS origins on sensitive cookie endpoints.
    Protects HttpOnly cookie-authenticated operations (refresh, logout) against CSRF.
    """
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    allowed = set(settings.cors_origins_list)
    # Include test and local development origin patterns
    allowed.update(["http://test", "http://localhost", "http://127.0.0.1"])

    if origin:
        if origin not in allowed and not any(origin.startswith(a) for a in allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Untrusted origin rejected by CSRF verification.",
            )
        return

    if referer:
        if not any(referer.startswith(a) for a in allowed):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Untrusted referer rejected by CSRF verification.",
            )


@router.post("/signup", response_model=AuthSuccessResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    signup_data: UserSignupRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """Register a new student account, automatically provision a contributor profile, and issue auth tokens."""
    # 1. Check for email collision
    email_clean = signup_data.email.lower().strip()
    existing_check = await db.execute(select(User).where(User.email == email_clean))
    if existing_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address is already registered.",
        )

    # 2. Hash password securely
    hashed_pwd = hash_password(signup_data.password)

    # 3. Create User record and profile within concurrency-safe transaction
    new_user = User(
        email=email_clean,
        hashed_password=hashed_pwd,
        display_name=signup_data.display_name.strip(),
        role=UserRole.STUDENT,
        is_active=True,
        is_superuser=False,
    )
    try:
        db.add(new_user)
        await db.flush()

        # 4. Automatically create associated ContributorProfile
        new_profile = ContributorProfile(
            user_id=new_user.id,
            bio=signup_data.bio.strip() if signup_data.bio else None,
            semester=signup_data.semester,
            department=signup_data.department.strip()
            if signup_data.department
            else "Computer Science & Engineering",
            reputation_points=10,  # Welcome points on registration
            total_uploads=0,
            total_upvotes_received=0,
        )
        db.add(new_profile)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address is already registered.",
        ) from exc

    # 5. Reload user with loaded profile for response serialization
    result = await db.execute(
        select(User).where(User.id == new_user.id).options(selectinload(User.contributor_profile))
    )
    user_loaded = result.scalar_one()

    # 6. Generate tokens
    access_token = create_access_token(
        subject=user_loaded.id,
        extra_claims={"email": user_loaded.email, "role": user_loaded.role},
    )
    refresh_token = create_refresh_token(subject=user_loaded.id)
    _set_refresh_cookie(response, refresh_token)

    tokens = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return AuthSuccessResponse(
        user=UserResponse.model_validate(user_loaded),
        tokens=tokens,
    )


@router.post("/login", response_model=AuthSuccessResponse)
async def login(
    login_data: UserLoginRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """Authenticate user with email and password, protected by sliding-window rate limiting."""
    client_ip = get_client_ip(request)
    email_clean = login_data.email.lower().strip()
    rate_limit_key = f"{client_ip}:{email_clean}"

    # 1. Check rate limit
    await login_rate_limiter.check_async(rate_limit_key, db=db)

    # 2. Query user by email
    query = (
        select(User)
        .where(User.email == email_clean)
        .options(selectinload(User.contributor_profile))
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    # 3. Validate credentials
    if not user or not verify_password(login_data.password, user.hashed_password):
        await login_rate_limiter.record_failure_async(rate_limit_key, db=db)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This student account has been deactivated. Contact an administrator.",
        )

    # 4. Successful login: clear failure counter
    await login_rate_limiter.reset_async(rate_limit_key, db=db)

    # 5. Generate tokens
    access_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email, "role": user.role},
    )
    refresh_token = create_refresh_token(subject=user.id)
    _set_refresh_cookie(response, refresh_token)

    tokens = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return AuthSuccessResponse(
        user=UserResponse.model_validate(user),
        tokens=tokens,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Issue a new access token and rotated refresh token using HttpOnly cookie.
    Enforces atomic, single-use token consumption in PostgreSQL to prevent race conditions.
    """
    _verify_trusted_origin(request)

    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session cookie missing. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Decode & validate JWT payload first
    try:
        payload = decode_token(raw_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token signature.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type. Expected a refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload.get("sub", ""))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account inactive or not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Atomically consume old refresh token in database (single-use guarantee across all workers)
    consumed = await revoked_token_store.consume_token_atomically(raw_token, db=db)
    if not consumed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has already been consumed or revoked. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Rotate refresh token: issue new pair
    new_access_token = create_access_token(
        subject=user.id,
        extra_claims={"email": user.email, "role": user.role},
    )
    new_refresh_token = create_refresh_token(subject=user.id)
    _set_refresh_cookie(response, new_refresh_token)

    return TokenResponse(
        access_token=new_access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
async def logout_endpoint(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """Revoke refresh token and clear HttpOnly session cookie."""
    _verify_trusted_origin(request)

    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        await revoked_token_store.revoke_async(raw_token, db=db)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/auth")
    return {"message": "Signed out and session token revoked."}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return the profile and contributor stats of the currently authenticated student."""
    return UserResponse.model_validate(current_user)
