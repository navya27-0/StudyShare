from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.resources import _serialize_resource_item
from app.database import get_db_session
from app.models.interactions import Bookmark
from app.models.resource import Resource
from app.models.taxonomy import Topic, Unit
from app.models.user import User
from app.schemas.interactions import UserBookmarkItemResponse, UserBookmarksListResponse

router = APIRouter(tags=["Users"])


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
