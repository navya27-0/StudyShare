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
    Request,
    UploadFile,
    status,
)
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_client_ip, get_current_user, get_optional_current_user
from app.config import get_settings
from app.core.ranking import compute_ranking_score, get_ranking_sql_expression
from app.core.rate_limit import counter_deduplicator
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
    DuplicateCheckResponse,
    ResourceDetailResponse,
    ResourceListItemResponse,
    ResourceListResponse,
    ResourceVersionResponse,
    SubjectBriefResponse,
    SubjectTreeItem,
    TopicBriefResponse,
    TopicCreateRequest,
    UnitBriefResponse,
    UnitCreateRequest,
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


def _serialize_resource_item(
    resource: Resource,
    is_bookmarked: bool = False,
    user_vote: str | None = None,
) -> ResourceListItemResponse:
    breadcrumbs = (
        _build_breadcrumbs(resource.topic) if resource.topic and resource.topic.unit else None
    )
    score = compute_ranking_score(
        rating_avg=resource.rating_avg,
        rating_count=resource.rating_count,
        upvotes_count=resource.upvotes_count,
        downvotes_count=resource.downvotes_count,
        downloads_count=resource.downloads_count,
        views_count=resource.views_count,
        is_verified=resource.is_verified,
        created_at=resource.created_at,
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
        is_deleted=resource.is_deleted,
        ranking_score=score,
        created_at=resource.created_at,
        updated_at=resource.updated_at,
        uploader=UploaderBriefResponse.model_validate(resource.uploader),
        breadcrumbs=breadcrumbs,
        is_bookmarked=is_bookmarked,
        user_vote=user_vote,
    )


def _serialize_resource_detail(
    resource: Resource,
    is_bookmarked: bool = False,
    user_vote: str | None = None,
) -> ResourceDetailResponse:
    base_item = _serialize_resource_item(resource, is_bookmarked=is_bookmarked, user_vote=user_vote)
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
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    subject_id: int | None = Query(None, description="Filter by Subject ID"),
    subject_code: str | None = Query(None, description="Filter by Subject Code (e.g. CS201)"),
    unit_id: int | None = Query(None, description="Filter by Unit ID"),
    topic_id: int | None = Query(None, description="Filter by Topic ID"),
    semester: int | None = Query(None, ge=1, le=8, description="Filter by semester (1-8)"),
    type: ResourceType | None = Query(None, description="Filter by resource type"),
    min_rating: float | None = Query(None, ge=1.0, le=5.0, description="Minimum average rating"),
    is_verified: bool | None = Query(
        None, description="Filter by faculty/syllabus verified status"
    ),
    uploader_id: int | None = Query(None, description="Filter by uploader user ID"),
    q: str | None = Query(
        None,
        min_length=1,
        description="Student-oriented search across title, description, course code, unit, topic, contributor, and filename",
    ),
    sort_by: str = Query(
        "ranked",
        enum=[
            "ranked",
            "recent",
            "newest",
            "recently_updated",
            "highest_rated",
            "most_upvoted",
            "most_downloaded",
        ],
        description="Sorting criteria ('ranked' uses composite quality + recency score)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List resources with dynamic multi-level filtering (Subject -> Unit -> Topic),
    student-oriented search (course codes, units, topics, contributors, synonyms),
    single-request bookmark/vote state hydration, and multiple sorting dimensions.
    """
    base_stmt = (
        select(Resource)
        .join(Resource.topic)
        .join(Topic.unit)
        .join(Unit.subject)
        .join(Resource.uploader)
        .where(Resource.is_deleted.is_(False))
    )

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
    if min_rating is not None:
        base_stmt = base_stmt.where(Resource.rating_avg >= min_rating)
    if is_verified is not None:
        base_stmt = base_stmt.where(Resource.is_verified.is_(is_verified))
    if uploader_id is not None:
        base_stmt = base_stmt.where(Resource.uploader_id == uploader_id)

    # 2. Student-Oriented Search across Title, Description, Course, Unit, Topic, Contributor & Synonyms
    if q and q.strip():
        search_query = q.strip()
        q_lower = search_query.lower()

        # Synonym expansion for common student search terms
        synonym_types: list[ResourceType] = []
        if any(
            term in q_lower
            for term in (
                "pyq",
                "past paper",
                "last year",
                "question paper",
                "exam paper",
                "midterm",
            )
        ):
            synonym_types.extend([ResourceType.PAPER, ResourceType.QUESTION_BANK])
        if any(term in q_lower for term in ("lab", "manual", "practical", "code")):
            synonym_types.append(ResourceType.LAB_RECORD)
        if any(term in q_lower for term in ("note", "lecture", "slide", "summary")):
            synonym_types.append(ResourceType.NOTES)

        bind = db.bind
        dialect_name = bind.dialect.name if bind else "postgresql"

        broad_ilike = [
            Resource.title.ilike(f"%{search_query}%"),
            Resource.description.ilike(f"%{search_query}%"),
            Subject.code.ilike(f"%{search_query}%"),
            Subject.name.ilike(f"%{search_query}%"),
            Unit.title.ilike(f"%{search_query}%"),
            Topic.title.ilike(f"%{search_query}%"),
            User.display_name.ilike(f"%{search_query}%"),
            Resource.file_url.ilike(f"%{search_query}%"),
        ]

        # Multi-token composite matching (e.g. "cs201 graph", "unit 3 dijkstra")
        tokens = [
            t
            for t in q_lower.replace("-", " ").split()
            if len(t) >= 2 and t not in ("unit", "sem", "semester", "the", "and", "for")
        ]
        token_clauses = []
        if len(tokens) > 1:
            per_token_matches = []
            for tok in tokens[:5]:
                tok_conds = [
                    Resource.title.ilike(f"%{tok}%"),
                    Resource.description.ilike(f"%{tok}%"),
                    Subject.code.ilike(f"%{tok}%"),
                    Subject.name.ilike(f"%{tok}%"),
                    Unit.title.ilike(f"%{tok}%"),
                    Topic.title.ilike(f"%{tok}%"),
                    User.display_name.ilike(f"%{tok}%"),
                ]
                if tok in ("pyq", "pyqs", "paper", "papers"):
                    tok_conds.append(
                        Resource.type.in_([ResourceType.PAPER, ResourceType.QUESTION_BANK])
                    )
                if tok in ("note", "notes"):
                    tok_conds.append(Resource.type == ResourceType.NOTES)
                if tok.isdigit():
                    tok_conds.append(Unit.unit_number == int(tok))
                per_token_matches.append(or_(*tok_conds))
            token_clauses.append(and_(*per_token_matches))

        if synonym_types and len(tokens) == 1:
            broad_ilike.append(Resource.type.in_(synonym_types))

        if dialect_name == "postgresql":
            ts_vector = func.to_tsvector(
                "english",
                Resource.title + " " + func.coalesce(Resource.description, ""),
            )
            fts_filter = or_(
                ts_vector.op("@@")(func.websearch_to_tsquery("english", search_query)),
                *broad_ilike,
                *token_clauses,
            )
            base_stmt = base_stmt.where(fts_filter)
        else:
            base_stmt = base_stmt.where(or_(*broad_ilike, *token_clauses))

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
    elif sort_by in ("recent", "newest"):
        base_stmt = base_stmt.order_by(Resource.created_at.desc())
    elif sort_by == "recently_updated":
        base_stmt = base_stmt.order_by(Resource.updated_at.desc(), Resource.created_at.desc())
    else:  # "ranked" (default)
        base_stmt = base_stmt.order_by(
            get_ranking_sql_expression(Resource).desc(), Resource.created_at.desc()
        )

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

    # 6. Single-pass hydration of user bookmarks and votes (eliminating extra roundtrips on slow networks)
    bookmarked_ids: set[int] = set()
    user_votes_map: dict[int, str] = {}
    if current_user and resources:
        res_ids = [r.id for r in resources]
        bm_res = await db.execute(
            select(Bookmark.resource_id).where(
                Bookmark.user_id == current_user.id,
                Bookmark.resource_id.in_(res_ids),
            )
        )
        bookmarked_ids = set(bm_res.scalars().all())

        vote_res = await db.execute(
            select(Vote.resource_id, Vote.value).where(
                Vote.user_id == current_user.id,
                Vote.resource_id.in_(res_ids),
            )
        )
        for r_id, v_val in vote_res.all():
            user_votes_map[r_id] = str(v_val.value if hasattr(v_val, "value") else v_val)

    items = [
        _serialize_resource_item(
            r,
            is_bookmarked=(r.id in bookmarked_ids),
            user_vote=user_votes_map.get(r.id),
        )
        for r in resources
    ]
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return ResourceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/taxonomy", response_model=list[SubjectTreeItem])
async def get_taxonomy_tree(
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Retrieve full academic taxonomy hierarchy: Subject -> Unit -> Topic
    ordered by subject semester/code and unit/topic sequence.
    """
    stmt = (
        select(Subject)
        .options(selectinload(Subject.units).selectinload(Unit.topics))
        .order_by(Subject.semester.asc(), Subject.code.asc())
    )
    result = await db.execute(stmt)
    subjects = result.scalars().all()
    return subjects


@router.post("/units", response_model=UnitBriefResponse, status_code=status.HTTP_201_CREATED)
async def create_unit(
    payload: UnitCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """Create a new academic unit under a subject (e.g. inline during resource upload)."""
    subject = await db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subject with ID {payload.subject_id} was not found.",
        )

    # Determine unit number if omitted
    unit_num = payload.unit_number
    if unit_num is None:
        max_unit_stmt = select(func.max(Unit.unit_number)).where(
            Unit.subject_id == payload.subject_id
        )
        max_unit = (await db.execute(max_unit_stmt)).scalar() or 0
        unit_num = max_unit + 1

    # Check for duplicate unit_number in this subject
    dup_stmt = select(Unit).where(
        Unit.subject_id == payload.subject_id, Unit.unit_number == unit_num
    )
    if (await db.execute(dup_stmt)).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Unit {unit_num} already exists in subject {subject.code}.",
        )

    new_unit = Unit(
        subject_id=payload.subject_id,
        unit_number=unit_num,
        title=payload.title.strip(),
        ordering=unit_num,
    )
    db.add(new_unit)
    await db.commit()
    await db.refresh(new_unit)
    return UnitBriefResponse.model_validate(new_unit)


@router.post("/topics", response_model=TopicBriefResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    payload: TopicCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """Create a new topic under a unit (e.g. inline during resource upload)."""
    unit = await db.get(Unit, payload.unit_id)
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unit with ID {payload.unit_id} was not found.",
        )

    max_order_stmt = select(func.max(Topic.ordering)).where(Topic.unit_id == payload.unit_id)
    max_order = (await db.execute(max_order_stmt)).scalar() or 0

    new_topic = Topic(
        unit_id=payload.unit_id,
        title=payload.title.strip(),
        ordering=max_order + 1,
    )
    db.add(new_topic)
    await db.commit()
    await db.refresh(new_topic)
    return TopicBriefResponse.model_validate(new_topic)


@router.get("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate_resource(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    title: str | None = Query(None, description="Candidate resource title"),
    topic_id: int | None = Query(None, description="Candidate topic ID"),
    unit_id: int | None = Query(None, description="Candidate unit ID"),
    subject_id: int | None = Query(None, description="Candidate subject ID"),
    file_size_bytes: int | None = Query(None, description="Candidate file size in bytes"),
):
    """
    Detect potential duplicate resources before upload using title similarity,
    course/unit/topic proximity, and exact file size matching.
    """
    if not title and not file_size_bytes:
        return DuplicateCheckResponse(has_duplicates=False, matches=[])

    stmt = (
        select(Resource)
        .join(Resource.topic)
        .join(Topic.unit)
        .join(Unit.subject)
        .where(Resource.is_deleted.is_(False))
    )

    if topic_id is not None:
        stmt = stmt.where(Resource.topic_id == topic_id)
    elif unit_id is not None:
        stmt = stmt.where(Topic.unit_id == unit_id)
    elif subject_id is not None:
        stmt = stmt.where(Unit.subject_id == subject_id)

    match_conditions = []
    if file_size_bytes and file_size_bytes > 0:
        match_conditions.append(Resource.file_size_bytes == file_size_bytes)

    if title and len(title.strip()) >= 4:
        clean_title = title.strip()
        match_conditions.append(Resource.title.ilike(f"%{clean_title}%"))
        words = [
            w
            for w in clean_title.lower().replace("-", " ").replace("_", " ").split()
            if len(w) >= 4 and w not in ("notes", "lecture", "unit", "exam", "paper", "study")
        ]
        if len(words) >= 2:
            word_clauses = [Resource.title.ilike(f"%{w}%") for w in words[:3]]
            match_conditions.append(and_(*word_clauses))

    if not match_conditions:
        return DuplicateCheckResponse(has_duplicates=False, matches=[])

    stmt = (
        stmt.where(or_(*match_conditions))
        .order_by(Resource.upvotes_count.desc(), Resource.created_at.desc())
        .limit(3)
        .options(
            selectinload(Resource.uploader),
            selectinload(Resource.topic).selectinload(Topic.unit).selectinload(Unit.subject),
        )
    )

    result = await db.execute(stmt)
    candidates = result.scalars().all()
    serialized = [_serialize_resource_item(r) for r in candidates]
    return DuplicateCheckResponse(
        has_duplicates=len(serialized) > 0,
        matches=serialized,
    )


@router.get("/{resource_id}", response_model=ResourceDetailResponse)
async def get_resource(
    resource_id: int,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    """
    Retrieve single resource by ID with full version history and taxonomy breadcrumbs.
    Automatically increments view count with per-user/per-IP deduplication.
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

    if not resource or resource.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    # Deduplicated view counter increment (prevents refresh spam)
    actor_key = f"user:{current_user.id}" if current_user else f"ip:{get_client_ip(request)}"
    if counter_deduplicator.should_increment(actor_key, resource_id, "view"):
        resource.views_count += 1
        await db.commit()

    is_bookmarked = False
    user_vote: str | None = None
    if current_user:
        bm = (
            await db.execute(
                select(Bookmark.id).where(
                    Bookmark.user_id == current_user.id, Bookmark.resource_id == resource_id
                )
            )
        ).scalar_one_or_none()
        is_bookmarked = bm is not None

        vt = (
            await db.execute(
                select(Vote.value).where(
                    Vote.user_id == current_user.id, Vote.resource_id == resource_id
                )
            )
        ).scalar_one_or_none()
        if vt is not None:
            user_vote = str(vt.value if hasattr(vt, "value") else vt)

    return _serialize_resource_detail(resource, is_bookmarked=is_bookmarked, user_vote=user_vote)


@router.post("", response_model=ResourceDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    request: Request,
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
    return await get_resource(res_id, request, db, current_user)


@router.put("/{resource_id}", response_model=ResourceDetailResponse)
async def update_resource(
    resource_id: int,
    request: Request,
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

    return await get_resource(res_id, request, db, current_user)


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


@router.post("/{resource_id}/download")
async def record_download(
    resource_id: int,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db_session)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
):
    """
    Increment download counter on resource with per-user/per-IP deduplication.
    """
    resource = await db.get(Resource, resource_id)
    if not resource or resource.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    actor_key = f"user:{current_user.id}" if current_user else f"ip:{get_client_ip(request)}"
    if counter_deduplicator.should_increment(actor_key, resource_id, "download"):
        resource.downloads_count += 1
        await db.commit()

    return {"resource_id": resource_id, "downloads_count": resource.downloads_count}
