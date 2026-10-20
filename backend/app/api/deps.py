import ipaddress
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.core.security import decode_token
from app.database import get_db_session
from app.models.enums import UserRole
from app.models.user import User

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_bearer)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User:
    """Extract, decode, and validate Bearer JWT token to return the current authenticated User."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please refresh your token or log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature or payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for API access. Access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: malformed subject identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    query = select(User).where(User.id == user_id).options(selectinload(User.contributor_profile))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an administrator.",
        )

    return user


async def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_bearer)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> User | None:
    """Optionally resolve the authenticated user if a valid Bearer token is present."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Verify that current user possesses administrator privileges."""
    if current_user.role != UserRole.ADMIN and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this endpoint.",
        )
    return current_user


def _is_trusted_proxy(ip_str: str, trusted_list: list[str]) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        for trusted in trusted_list:
            if "/" in trusted:
                if ip in ipaddress.ip_network(trusted, strict=False):
                    return True
            else:
                if ip == ipaddress.ip_address(trusted):
                    return True
    except ValueError:
        return False
    return False


def get_client_ip(request: Request) -> str:
    """
    Safely extract client IP address.
    Only honours X-Forwarded-For if the direct socket connection originates from a trusted reverse proxy.
    Otherwise, returns the socket peer address to prevent IP spoofing attacks against rate limits.
    """
    settings = get_settings()
    peer_ip = request.client.host if request.client else "127.0.0.1"

    trusted_proxies = [p.strip() for p in settings.TRUSTED_PROXIES.split(",") if p.strip()]

    # If the direct peer is NOT a trusted proxy, ignore X-Forwarded-For to prevent spoofing
    if not _is_trusted_proxy(peer_ip, trusted_proxies):
        return peer_ip

    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        hops = [ip.strip() for ip in forwarded.split(",") if ip.strip()]
        if hops:
            return hops[0]

    return peer_ip
