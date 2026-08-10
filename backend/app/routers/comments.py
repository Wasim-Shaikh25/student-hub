from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime

from config.database import get_db
from models.models import Comment, Issue, User, AuditLog, GovernmentClaim
from schemas.schemas import CommentCreate, CommentResponse, GovernmentClaimCreate, GovernmentClaimResponse

router = APIRouter(prefix="/api/v1/issues", tags=["comments"])


@router.post("/{issue_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    issue_id: int,
    comment_data: CommentCreate,
    user_id: int,  # TODO: Get from JWT token
    db: Session = Depends(get_db)
):
    """Add a comment to an issue."""
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Check user exists and not banned
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User not found or banned"
        )

    # Check user role for expert_comment flag
    is_expert = user.role in ["expert", "moderator", "admin"]

    db_comment = Comment(
        issue_id=issue_id,
        user_id=user_id,
        text=comment_data.text,
        is_expert_comment=is_expert
    )

    db.add(db_comment)

    # Create audit log
    audit_log = AuditLog(
        action="COMMENT_CREATED",
        entity_type="Comment",
        changes={
            "issue_id": issue_id,
            "text_length": len(comment_data.text)
        },
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_comment)

    return db_comment


@router.get("/{issue_id}/comments", response_model=List[CommentResponse])
async def list_comments(
    issue_id: int,
    sort_by: str = Query("recent", regex="^(recent|helpful)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get comments on an issue."""
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    query = db.query(Comment)\
        .filter(Comment.issue_id == issue_id)\
        .filter(Comment.flagged_at == None)  # Exclude flagged comments

    # Sort
    if sort_by == "helpful":
        # TODO: Implement helpful count/reactions
        query = query.order_by(Comment.created_at.desc())
    else:
        query = query.order_by(Comment.created_at.desc())

    comments = query.offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return comments


@router.put("/{issue_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    issue_id: int,
    comment_id: int,
    updated_text: str,
    user_id: int = None,  # TODO: Get from JWT
    db: Session = Depends(get_db)
):
    """Update a comment (user can update own, within 5 minutes of creation)."""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.issue_id == issue_id
    ).first()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # TODO: Check permission (creator or admin)
    # TODO: Check time limit (5 minutes after creation)

    old_text = comment.text
    comment.text = updated_text
    comment.updated_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        action="COMMENT_UPDATED",
        entity_type="Comment",
        entity_id=comment_id,
        changes={
            "old_text_length": len(old_text),
            "new_text_length": len(updated_text)
        },
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(comment)

    return comment


@router.delete("/{issue_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    issue_id: int,
    comment_id: int,
    user_id: int = None,  # TODO: Get from JWT
    db: Session = Depends(get_db)
):
    """Delete a comment (creator or admin only)."""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.issue_id == issue_id
    ).first()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # TODO: Check permission (creator or admin)

    db.delete(comment)

    # Create audit log
    audit_log = AuditLog(
        action="COMMENT_DELETED",
        entity_type="Comment",
        entity_id=comment_id,
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()


@router.post("/{issue_id}/comments/{comment_id}/flag")
async def flag_comment(
    issue_id: int,
    comment_id: int,
    reason: str,
    user_id: int = None,  # TODO: Get from JWT
    db: Session = Depends(get_db)
):
    """Report a comment for moderation."""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.issue_id == issue_id
    ).first()

    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # Check if already flagged
    if comment.flagged_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment already flagged"
        )

    comment.flagged_at = datetime.utcnow()
    comment.flag_reason = reason

    # Create audit log
    audit_log = AuditLog(
        action="COMMENT_FLAGGED",
        entity_type="Comment",
        entity_id=comment_id,
        changes={"flag_reason": reason},
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()

    return {
        "message": "Comment flagged for review",
        "comment_id": comment_id,
        "flag_reason": reason
    }


# ======================= GOVERNMENT CLAIMS =======================

@router.post("/{issue_id}/claims", response_model=GovernmentClaimResponse, status_code=status.HTTP_201_CREATED)
async def add_government_claim(
    issue_id: int,
    claim_data: GovernmentClaimCreate,
    user_id: int = None,  # TODO: Get from JWT, ensure moderator/admin
    db: Session = Depends(get_db)
):
    """Add a government claim/response to an issue.

    Used to track official government statements about the issue.
    """
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    db_claim = GovernmentClaim(
        issue_id=issue_id,
        claim_text=claim_data.claim_text,
        claim_date=claim_data.claim_date or datetime.utcnow(),
        claimed_by=claim_data.claimed_by,
        source_url=claim_data.source_url,
        status="unverified"
    )

    db.add(db_claim)

    # Create timeline event
    from models.models import ResolutionEvent
    event = ResolutionEvent(
        issue_id=issue_id,
        event_type="claim_made",
        event_description=f"Government claim: {claim_data.claimed_by}",
        created_by_id=user_id
    )
    db.add(event)

    # Create audit log
    audit_log = AuditLog(
        action="GOVERNMENT_CLAIM_ADDED",
        entity_type="GovernmentClaim",
        changes={
            "issue_id": issue_id,
            "claimed_by": claim_data.claimed_by
        },
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_claim)

    return db_claim


@router.get("/{issue_id}/claims", response_model=List[GovernmentClaimResponse])
async def list_government_claims(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """Get all government claims for an issue."""
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    claims = db.query(GovernmentClaim)\
        .filter(GovernmentClaim.issue_id == issue_id)\
        .order_by(GovernmentClaim.created_at.desc())\
        .all()

    return claims


@router.put("/{issue_id}/claims/{claim_id}")
async def verify_government_claim(
    issue_id: int,
    claim_id: int,
    status: str,  # verified, disputed, contradicted
    verification_notes: str = None,
    user_id: int = None,  # TODO: Get from JWT, ensure moderator/admin
    db: Session = Depends(get_db)
):
    """Verify or dispute a government claim based on evidence."""
    claim = db.query(GovernmentClaim).filter(
        GovernmentClaim.id == claim_id,
        GovernmentClaim.issue_id == issue_id
    ).first()

    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )

    old_status = claim.status
    claim.status = status
    claim.verification_status = verification_notes

    db.commit()

    return {
        "id": claim.id,
        "old_status": old_status,
        "new_status": status,
        "verification_notes": verification_notes
    }
