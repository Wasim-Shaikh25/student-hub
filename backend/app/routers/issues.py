from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List

from config.database import get_db
from models.models import Issue, IssueStatus
from schemas.schemas import (
    IssueCreate,
    IssueUpdate,
    IssueDetailResponse,
    IssueListResponse,
    IssueListFilters,
)

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])


@router.post("", response_model=IssueDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    issue_data: IssueCreate,
    user_id: int,  # TODO: Get from JWT token
    db: Session = Depends(get_db)
):
    """Create a new issue."""
    # TODO: Add JWT authentication

    db_issue = Issue(
        title=issue_data.title,
        description=issue_data.description,
        category=issue_data.category,
        created_by_id=user_id,
        state_id=issue_data.state_id,
        district_id=issue_data.district_id,
        block_id=issue_data.block_id,
        ward_id=issue_data.ward_id,
        estimated_affected_people=issue_data.estimated_affected_people,
        status=IssueStatus.DRAFT,
        visibility="draft"
    )

    # Set location if provided
    if issue_data.latitude and issue_data.longitude:
        from geoalchemy2.functions import ST_Point
        db_issue.location_point = f"POINT({issue_data.longitude} {issue_data.latitude})"

    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)

    return db_issue


@router.get("", response_model=List[IssueListResponse])
async def list_issues(
    category: str = Query(None),
    status: str = Query(None),
    state_id: int = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List issues with filters."""
    query = db.query(Issue).filter(Issue.visibility == "public")

    if category:
        query = query.filter(Issue.category == category)

    if status:
        query = query.filter(Issue.status == status)

    if state_id:
        query = query.filter(Issue.state_id == state_id)

    # Pagination
    total = query.count()
    issues = query.order_by(Issue.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return issues


@router.get("/{issue_id}", response_model=IssueDetailResponse)
async def get_issue(issue_id: int, db: Session = Depends(get_db)):
    """Get issue detail with all related data."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Only return if public or user is owner/moderator
    if issue.visibility == "draft":
        # TODO: Check if current user is owner or moderator
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not published yet"
        )

    return issue


@router.put("/{issue_id}", response_model=IssueDetailResponse)
async def update_issue(
    issue_id: int,
    update_data: IssueUpdate,
    user_id: int,  # TODO: Get from JWT token
    db: Session = Depends(get_db)
):
    """Update an issue (only by creator or moderator)."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # TODO: Check permission (creator or moderator)

    # Update fields
    if update_data.title:
        issue.title = update_data.title
    if update_data.description:
        issue.description = update_data.description
    if update_data.category:
        issue.category = update_data.category
    if update_data.status:
        issue.status = update_data.status
    if update_data.estimated_affected_people is not None:
        issue.estimated_affected_people = update_data.estimated_affected_people

    db.commit()
    db.refresh(issue)

    return issue


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: int,
    user_id: int,  # TODO: Get from JWT token
    db: Session = Depends(get_db)
):
    """Delete an issue (draft only, by creator or moderator)."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # TODO: Check permission (creator or moderator)
    # TODO: Check if status is draft

    db.delete(issue)
    db.commit()


@router.get("/{issue_id}/spending", response_model=dict)
async def get_spending_context(issue_id: int, db: Session = Depends(get_db)):
    """Get government spending context for an issue."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Return spending evidence linked to this issue
    from sqlalchemy import func
    from models.models import Confirmation

    spending_data = {
        "issue_id": issue.id,
        "spending_evidence": [
            {
                "source_type": e.source_type,
                "scheme_name": e.scheme_name,
                "amount_allocated": e.amount_allocated,
                "amount_released": e.amount_released,
                "amount_spent": e.amount_spent,
            }
            for e in issue.spending_evidence
        ],
        "confirmations_summary": {
            "affected": db.query(Confirmation)\
                .filter(
                    and_(
                        Confirmation.issue_id == issue_id,
                        Confirmation.confirmation_type == "affected"
                    )
                ).count(),
            "resolved": db.query(Confirmation)\
                .filter(
                    and_(
                        Confirmation.issue_id == issue_id,
                        Confirmation.confirmation_type == "resolved"
                    )
                ).count(),
        }
    }

    return spending_data
