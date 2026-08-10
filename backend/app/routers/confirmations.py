from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import Optional, List
from datetime import datetime

from config.database import get_db
from config.settings import settings
from models.models import Confirmation, Issue, ConfirmationType, AuditLog, User
from schemas.schemas import ConfirmationCreate, ConfirmationResponse
from app.middleware.auth_middleware import get_current_user, get_optional_user

router = APIRouter(prefix="/api/v1/issues", tags=["confirmations"])


def _can_view(issue, user):
    if issue.visibility == "public":
        return True
    if not user:
        return False
    return user.id == issue.created_by_id or user.role in ["moderator", "admin"]


def calculate_resolution_confidence(issue_id: int, db: Session) -> float:
    """Calculate resolution confidence percentage."""
    affected_count = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue_id,
            Confirmation.confirmation_type == ConfirmationType.AFFECTED
        )
    ).count()

    if affected_count == 0:
        return 0.0

    resolved_count = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue_id,
            Confirmation.confirmation_type == ConfirmationType.RESOLVED
        )
    ).count()

    base_confidence = (resolved_count / affected_count) * 100
    return min(base_confidence, 100.0)


def _maybe_resolve_issue(issue: Issue, db: Session) -> None:
    affected_count = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue.id,
            Confirmation.confirmation_type == ConfirmationType.AFFECTED
        )
    ).count()

    resolved_count = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue.id,
            Confirmation.confirmation_type == ConfirmationType.RESOLVED
        )
    ).count()

    confidence = calculate_resolution_confidence(issue.id, db)
    issue.resolution_confidence = confidence

    if (
        affected_count >= settings.MIN_RESOLUTION_CONFIRMATIONS
        and resolved_count >= settings.MIN_RESOLUTION_CONFIRMATIONS
        and confidence >= settings.RESOLVED_CONFIDENCE_THRESHOLD
    ):
        issue.status = "resolved"


@router.post("/{issue_id}/confirm", response_model=ConfirmationResponse, status_code=status.HTTP_201_CREATED)
async def add_confirmation(
    issue_id: int,
    confirmation_data: ConfirmationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add confirmation that user is affected or that issue is resolved."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if not _can_view(issue, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Issue not published yet"
        )

    if current_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is banned"
        )

    existing = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue_id,
            Confirmation.user_id == current_user.id,
            Confirmation.confirmation_type == confirmation_data.confirmation_type
        )
    ).first()

    if existing:
        return existing

    db_confirmation = Confirmation(
        issue_id=issue_id,
        user_id=current_user.id,
        confirmation_type=confirmation_data.confirmation_type,
        description=confirmation_data.description
    )

    db.add(db_confirmation)
    db.flush()

    _maybe_resolve_issue(issue, db)

    from models.models import ResolutionEvent
    event = ResolutionEvent(
        issue_id=issue_id,
        event_type="confirmation_added",
        event_description=f"User confirmed: {confirmation_data.confirmation_type}",
        created_by_id=current_user.id
    )
    db.add(event)

    audit_log = AuditLog(
        action="CONFIRMATION_ADDED",
        entity_type="Confirmation",
        changes={
            "issue_id": issue_id,
            "confirmation_type": confirmation_data.confirmation_type,
            "new_confidence": float(issue.resolution_confidence)
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_confirmation)

    return db_confirmation


@router.get("/{issue_id}/confirmations")
async def get_confirmations_summary(
    issue_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get confirmation summary for an issue."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if not _can_view(issue, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not published yet"
        )

    affected_count = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue_id,
            Confirmation.confirmation_type == ConfirmationType.AFFECTED
        )
    ).count()

    resolved_count = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue_id,
            Confirmation.confirmation_type == ConfirmationType.RESOLVED
        )
    ).count()

    witnessed_count = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue_id,
            Confirmation.confirmation_type == ConfirmationType.WITNESSED
        )
    ).count()

    still_affected = affected_count - resolved_count

    return {
        "issue_id": issue_id,
        "affected": affected_count,
        "resolved": resolved_count,
        "witnessed": witnessed_count,
        "still_affected": max(0, still_affected),
        "resolution_confidence": float(issue.resolution_confidence),
        "status": issue.status
    }


@router.get("/{issue_id}/confirmations/details", response_model=List[ConfirmationResponse])
async def get_confirmations_detailed(
    issue_id: int,
    include_names: bool = False,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get detailed confirmations."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if not _can_view(issue, current_user):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not published yet"
        )

    confirmations = db.query(Confirmation)\
        .filter(Confirmation.issue_id == issue_id)\
        .order_by(Confirmation.created_at.desc())\
        .all()

    return confirmations


@router.delete("/{issue_id}/confirmations/{confirmation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_confirmation(
    issue_id: int,
    confirmation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a confirmation and recalculate resolution confidence."""
    confirmation = db.query(Confirmation).filter(
        and_(
            Confirmation.id == confirmation_id,
            Confirmation.issue_id == issue_id
        )
    ).first()

    if not confirmation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Confirmation not found"
        )

    if confirmation.user_id != current_user.id and current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    db.delete(confirmation)
    db.flush()

    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if issue:
        new_confidence = calculate_resolution_confidence(issue_id, db)
        issue.resolution_confidence = new_confidence

    audit_log = AuditLog(
        action="CONFIRMATION_DELETED",
        entity_type="Confirmation",
        entity_id=confirmation_id,
        changes={"new_confidence": float(issue.resolution_confidence) if issue else 0},
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
