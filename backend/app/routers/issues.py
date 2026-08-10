from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import datetime

from config.database import get_db
from models.models import Issue, IssueStatus, CivicEvidence, EvidenceVerificationState, AuditLog, Confirmation, User
from schemas.schemas import IssueUpdate, IssueDetailResponse
from app.middleware.auth_middleware import get_current_user, get_optional_user, get_current_moderator
from services.file_service import save_evidence_file

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])


def _can_view(issue: Issue, user: Optional[User]) -> bool:
    if issue.visibility != "draft":
        return True
    if not user:
        return False
    return user.id == issue.created_by_id or user.role in ["moderator", "admin"]


def _enrich_issue(issue: Issue, db: Session):
    affected = db.query(func.count(Confirmation.id)).filter(
        and_(Confirmation.issue_id == issue.id, Confirmation.confirmation_type == "affected")
    ).scalar()
    resolved = db.query(func.count(Confirmation.id)).filter(
        and_(Confirmation.issue_id == issue.id, Confirmation.confirmation_type == "resolved")
    ).scalar()
    issue.total_affected_confirmations = affected
    issue.total_resolved_confirmations = resolved
    return issue


@router.post("", response_model=IssueDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    state_id: int = Form(...),
    district_id: Optional[int] = Form(None),
    block_id: Optional[int] = Form(None),
    ward_id: Optional[int] = Form(None),
    estimated_affected_people: Optional[int] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new issue with mandatory evidence."""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one evidence file is required"
        )

    db_issue = Issue(
        title=title,
        description=description,
        category=category,
        created_by_id=current_user.id,
        state_id=state_id,
        district_id=district_id,
        block_id=block_id,
        ward_id=ward_id,
        estimated_affected_people=estimated_affected_people,
        status=IssueStatus.EVIDENCE_REVIEW,
        visibility="draft"
    )

    if latitude is not None and longitude is not None:
        db_issue.location_point = f"POINT({longitude} {latitude})"

    db.add(db_issue)
    db.commit()
    db.refresh(db_issue)

    for file in files:
        file_metadata = await save_evidence_file(file, db_issue.id)
        evidence = CivicEvidence(
            issue_id=db_issue.id,
            uploaded_by_id=current_user.id,
            title=file.filename,
            evidence_type="photo",
            file_url=file_metadata["file_path"],
            file_hash=file_metadata["file_hash"],
            file_size=file_metadata["file_size"],
            verification_state=EvidenceVerificationState.SUBMITTED,
            visibility_level="public"
        )
        db.add(evidence)

    audit_log = AuditLog(
        action="ISSUE_CREATED",
        entity_type="Issue",
        changes={
            "title": title,
            "category": category,
            "evidence_count": len(files)
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_issue)

    return _enrich_issue(db_issue, db)


@router.get("")
async def list_issues(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    state_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """List public issues with filters."""
    query = db.query(Issue).filter(Issue.visibility == "public")

    if category:
        query = query.filter(Issue.category == category)
    if status:
        query = query.filter(Issue.status == status)
    if state_id:
        query = query.filter(Issue.state_id == state_id)

    total = query.count()
    issues = query.order_by(Issue.created_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    for issue in issues:
        _enrich_issue(issue, db)

    return {
        "items": issues,
        "total": total,
        "page": page,
        "per_page": per_page
    }


@router.get("/{issue_id}", response_model=IssueDetailResponse)
async def get_issue(
    issue_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get issue detail with all related data."""
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

    return _enrich_issue(issue, db)


@router.put("/{issue_id}", response_model=IssueDetailResponse)
async def update_issue(
    issue_id: int,
    update_data: IssueUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an issue (only by creator or moderator)."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if issue.created_by_id != current_user.id and current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    if update_data.title:
        issue.title = update_data.title
    if update_data.description:
        issue.description = update_data.description
    if update_data.category:
        issue.category = update_data.category
    if update_data.status:
        issue.status = update_data.status
    if update_data.visibility:
        issue.visibility = update_data.visibility
    if update_data.estimated_affected_people is not None:
        issue.estimated_affected_people = update_data.estimated_affected_people

    db.commit()
    db.refresh(issue)

    return _enrich_issue(issue, db)


@router.delete("/{issue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_issue(
    issue_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an issue (draft only, by creator or moderator)."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()

    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if issue.created_by_id != current_user.id and current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    db.delete(issue)
    db.commit()


@router.get("/{issue_id}/spending", response_model=dict)
async def get_spending_context(
    issue_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get government spending context for an issue."""
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
