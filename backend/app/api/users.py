from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.resources import _serialize_resource_item
from app.database import get_db_session
from app.models.interactions import Bookmark, Rating
from app.models.resource import Resource
from app.models.taxonomy import Topic, Unit
from app.models.user import User
from app.schemas.auth import UserActivityItem, UserActivityListResponse, UserResponse
from app.schemas.interactions import UserBookmarkItemResponse, UserBookmarksListResponse

router = APIRouter(tags=["Users"])


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Retrieve public contributor profile and stats by user ID.
    """
    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.contributor_profile))
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )
    return UserResponse.model_validate(user)


@router.get("/{user_id}/activity", response_model=UserActivityListResponse)
async def get_user_activity(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    limit: int = Query(20, ge=1, le=50),
):
    """
    Retrieve unified activity feed for a user: uploads, ratings, and bookmarks.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    # 1. Recent uploads
    up_stmt = (
        select(Resource)
        .where(Resource.uploader_id == user_id, Resource.is_deleted.is_(False))
        .order_by(Resource.created_at.desc())
        .limit(limit)
    )
    uploads = (await db.execute(up_stmt)).scalars().all()

    # 2. Recent ratings
    rate_stmt = (
        select(Rating)
        .where(Rating.user_id == user_id)
        .options(selectinload(Rating.resource))
        .order_by(Rating.created_at.desc())
        .limit(limit)
    )
    ratings = (await db.execute(rate_stmt)).scalars().all()

    # 3. Recent bookmarks
    bm_stmt = (
        select(Bookmark)
        .where(Bookmark.user_id == user_id)
        .options(selectinload(Bookmark.resource))
        .order_by(Bookmark.created_at.desc())
        .limit(limit)
    )
    bookmarks = (await db.execute(bm_stmt)).scalars().all()

    # Merge activity
    activities: list[UserActivityItem] = []

    for up in uploads:
        activities.append(
            UserActivityItem(
                id=f"upload_{up.id}",
                action="uploaded",
                title=f"Published {up.type.replace('_', ' ').upper()}",
                resource_id=up.id,
                resource_title=up.title,
                timestamp=up.created_at,
                badge=up.type.upper(),
            )
        )

    for r in ratings:
        if r.resource and not r.resource.is_deleted:
            activities.append(
                UserActivityItem(
                    id=f"rating_{r.id}",
                    action="rated",
                    title=f"Rated {r.stars} Stars",
                    resource_id=r.resource_id,
                    resource_title=r.resource.title,
                    timestamp=r.created_at,
                    badge=f"{r.stars}★",
                )
            )

    for bm in bookmarks:
        if bm.resource and not bm.resource.is_deleted:
            activities.append(
                UserActivityItem(
                    id=f"bookmark_{bm.id}",
                    action="bookmarked",
                    title="Saved to Library",
                    resource_id=bm.resource_id,
                    resource_title=bm.resource.title,
                    timestamp=bm.created_at,
                    badge="SAVED",
                )
            )

    # Sort descending by timestamp
    activities.sort(key=lambda x: x.timestamp, reverse=True)

    return UserActivityListResponse(
        user_id=user_id,
        items=activities[:limit],
    )


@router.get("/{user_id}/bookmarks", response_model=UserBookmarksListResponse)
async def get_user_bookmarks(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    Retrieve all bookmarked resources for a specified user, ordered by most recently bookmarked.
    Includes full resource metadata and taxonomy breadcrumbs.
    """
    # 1. Verify user exists
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    # 2. Total bookmarks count
    count_stmt = select(func.count(Bookmark.id)).where(Bookmark.user_id == user_id)
    total = (await db.execute(count_stmt)).scalar_one()

    # 3. Query bookmarks with eager-loaded Resource and its dependencies
    offset = (page - 1) * page_size
    stmt = (
        select(Bookmark)
        .where(Bookmark.user_id == user_id)
        .order_by(Bookmark.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .options(
            selectinload(Bookmark.resource).selectinload(Resource.uploader),
            selectinload(Bookmark.resource)
            .selectinload(Resource.topic)
            .selectinload(Topic.unit)
            .selectinload(Unit.subject),
        )
    )
    result = await db.execute(stmt)
    bookmarks = result.scalars().all()

    items = [
        UserBookmarkItemResponse(
            id=bm.id,
            user_id=bm.user_id,
            resource_id=bm.resource_id,
            created_at=bm.created_at,
            resource=_serialize_resource_item(bm.resource),
        )
        for bm in bookmarks
    ]

    return UserBookmarksListResponse(
        user_id=user_id,
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
