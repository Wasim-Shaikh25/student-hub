from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List
from datetime import datetime

from config.database import get_db
from models.models import Confirmation, Issue, ConfirmationType, AuditLog
from schemas.schemas import ConfirmationCreate, ConfirmationResponse

router = APIRouter(prefix="/api/v1/issues", tags=["confirmations"])


def calculate_resolution_confidence(issue_id: int, db: Session) -> float:
    """Calculate resolution confidence percentage.

    Formula: (confirmed_resolved / confirmed_affected) * 100%
    Adjusted by evidence quality and official responses.
    """
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

    # TODO: Adjust by:
    # - Evidence quality/verification state
    # - Official response presence
    # - CAG audit findings (contradictions reduce confidence)
    # - Recency of data

    return min(base_confidence, 100.0)


@router.post("/{issue_id}/confirm", response_model=ConfirmationResponse, status_code=status.HTTP_201_CREATED)
async def add_confirmation(
    issue_id: int,
    confirmation_data: ConfirmationCreate,
    user_id: int,  # TODO: Get from JWT token
    db: Session = Depends(get_db)
):
    """Add confirmation that user is affected or that issue is resolved.

    Types:
    - affected: User confirms they are affected by this problem
    - resolved: User confirms their issue has been resolved
    - witnessed: User witnessed the issue but not directly affected

    Confirmations are idempotent - calling twice returns the same confirmation.
    """
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Check if confirmation already exists (idempotent)
    existing = db.query(Confirmation).filter(
        and_(
            Confirmation.issue_id == issue_id,
            Confirmation.user_id == user_id,
            Confirmation.confirmation_type == confirmation_data.confirmation_type
        )
    ).first()

    if existing:
        return existing

    # Create new confirmation
    db_confirmation = Confirmation(
        issue_id=issue_id,
        user_id=user_id,
        confirmation_type=confirmation_data.confirmation_type,
        description=confirmation_data.description
    )

    db.add(db_confirmation)

    # Recalculate resolution confidence
    new_confidence = calculate_resolution_confidence(issue_id, db)
    issue.resolution_confidence = new_confidence

    # Create timeline event
    from models.models import ResolutionEvent
    event = ResolutionEvent(
        issue_id=issue_id,
        event_type="confirmation_added",
        event_description=f"User confirmed: {confirmation_data.confirmation_type}",
        created_by_id=user_id
    )
    db.add(event)

    # Create audit log
    audit_log = AuditLog(
        action="CONFIRMATION_ADDED",
        entity_type="Confirmation",
        changes={
            "issue_id": issue_id,
            "confirmation_type": confirmation_data.confirmation_type,
            "new_confidence": float(new_confidence)
        },
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_confirmation)

    return db_confirmation


@router.get("/{issue_id}/confirmations")
async def get_confirmations_summary(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """Get confirmation summary for an issue (aggregated, respecting privacy)."""
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
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

    # Calculate still_affected
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
    include_names: bool = False,  # Only for owner/moderator
    db: Session = Depends(get_db)
):
    """Get detailed confirmations (with privacy controls).

    Only users who opted in have their names shown.
    """
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # TODO: Check user permission (owner or moderator for personal details)

    confirmations = db.query(Confirmation)\
        .filter(Confirmation.issue_id == issue_id)\
        .order_by(Confirmation.created_at.desc())\
        .all()

    return confirmations


@router.delete("/{issue_id}/confirmations/{confirmation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_confirmation(
    issue_id: int,
    confirmation_id: int,
    user_id: int = None,  # TODO: Get from JWT
    db: Session = Depends(get_db)
):
    """Delete a confirmation (user can delete own, admin can delete any).

    Recalculates resolution confidence after deletion.
    """
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

    # TODO: Check permission (user can delete own, admin can delete any)

    db.delete(confirmation)

    # Recalculate resolution confidence
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    new_confidence = calculate_resolution_confidence(issue_id, db)
    issue.resolution_confidence = new_confidence

    # Create audit log
    audit_log = AuditLog(
        action="CONFIRMATION_DELETED",
        entity_type="Confirmation",
        entity_id=confirmation_id,
        changes={"new_confidence": float(new_confidence)},
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()
