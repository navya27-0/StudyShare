from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin
from app.api.resources import _serialize_resource_item
from app.database import get_db_session
from app.models.enums import ReportStatus
from app.models.interactions import ModerationAction, Report
from app.models.resource import Resource
from app.models.taxonomy import Topic, Unit
from app.models.user import User
from app.schemas.admin import (
    AdminActionSuccessResponse,
    AdminReportListResponse,
    AdminReportResponse,
    AdminUserListResponse,
    ModerationActionListResponse,
    ModerationActionResponse,
    ReportActionRequest,
    ResourceModerationRequest,
    UserBanRequest,
)
from app.schemas.auth import UserResponse
from app.schemas.resource import UploaderBriefResponse

router = APIRouter(tags=["Admin"])


# ==============================================================================
# 1. Reports Management
# ==============================================================================


@router.get("/reports", response_model=AdminReportListResponse)
async def list_reports(
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    report_status: ReportStatus | None = Query(
        ReportStatus.OPEN,
        alias="status",
        description="Filter by report status ('open', 'reviewed', 'dismissed', or omit for all)",
    ),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    List user-submitted reports for administrative review.
    Defaults to 'open' reports.
    """
    base_stmt = select(Report)
    if report_status is not None:
        base_stmt = base_stmt.where(Report.status == report_status)

    count_stmt = select(func.count(Report.id))
    if report_status is not None:
        count_stmt = count_stmt.where(Report.status == report_status)
    total = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        base_stmt.order_by(Report.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .options(
            selectinload(Report.reporter),
            selectinload(Report.resource).selectinload(Resource.uploader),
            selectinload(Report.resource)
            .selectinload(Resource.topic)
            .selectinload(Topic.unit)
            .selectinload(Unit.subject),
        )
    )
    result = await db.execute(stmt)
    reports = result.scalars().all()

    items = []
    for rep in reports:
        reporter_brief = (
            UploaderBriefResponse.model_validate(rep.reporter) if rep.reporter else None
        )
        resource_brief = _serialize_resource_item(rep.resource) if rep.resource else None
        items.append(
            AdminReportResponse(
                id=rep.id,
                resource_id=rep.resource_id,
                reporter_id=rep.reporter_id,
                reason=rep.reason,
                status=rep.status,
                created_at=rep.created_at,
                resolved_at=rep.resolved_at,
                resolved_by=rep.resolved_by,
                reporter=reporter_brief,
                resource=resource_brief,
            )
        )

    return AdminReportListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.post("/reports/{report_id}/action", response_model=AdminActionSuccessResponse)
async def action_report(
    report_id: int,
    payload: ReportActionRequest,
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Action or dismiss a moderation report.
    - 'dismiss': Marks report as dismissed.
    - 'resolve' / 'action': Marks report as reviewed / actioned.
    Logs an audit entry to moderation_actions.
    """
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} was not found.",
        )

    action_norm = payload.action.strip().lower()
    if action_norm in ("dismiss", "dismissed"):
        new_status = ReportStatus.DISMISSED
        mod_action = "report_dismissed"
        msg = f"Report {report_id} was dismissed."
    elif action_norm in ("action", "resolve", "resolved", "review", "reviewed"):
        new_status = ReportStatus.REVIEWED
        mod_action = "report_actioned"
        msg = f"Report {report_id} was actioned and marked as reviewed."
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Action must be either 'dismiss' or 'resolve'/'action'.",
        )

    report.status = new_status
    report.resolved_at = datetime.now(UTC)
    report.resolved_by = current_admin.id

    # Create audit log entry
    audit_entry = ModerationAction(
        admin_id=current_admin.id,
        resource_id=report.resource_id,
        action=mod_action,
        note=payload.note,
    )
    db.add(audit_entry)
    await db.commit()

    return AdminActionSuccessResponse(
        message=msg,
        details={
            "report_id": report.id,
            "status": report.status,
            "resolved_by": current_admin.id,
        },
    )


# ==============================================================================
# 2. Resource Moderation (Remove / Restore)
# ==============================================================================


@router.post("/resources/{resource_id}/remove", response_model=AdminActionSuccessResponse)
async def remove_resource(
    resource_id: int,
    payload: ResourceModerationRequest | None,
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Soft-remove a resource from public access due to moderation policy violations.
    Records a moderation_actions entry.
    """
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    resource.is_deleted = True
    resource.updated_at = datetime.now(UTC)

    note_text = payload.note if payload and payload.note else "Resource removed by administrator"
    audit_entry = ModerationAction(
        admin_id=current_admin.id,
        resource_id=resource.id,
        action="resource_removed",
        note=note_text,
    )
    db.add(audit_entry)
    await db.commit()

    return AdminActionSuccessResponse(
        message=f"Resource '{resource.title}' (ID {resource_id}) has been removed.",
        details={"resource_id": resource_id, "is_deleted": True},
    )


@router.post("/resources/{resource_id}/restore", response_model=AdminActionSuccessResponse)
async def restore_resource(
    resource_id: int,
    payload: ResourceModerationRequest | None,
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Restore a previously removed resource to public access.
    Records a moderation_actions entry.
    """
    resource = await db.get(Resource, resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource with ID {resource_id} was not found.",
        )

    resource.is_deleted = False
    resource.updated_at = datetime.now(UTC)

    note_text = payload.note if payload and payload.note else "Resource restored by administrator"
    audit_entry = ModerationAction(
        admin_id=current_admin.id,
        resource_id=resource.id,
        action="resource_restored",
        note=note_text,
    )
    db.add(audit_entry)
    await db.commit()

    return AdminActionSuccessResponse(
        message=f"Resource '{resource.title}' (ID {resource_id}) has been restored to public view.",
        details={"resource_id": resource_id, "is_deleted": False},
    )


# ==============================================================================
# 3. User Moderation (Ban / Unban)
# ==============================================================================


@router.post("/users/{user_id}/ban", response_model=AdminActionSuccessResponse)
async def ban_user(
    user_id: int,
    payload: UserBanRequest | None,
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Ban a user from accessing StudyShare.
    Deactivates user account (is_active = False) and records a moderation audit entry.
    """
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot ban their own account.",
        )

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    if user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser accounts cannot be banned.",
        )

    user.is_active = False
    user.updated_at = datetime.now(UTC)

    note_text = payload.note if payload and payload.note else "User banned by administrator"
    audit_entry = ModerationAction(
        admin_id=current_admin.id,
        target_user_id=user.id,
        action="user_banned",
        note=note_text,
    )
    db.add(audit_entry)
    await db.commit()

    return AdminActionSuccessResponse(
        message=f"User '{user.display_name}' ({user.email}) has been banned.",
        details={"user_id": user_id, "is_active": False},
    )


@router.post("/users/{user_id}/unban", response_model=AdminActionSuccessResponse)
async def unban_user(
    user_id: int,
    payload: UserBanRequest | None,
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Unban a previously deactivated user account.
    Restores user account (is_active = True) and records a moderation audit entry.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    user.is_active = True
    user.updated_at = datetime.now(UTC)

    note_text = payload.note if payload and payload.note else "User unbanned by administrator"
    audit_entry = ModerationAction(
        admin_id=current_admin.id,
        target_user_id=user.id,
        action="user_unbanned",
        note=note_text,
    )
    db.add(audit_entry)
    await db.commit()

    return AdminActionSuccessResponse(
        message=f"User '{user.display_name}' ({user.email}) has been unbanned.",
        details={"user_id": user_id, "is_active": True},
    )


@router.post("/users/{user_id}/warn", response_model=AdminActionSuccessResponse)
async def warn_user(
    user_id: int,
    payload: UserBanRequest | None,
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Issue an official administrative warning to a user account.
    Records a moderation audit entry.
    """
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} was not found.",
        )

    note_text = payload.note if payload and payload.note else "Official warning issued by administrator"
    audit_entry = ModerationAction(
        admin_id=current_admin.id,
        target_user_id=user.id,
        action="user_warned",
        note=note_text,
    )
    db.add(audit_entry)
    await db.commit()

    return AdminActionSuccessResponse(
        message=f"Official warning issued to user '{user.display_name}'.",
        details={"user_id": user_id, "action": "user_warned"},
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_admin_users(
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    q: str | None = Query(None, description="Search query by name or email"),
    role: str | None = Query(None, description="Filter by role ('student' or 'admin')"),
    is_active: bool | None = Query(None, description="Filter by active status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    Administrative directory to search, inspect, and manage user accounts and roles.
    """
    base_stmt = select(User)
    count_stmt = select(func.count(User.id))

    if q and q.strip():
        term = f"%{q.strip()}%"
        filter_clause = or_(User.display_name.ilike(term), User.email.ilike(term))
        base_stmt = base_stmt.where(filter_clause)
        count_stmt = count_stmt.where(filter_clause)

    if role and role.strip():
        base_stmt = base_stmt.where(User.role == role.strip().lower())
        count_stmt = count_stmt.where(User.role == role.strip().lower())

    if is_active is not None:
        base_stmt = base_stmt.where(User.is_active == is_active)
        count_stmt = count_stmt.where(User.is_active == is_active)

    total = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        base_stmt.order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .options(selectinload(User.contributor_profile))
    )
    result = await db.execute(stmt)
    users = result.scalars().all()

    items = [UserResponse.model_validate(u) for u in users]
    return AdminUserListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


# ==============================================================================
# 4. Moderation Actions Log (Accountability Audit Trail)
# ==============================================================================


@router.get("/moderation-actions", response_model=ModerationActionListResponse)
async def list_moderation_actions(
    current_admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db_session)],
    resource_id: int | None = Query(None, description="Filter actions by resource ID"),
    target_user_id: int | None = Query(None, description="Filter actions by target user ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """
    Audit log of all moderation actions taken by administrators for complete accountability.
    Ordered by most recent first.
    """
    base_stmt = select(ModerationAction)
    if resource_id is not None:
        base_stmt = base_stmt.where(ModerationAction.resource_id == resource_id)
    if target_user_id is not None:
        base_stmt = base_stmt.where(ModerationAction.target_user_id == target_user_id)

    count_stmt = select(func.count(ModerationAction.id))
    if resource_id is not None:
        count_stmt = count_stmt.where(ModerationAction.resource_id == resource_id)
    if target_user_id is not None:
        count_stmt = count_stmt.where(ModerationAction.target_user_id == target_user_id)
    total = (await db.execute(count_stmt)).scalar_one()

    offset = (page - 1) * page_size
    stmt = (
        base_stmt.order_by(ModerationAction.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .options(
            selectinload(ModerationAction.admin),
            selectinload(ModerationAction.resource),
            selectinload(ModerationAction.target_user),
        )
    )
    result = await db.execute(stmt)
    actions = result.scalars().all()

    items = [
        ModerationActionResponse(
            id=act.id,
            admin_id=act.admin_id,
            admin_name=act.admin.display_name if act.admin else None,
            resource_id=act.resource_id,
            resource_title=act.resource.title if act.resource else None,
            target_user_id=act.target_user_id,
            target_user_name=act.target_user.display_name if act.target_user else None,
            action=act.action,
            note=act.note,
            created_at=act.created_at,
        )
        for act in actions
    ]

    return ModerationActionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )

