from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List
from datetime import datetime

from config.database import get_db
from app.middleware.auth_middleware import get_current_admin, get_current_moderator
from models.models import (
    Issue, User, CivicEvidence, AuditLog, IssueStatus,
    EvidenceVerificationState
)
from schemas.schemas import (
    AdminIssueModeration,
    AdminEvidenceReview,
    AuditLogResponse,
    UserListResponse,
    IssueListEnvelope,
    ModerationQueueResponse,
    IssueListResponse,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ======================= MODERATION QUEUE =======================

@router.get("/moderation-queue")
async def get_moderation_queue(
    queue_type: str = Query("issues", regex="^(issues|evidence|comments|reports)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_moderator),
    db: Session = Depends(get_db)
):
    """Get items pending moderation (Moderator+ only)."""
    if queue_type == "issues":
        # Issues in evidence review status
        query = db.query(Issue).filter(Issue.status == IssueStatus.EVIDENCE_REVIEW)
        total = query.count()
        items = query.order_by(Issue.created_at.asc())\
            .offset((page - 1) * per_page)\
            .limit(per_page)\
            .all()

        return {
            "queue_type": "issues",
            "total": total,
            "page": page,
            "per_page": per_page,
            "items": [IssueListResponse.model_validate(i) for i in items]
        }

    elif queue_type == "evidence":
        # Evidence pending verification
        query = db.query(CivicEvidence)\
            .filter(CivicEvidence.verification_state == EvidenceVerificationState.SUBMITTED)
        total = query.count()
        items = query.order_by(CivicEvidence.created_at.asc())\
            .offset((page - 1) * per_page)\
            .limit(per_page)\
            .all()

        return {
            "queue_type": "evidence",
            "total": total,
            "page": page,
            "items": items
        }

    elif queue_type == "reports":
        # TODO: Implement when reports table added
        return {
            "queue_type": "reports",
            "message": "Reports moderation queue coming in Phase 2"
        }

    return {"error": "Unknown queue type"}


# ======================= ISSUE MODERATION =======================

@router.put("/issues/{issue_id}/moderate")
async def moderate_issue(
    issue_id: int,
    moderation: AdminIssueModeration,
    current_user: User = Depends(get_current_moderator),
    db: Session = Depends(get_db)
):
    """Approve, reject, or request changes on an issue."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    old_status = issue.status
    old_visibility = issue.visibility

    # Update issue
    issue.status = moderation.status
    issue.visibility = moderation.visibility
    issue.moderation_notes = moderation.moderation_notes
    issue.moderated_by_id = current_user.id
    issue.moderated_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        action="ISSUE_MODERATED",
        entity_type="Issue",
        entity_id=issue_id,
        changes={
            "old_status": old_status,
            "new_status": moderation.status,
            "old_visibility": old_visibility,
            "new_visibility": moderation.visibility,
            "notes": moderation.moderation_notes
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()

    return {
        "issue_id": issue_id,
        "new_status": moderation.status,
        "new_visibility": moderation.visibility,
        "moderated_by": current_user.display_name
    }


@router.delete("/issues/{issue_id}")
async def delete_issue_admin(
    issue_id: int,
    reason: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete an issue (Admin only)."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Create audit log before deletion
    audit_log = AuditLog(
        action="ISSUE_DELETED_BY_ADMIN",
        entity_type="Issue",
        entity_id=issue_id,
        changes={
            "title": issue.title,
            "reason": reason
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.delete(issue)
    db.commit()

    return {
        "message": "Issue deleted",
        "issue_id": issue_id,
        "reason": reason
    }


# ======================= EVIDENCE MODERATION =======================

@router.put("/evidence/{evidence_id}/verify")
async def admin_verify_evidence(
    evidence_id: int,
    review: AdminEvidenceReview,
    current_user: User = Depends(get_current_moderator),
    db: Session = Depends(get_db)
):
    """Verify, reject, or request changes to evidence."""
    evidence = db.query(CivicEvidence).filter(CivicEvidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    old_state = evidence.verification_state
    evidence.verification_state = review.verification_state
    evidence.verification_notes = review.verification_notes
    evidence.verified_by_id = current_user.id
    evidence.verified_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        action="EVIDENCE_VERIFIED_BY_ADMIN",
        entity_type="CivicEvidence",
        entity_id=evidence_id,
        changes={
            "old_state": old_state,
            "new_state": review.verification_state,
            "notes": review.verification_notes
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()

    return {
        "evidence_id": evidence_id,
        "new_state": review.verification_state,
        "verified_by": current_user.display_name
    }


# ======================= USER MANAGEMENT =======================

@router.get("/users", response_model=UserListResponse)
async def list_users(
    role: str = None,
    is_active: bool = None,
    is_banned: bool = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List users with filters (Admin only)."""
    query = db.query(User)

    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    if is_banned is not None:
        query = query.filter(User.is_banned == is_banned)

    total = query.count()
    users = query.offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "users": users
    }


@router.get("/cases", response_model=IssueListEnvelope)
async def list_all_cases(
    status: str = None,
    category: str = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """List all cases for admin review."""
    query = db.query(Issue)

    if status:
        query = query.filter(Issue.status == status)
    if category:
        query = query.filter(Issue.category == category)

    total = query.count()
    issues = query.order_by(Issue.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [IssueListResponse.model_validate(i) for i in issues]
    }


@router.put("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    reason: str,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Ban a user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot ban yourself"
        )

    user.is_banned = True
    user.ban_reason = reason

    audit_log = AuditLog(
        action="USER_BANNED",
        entity_type="User",
        entity_id=user_id,
        changes={"reason": reason},
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()

    return {"message": "User banned", "user_id": user_id}


@router.put("/users/{user_id}/unban")
async def unban_user(
    user_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Unban a user (Admin only)."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.is_banned = False
    user.ban_reason = None

    audit_log = AuditLog(
        action="USER_UNBANNED",
        entity_type="User",
        entity_id=user_id,
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()

    return {"message": "User unbanned", "user_id": user_id}


# ======================= ANALYTICS =======================

@router.get("/analytics/dashboard")
async def admin_dashboard(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get admin dashboard with key metrics."""
    return {
        "issues": {
            "total": db.query(func.count(Issue.id)).scalar(),
            "by_status": dict(
                db.query(Issue.status, func.count(Issue.id))
                .group_by(Issue.status)
                .all()
            ),
            "by_category": dict(
                db.query(Issue.category, func.count(Issue.id))
                .group_by(Issue.category)
                .all()
            ),
            "avg_resolution_confidence": float(
                db.query(func.avg(Issue.resolution_confidence)).scalar() or 0
            )
        },
        "users": {
            "total": db.query(func.count(User.id)).scalar(),
            "by_role": dict(
                db.query(User.role, func.count(User.id))
                .group_by(User.role)
                .all()
            ),
            "banned": db.query(func.count(User.id)).filter(User.is_banned == True).scalar()
        },
        "evidence": {
            "total": db.query(func.count(CivicEvidence.id)).scalar(),
            "pending_verification": db.query(func.count(CivicEvidence.id))\
                .filter(CivicEvidence.verification_state == EvidenceVerificationState.SUBMITTED)\
                .scalar(),
            "verified": db.query(func.count(CivicEvidence.id))\
                .filter(CivicEvidence.verification_state == EvidenceVerificationState.VERIFIED)\
                .scalar()
        },
        "moderation": {
            "issues_pending": db.query(func.count(Issue.id))\
                .filter(Issue.status == IssueStatus.EVIDENCE_REVIEW)\
                .scalar(),
            "evidence_pending": db.query(func.count(CivicEvidence.id))\
                .filter(CivicEvidence.verification_state == EvidenceVerificationState.SUBMITTED)\
                .scalar()
        }
    }


# ======================= AUDIT LOGS =======================

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    action: str = None,
    entity_type: str = None,
    user_id: int = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get immutable audit logs (Admin only)."""
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.performed_by_id == user_id)

    logs = query.order_by(AuditLog.performed_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return logs
