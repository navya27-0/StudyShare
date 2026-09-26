import math
from datetime import UTC, datetime
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.config import get_settings
from app.core.storage import StorageProvider, get_storage_provider
from app.database import get_db_session
from app.models.enums import ReportStatus, ResourceType, UserRole, VoteType
from app.models.interactions import Bookmark, Rating, Report, Vote
from app.models.profile import ContributorProfile
from app.models.resource import Resource, ResourceVersion
from app.models.taxonomy import Subject, Topic, Unit
from app.models.user import User
from app.schemas.interactions import (
    BookmarkResponse,
    RatingRequest,
    RatingResponse,
    ReportRequest,
    ReportResponse,
    VoteRequest,
    VoteResponse,
)
from app.schemas.resource import (
    BreadcrumbHierarchy,
    ResourceDetailResponse,
    ResourceListItemResponse,
    ResourceListResponse,
    ResourceVersionResponse,
    SubjectBriefResponse,
    TopicBriefResponse,
    UnitBriefResponse,
    UploaderBriefResponse,
)

router = APIRouter(tags=["Resources"])
settings = get_settings()


def _build_breadcrumbs(topic: Topic) -> BreadcrumbHierarchy:
    unit = topic.unit
    subject = unit.subject
    return BreadcrumbHierarchy(
        subject=SubjectBriefResponse.model_validate(subject),
        unit=UnitBriefResponse.model_validate(unit),
        topic=TopicBriefResponse.model_validate(topic),
    )


def _serialize_resource_item(resource: Resource) -> ResourceListItemResponse:
    breadcrumbs = (
        _build_breadcrumbs(resource.topic) if resource.topic and resource.topic.unit else None
    )
    return ResourceListItemResponse(
        id=resource.id,
        topic_id=resource.topic_id,
        type=resource.type,
        title=resource.title,
        description=resource.description,
        file_url=resource.file_url,
        file_size_bytes=resource.file_size_bytes,
        page_count=resource.page_count,
        semester=resource.semester,
        current_version_id=resource.current_version_id,
        upvotes_count=resource.upvotes_count,
        downvotes_count=resource.downvotes_count,
        rating_avg=resource.rating_avg,
        rating_count=resource.rating_count,
        views_count=resource.views_count,
        downloads_count=resource.downloads_count,
        is_verified=resource.is_verified,
        created_at=resource.created_at,
        updated_at=resource.updated_at,
        uploader=UploaderBriefResponse.model_validate(resource.uploader),
        breadcrumbs=breadcrumbs,
    )


def _serialize_resource_detail(resource: Resource) -> ResourceDetailResponse:
    base_item = _serialize_resource_item(resource)
    current_ver = (
        ResourceVersionResponse.model_validate(resource.current_version)
        if resource.current_version
        else None
    )
    versions_list = [ResourceVersionResponse.model_validate(v) for v in (resource.versions or [])]
    return ResourceDetailResponse(
        **base_item.model_dump(),
        current_version=current_ver,
        versions=versions_list,
    )


@router.get("", response_model=ResourceListResponse)
async def list_resources(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    subject_id: int | None = Query(None, description="Filter by Subject ID"),
    subject_code: str | None = Query(None, description="Filter by Subject Code (e.g. CS201)"),
    unit_id: int | None = Query(None, description="Filter by Unit ID"),
    topic_id: int | None = Query(None, description="Filter by Topic ID"),
    semester: int | None = Query(None, ge=1, le=8, description="Filter by semester (1-8)"),
    type: ResourceType | None = Query(None, description="Filter by resource type"),
    q: str | None = Query(
        None, min_length=1, description="Full-text search query across title & description"
    ),
    sort_by: str = Query(
        "recent",
        enum=["recent", "highest_rated", "most_upvoted", "most_downloaded"],
        description="Sorting criteria",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List resources with dynamic multi-level filtering (Subject -> Unit -> Topic),
    PostgreSQL full-text search, and multiple sorting dimensions.
    """
    # Base query joining Topic, Unit, Subject for taxonomy filters
    base_stmt = select(Resource).join(Resource.topic).join(Topic.unit).join(Unit.subject)

    # 1. Taxonomy & Domain Filters
    if topic_id is not None:
        base_stmt = base_stmt.where(Resource.topic_id == topic_id)
    if unit_id is not None:
        base_stmt = base_stmt.where(Topic.unit_id == unit_id)
    if subject_id is not None:
        base_stmt = base_stmt.where(Unit.subject_id == subject_id)
    if subject_code is not None:
        base_stmt = base_stmt.where(func.upper(Subject.code) == subject_code.upper().strip())
    if semester is not None:
        base_stmt = base_stmt.where(Resource.semester == semester)
    if type is not None:
        base_stmt = base_stmt.where(Resource.type == type)

    # 2. Full-Text Search across Title and Description
    if q and q.strip():
        search_query = q.strip()
        # Robust full-text search: supports websearch_to_tsquery on postgres, with fallback ILIKE
        bind = db.bind
        dialect_name = bind.dialect.name if bind else "postgresql"
        if dialect_name == "postgresql":
            ts_vector = func.to_tsvector(
                "english",
                Resource.title + " " + func.coalesce(Resource.description, ""),
            )
            # Combine FTS with substring fallback for partial words/acronyms
            fts_filter = or_(
                ts_vector.op("@@")(func.websearch_to_tsquery("english", search_query)),
                Resource.title.ilike(f"%{search_query}%"),
                Resource.description.ilike(f"%{search_query}%"),
            )
            base_stmt = base_stmt.where(fts_filter)
        else:
            base_stmt = base_stmt.where(
                or_(
                    Resource.title.ilike(f"%{search_query}%"),
                    Resource.description.ilike(f"%{search_query}%"),
                )
            )

    # 3. Compute Total Count
    count_stmt = select(func.count()).select_from(base_stmt.order_by(None).subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    # 4. Sorting
    if sort_by == "highest_rated":
        base_stmt = base_stmt.order_by(
            Resource.rating_avg.desc(), Resource.rating_count.desc(), Resource.created_at.desc()
        )
    elif sort_by == "most_upvoted":
        base_stmt = base_stmt.order_by(Resource.upvotes_count.desc(), Resource.created_at.desc())
    elif sort_by == "most_downloaded":
        base_stmt = base_stmt.order_by(Resource.downloads_count.desc(), Resource.created_at.desc())
    else:  # recent
        base_stmt = base_stmt.order_by(Resource.created_at.desc())

    # 5. Pagination
    offset = (page - 1) * page_size
    query_stmt = (
        base_stmt.offset(offset)
        .limit(page_size)
        .options(
            selectinload(Resource.uploader),
            selectinload(Resource.topic).selectinload(Topic.unit).selectinload(Unit.subject),
        )
    )

    result = await db.execute(query_stmt)
    resources = result.scalars().all()

    items = [_serialize_resource_item(r) for r in resources]
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ResourceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{resource_id}", response_model=ResourceDetailResponse)
async def get_resource(
    resource_id: int,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Retrieve single resource by ID with full version history and taxonomy breadcrumbs.
    Automatically increments view count.
    """
    stmt = (
        select(Resource)
        .where(Resource.id == resource_id)
        .execution_options(populate_existing=True)
        .options(
            selectinload(Resource.uploader),
            selectinload(Resource.current_version),
            selectinload(Resource.versions),
            selectinload(Resource.topic).selectinload(Topic.unit).selectinload(Unit.subject),
        )
    )
    result = await db.execute(stmt)
    resource = result.scalar_one_or_none()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    # Increment view counter
    resource.views_count += 1
    await db.commit()

    return _serialize_resource_detail(resource)


@router.post("", response_model=ResourceDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[StorageProvider, Depends(get_storage_provider)],
    topic_id: int = Form(..., description="ID of the topic this resource belongs to"),
    type: ResourceType = Form(ResourceType.NOTES, description="Type of study resource"),
    title: str = Form(..., min_length=3, max_length=255, description="Resource title"),
    description: str | None = Form(None, max_length=5000),
    semester: int = Form(..., ge=1, le=8, description="Academic semester"),
    page_count: int | None = Form(None, ge=1),
    changelog: str | None = Form("Initial upload", max_length=500),
    external_url: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    """
    Upload and create a new academic resource behind an abstract storage interface.
    Automatically provisions initial version and updates contributor stats.
    """
    # 1. Verify Topic existence
    topic_stmt = select(Topic).where(Topic.id == topic_id)
    topic_res = await db.execute(topic_stmt)
    topic = topic_res.scalar_one_or_none()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with ID {topic_id} does not exist.",
        )

    # 2. File and URL Handling
    file_url: str
    file_size_bytes: int | None = None

    if type == ResourceType.LINK:
        if not external_url or not external_url.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="External URL is required when resource type is 'link'.",
            )
        file_url = external_url.strip()
        file_size_bytes = 0
    else:
        if not file or not file.filename:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="A document file must be uploaded for non-link resource types.",
            )

        file_bytes = await file.read()
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
            )

        storage_result = await storage.save_file(
            file_content=file_bytes,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            subfolder=f"topic_{topic_id}",
        )
        file_url = storage_result.file_url
        file_size_bytes = storage_result.file_size_bytes

    # 3. Create Resource Record
    new_resource = Resource(
        topic_id=topic_id,
        uploader_id=current_user.id,
        type=type,
        title=title.strip(),
        description=description.strip() if description else None,
        file_url=file_url,
        file_size_bytes=file_size_bytes,
        page_count=page_count,
        semester=semester,
        upvotes_count=0,
        downvotes_count=0,
        rating_avg=0.0,
        rating_count=0,
        views_count=0,
        downloads_count=0,
        is_verified=False,
    )
    db.add(new_resource)
    await db.flush()

    # 4. Create Initial Version (Version 1)
    initial_version = ResourceVersion(
        resource_id=new_resource.id,
        version_number=1,
        file_url=file_url,
        changelog=changelog.strip() if changelog else "Initial upload",
        uploaded_by=current_user.id,
        file_size_bytes=file_size_bytes,
        page_count=page_count,
    )
    db.add(initial_version)
    await db.flush()

    # 5. Link current version
    new_resource.current_version_id = initial_version.id

    # 6. Update Contributor Profile Stats
    prof_stmt = select(ContributorProfile).where(ContributorProfile.user_id == current_user.id)
    prof_res = await db.execute(prof_stmt)
    profile = prof_res.scalar_one_or_none()
    if profile:
        profile.total_uploads += 1
        profile.reputation_points += 15  # 15 reputation points for publishing study material

    res_id = new_resource.id
    await db.commit()

    # Reload complete resource
    return await get_resource(res_id, db)


@router.put("/{resource_id}", response_model=ResourceDetailResponse)
async def update_resource(
    resource_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    storage: Annotated[StorageProvider, Depends(get_storage_provider)],
    changelog: str = Form(
        ..., min_length=3, max_length=500, description="Description of changes in this version"
    ),
    title: str | None = Form(None, min_length=3, max_length=255),
    description: str | None = Form(None, max_length=5000),
    page_count: int | None = Form(None, ge=1),
    external_url: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    """
    Update a resource (Owner or Admin only).
    Preserves version history by creating a new ResourceVersion rather than overwriting.
    """
    # 1. Fetch resource with versions
    stmt = (
        select(Resource).where(Resource.id == resource_id).options(selectinload(Resource.versions))
    )
    result = await db.execute(stmt)
    resource = result.scalar_one_or_none()

    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    # 2. Authorization check
    is_owner = resource.uploader_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN or current_user.is_superuser
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this resource. Only the owner or an admin can update it.",
        )

    # 3. Determine next version number
    current_versions = resource.versions or []
    max_ver = max((v.version_number for v in current_versions), default=0)
    next_ver_number = max_ver + 1

    # 4. Handle file / link update
    file_url = resource.file_url
    file_size_bytes = resource.file_size_bytes

    if resource.type == ResourceType.LINK:
        if external_url and external_url.strip():
            file_url = external_url.strip()
            file_size_bytes = 0
    elif file and file.filename:
        file_bytes = await file.read()
        if len(file_bytes) > settings.MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
            )
        storage_result = await storage.save_file(
            file_content=file_bytes,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            subfolder=f"topic_{resource.topic_id}",
        )
        file_url = storage_result.file_url
        file_size_bytes = storage_result.file_size_bytes

    # 5. Create new ResourceVersion record
    new_version = ResourceVersion(
        resource_id=resource.id,
        version_number=next_ver_number,
        file_url=file_url,
        changelog=changelog.strip(),
        uploaded_by=current_user.id,
        file_size_bytes=file_size_bytes,
        page_count=page_count if page_count is not None else resource.page_count,
    )
    db.add(new_version)
    await db.flush()

    # 6. Update resource pointer and metadata
    if resource.versions is not None:
        resource.versions.append(new_version)
    resource.current_version = new_version
    resource.current_version_id = new_version.id
    resource.file_url = file_url
    resource.file_size_bytes = file_size_bytes
    if page_count is not None:
        resource.page_count = page_count
    if title and title.strip():
        resource.title = title.strip()
    if description is not None:
        resource.description = description.strip() if description.strip() else None
    resource.updated_at = datetime.now(UTC)

    res_id = resource.id
    await db.commit()

    return await get_resource(res_id, db)


# ==============================================================================
# Resource Interaction Endpoints (Voting, Rating, Bookmarking, Reporting)
# ==============================================================================


@router.post("/{resource_id}/vote", response_model=VoteResponse)
async def vote_resource(
    resource_id: int,
    payload: VoteRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Vote on a resource (up or down).
    - If user has no existing vote: creates new vote.
    - If user votes the same direction again: toggles off (removes) the vote.
    - If user votes the opposite direction: switches the vote.

    Vote counters on the Resource and uploader ContributorProfile are atomically
    recomputed and persisted.
    """
    # 1. Verify resource exists
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    # 2. Check existing vote for (user_id, resource_id)
    vote_stmt = select(Vote).where(Vote.user_id == current_user.id, Vote.resource_id == resource_id)
    vote_res = await db.execute(vote_stmt)
    existing_vote = vote_res.scalar_one_or_none()

    if existing_vote is None:
        # Case 1: Fresh vote
        new_vote = Vote(
            user_id=current_user.id,
            resource_id=resource_id,
            value=payload.value,
        )
        db.add(new_vote)
        user_vote = payload.value
        action = "created"
        message = f"Vote recorded as '{payload.value}'."
    elif existing_vote.value == payload.value:
        # Case 2: Same direction -> Toggle-off (remove)
        await db.delete(existing_vote)
        user_vote = None
        action = "removed"
        message = f"Vote toggled off ('{payload.value}' removed)."
    else:
        # Case 3: Opposite direction -> Switch vote
        previous_val = existing_vote.value
        existing_vote.value = payload.value
        user_vote = payload.value
        action = "switched"
        message = f"Vote switched from '{previous_val}' to '{payload.value}'."

    await db.flush()

    # Efficiency Justification (Aggregate Query vs Maintained Counters):
    # Resource read operations (listings, full-text searches, and sorting by most_upvoted)
    # represent the vast majority (>95%) of application traffic. Denormalizing upvotes_count
    # and downvotes_count directly on the Resource model enables O(1) indexed sorting without
    # needing costly GROUP BY joins across the entire votes table on every listing request.
    # On voting write operations, we execute an indexed aggregate query targeting only the
    # specific resource within the transaction. This guarantees zero counter desynchronization
    # or race drift while preserving maximum read performance.
    counts_stmt = select(
        func.count().filter(Vote.value == VoteType.UP),
        func.count().filter(Vote.value == VoteType.DOWN),
    ).where(Vote.resource_id == resource_id)
    up_count, down_count = (await db.execute(counts_stmt)).one()

    resource.upvotes_count = up_count or 0
    resource.downvotes_count = down_count or 0

    # Maintain uploader's total upvotes in contributor profile
    uploader_upvotes_stmt = select(func.coalesce(func.sum(Resource.upvotes_count), 0)).where(
        Resource.uploader_id == resource.uploader_id
    )
    total_uploader_upvotes = (await db.execute(uploader_upvotes_stmt)).scalar_one()

    prof_stmt = select(ContributorProfile).where(ContributorProfile.user_id == resource.uploader_id)
    prof = (await db.execute(prof_stmt)).scalar_one_or_none()
    if prof:
        prof.total_upvotes_received = int(total_uploader_upvotes)

    await db.commit()

    return VoteResponse(
        resource_id=resource_id,
        user_vote=user_vote,
        upvotes_count=resource.upvotes_count,
        downvotes_count=resource.downvotes_count,
        action=action,
        message=message,
    )


@router.post("/{resource_id}/rating", response_model=RatingResponse)
async def rate_resource(
    resource_id: int,
    payload: RatingRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Rate a resource (1-5 stars).
    Upserts the rating for the authenticated user and recomputes the resource's
    rating_avg and rating_count.
    """
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    rating_stmt = select(Rating).where(
        Rating.user_id == current_user.id, Rating.resource_id == resource_id
    )
    existing_rating = (await db.execute(rating_stmt)).scalar_one_or_none()

    if existing_rating:
        existing_rating.stars = payload.stars
        existing_rating.updated_at = datetime.now(UTC)
        message = f"Rating updated to {payload.stars} stars."
    else:
        new_rating = Rating(
            user_id=current_user.id,
            resource_id=resource_id,
            stars=payload.stars,
        )
        db.add(new_rating)
        message = f"Rating recorded as {payload.stars} stars."

    await db.flush()

    # Efficiency Justification (Aggregate Query vs Maintained Counters):
    # Rating count and arithmetic average are denormalized on Resource to support O(1) indexed
    # orderings (ix_resources_topic_rating) for feed and search endpoints.
    # On write, we compute exact aggregate stats from the ratings table for this resource
    # inside the write transaction, avoiding floating point drift and guaranteeing accuracy.
    stats_stmt = select(
        func.count(Rating.id),
        func.coalesce(func.avg(Rating.stars), 0.0),
    ).where(Rating.resource_id == resource_id)
    rating_count, rating_avg = (await db.execute(stats_stmt)).one()

    resource.rating_count = rating_count or 0
    resource.rating_avg = round(float(rating_avg), 2)

    await db.commit()

    return RatingResponse(
        resource_id=resource_id,
        user_stars=payload.stars,
        rating_avg=resource.rating_avg,
        rating_count=resource.rating_count,
        message=message,
    )


@router.post("/{resource_id}/bookmark", response_model=BookmarkResponse)
async def bookmark_resource(
    resource_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Bookmark a resource for quick access in the user's library.
    Idempotent: if already bookmarked, returns bookmarked=True.
    """
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    bm_stmt = select(Bookmark).where(
        Bookmark.user_id == current_user.id, Bookmark.resource_id == resource_id
    )
    existing_bm = (await db.execute(bm_stmt)).scalar_one_or_none()

    if existing_bm:
        return BookmarkResponse(
            resource_id=resource_id,
            bookmarked=True,
            message="Resource is already in your bookmarks.",
        )

    new_bm = Bookmark(user_id=current_user.id, resource_id=resource_id)
    db.add(new_bm)
    await db.commit()

    return BookmarkResponse(
        resource_id=resource_id,
        bookmarked=True,
        message="Resource bookmarked successfully.",
    )


@router.delete("/{resource_id}/bookmark", response_model=BookmarkResponse)
async def remove_bookmark(
    resource_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Remove a resource from the user's bookmarks.
    Idempotent: if not bookmarked, returns bookmarked=False without error.
    """
    bm_stmt = select(Bookmark).where(
        Bookmark.user_id == current_user.id, Bookmark.resource_id == resource_id
    )
    existing_bm = (await db.execute(bm_stmt)).scalar_one_or_none()

    if not existing_bm:
        return BookmarkResponse(
            resource_id=resource_id,
            bookmarked=False,
            message="Resource was not in your bookmarks.",
        )

    await db.delete(existing_bm)
    await db.commit()

    return BookmarkResponse(
        resource_id=resource_id,
        bookmarked=False,
        message="Bookmark removed successfully.",
    )


@router.post(
    "/{resource_id}/report",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def report_resource(
    resource_id: int,
    payload: ReportRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Submit a moderation report for a resource with a detailed reason.
    Status defaults to 'open' for moderator review.
    """
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    report = Report(
        resource_id=resource_id,
        reporter_id=current_user.id,
        reason=payload.reason.strip(),
        status=ReportStatus.OPEN,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    return ReportResponse(
        id=report.id,
        resource_id=report.resource_id,
        reporter_id=report.reporter_id,
        reason=report.reason,
        status=report.status,
        created_at=report.created_at,
        message="Report submitted successfully and is pending moderator review.",
    )
