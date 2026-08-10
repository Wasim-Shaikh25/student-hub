from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime

from config.database import get_db
from models.models import Comment, Issue, User, AuditLog, GovernmentClaim
from schemas.schemas import CommentCreate, CommentResponse, GovernmentClaimCreate, GovernmentClaimResponse
from app.middleware.auth_middleware import get_current_user, get_current_moderator, get_optional_user

router = APIRouter(prefix="/api/v1/issues", tags=["comments"])


def _can_view(issue, user):
    if issue.visibility == "public":
        return True
    if not user:
        return False
    return user.id == issue.created_by_id or user.role in ["moderator", "admin"]


@router.post("/{issue_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    issue_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to an issue."""
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

    is_expert = current_user.role in ["expert", "moderator", "admin"]

    db_comment = Comment(
        issue_id=issue_id,
        user_id=current_user.id,
        text=comment_data.text,
        is_expert_comment=is_expert
    )

    db.add(db_comment)

    audit_log = AuditLog(
        action="COMMENT_CREATED",
        entity_type="Comment",
        changes={
            "issue_id": issue_id,
            "text_length": len(comment_data.text)
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_comment)

    return db_comment


@router.get("/{issue_id}/comments")
async def list_comments(
    issue_id: int,
    sort_by: str = Query("recent", regex="^(recent|helpful)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get comments on an issue."""
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

    query = db.query(Comment)\
        .filter(Comment.issue_id == issue_id)\
        .filter(Comment.flagged_at == None)

    if sort_by == "helpful":
        query = query.order_by(Comment.created_at.desc())
    else:
        query = query.order_by(Comment.created_at.desc())

    total = query.count()
    comments = query.offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "items": [CommentResponse.model_validate(c) for c in comments],
        "total": total,
        "page": page,
        "per_page": per_page
    }


@router.put("/{issue_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    issue_id: int,
    comment_id: int,
    updated_text: str,
    current_user: User = Depends(get_current_user),
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

    if comment.user_id != current_user.id and current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    old_text = comment.text
    comment.text = updated_text
    comment.updated_at = datetime.utcnow()

    audit_log = AuditLog(
        action="COMMENT_UPDATED",
        entity_type="Comment",
        entity_id=comment_id,
        changes={
            "old_text_length": len(old_text),
            "new_text_length": len(updated_text)
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(comment)

    return comment


@router.delete("/{issue_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    issue_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
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

    if comment.user_id != current_user.id and current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    db.delete(comment)

    audit_log = AuditLog(
        action="COMMENT_DELETED",
        entity_type="Comment",
        entity_id=comment_id,
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()


@router.post("/{issue_id}/comments/{comment_id}/flag")
async def flag_comment(
    issue_id: int,
    comment_id: int,
    reason: str,
    current_user: User = Depends(get_current_user),
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

    if comment.flagged_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment already flagged"
        )

    comment.flagged_at = datetime.utcnow()
    comment.flag_reason = reason

    audit_log = AuditLog(
        action="COMMENT_FLAGGED",
        entity_type="Comment",
        entity_id=comment_id,
        changes={"flag_reason": reason},
        performed_by_id=current_user.id
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
    current_user: User = Depends(get_current_moderator),
    db: Session = Depends(get_db)
):
    """Add a government claim/response to an issue."""
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

    from models.models import ResolutionEvent
    event = ResolutionEvent(
        issue_id=issue_id,
        event_type="claim_made",
        event_description=f"Government claim: {claim_data.claimed_by}",
        created_by_id=current_user.id
    )
    db.add(event)

    audit_log = AuditLog(
        action="GOVERNMENT_CLAIM_ADDED",
        entity_type="GovernmentClaim",
        changes={
            "issue_id": issue_id,
            "claimed_by": claim_data.claimed_by
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_claim)

    return db_claim


@router.get("/{issue_id}/claims", response_model=List[GovernmentClaimResponse])
async def list_government_claims(
    issue_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get all government claims for an issue."""
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

    claims = db.query(GovernmentClaim)\
        .filter(GovernmentClaim.issue_id == issue_id)\
        .order_by(GovernmentClaim.created_at.desc())\
        .all()

    return claims


@router.put("/{issue_id}/claims/{claim_id}")
async def verify_government_claim(
    issue_id: int,
    claim_id: int,
    status: str,
    verification_notes: str = None,
    current_user: User = Depends(get_current_moderator),
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
