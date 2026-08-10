from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from config.database import get_db
from models.models import CivicEvidence, Issue, EvidenceVerificationState, AuditLog, User
from schemas.schemas import EvidenceResponse
from app.middleware.auth_middleware import get_current_user, get_current_moderator, get_optional_user
from services.file_service import save_evidence_file

router = APIRouter(prefix="/api/v1/issues", tags=["evidence"])


@router.post("/{issue_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    issue_id: int,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    evidence_type: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload evidence for an issue."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if issue.created_by_id != current_user.id and current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the issue creator or moderators can add evidence"
        )

    file_metadata = await save_evidence_file(file, issue_id)

    db_evidence = CivicEvidence(
        issue_id=issue_id,
        uploaded_by_id=current_user.id,
        title=title or file.filename,
        description=description,
        evidence_type=evidence_type,
        file_url=file_metadata["file_path"],
        file_hash=file_metadata["file_hash"],
        file_size=file_metadata["file_size"],
        verification_state=EvidenceVerificationState.SUBMITTED,
        visibility_level="public"
    )

    db.add(db_evidence)

    audit_log = AuditLog(
        action="EVIDENCE_UPLOADED",
        entity_type="CivicEvidence",
        changes={
            "issue_id": issue_id,
            "evidence_type": evidence_type,
            "file_hash": file_metadata["file_hash"]
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_evidence)

    return db_evidence


@router.get("/{issue_id}/evidence")
async def list_evidence(
    issue_id: int,
    include_rejected: bool = False,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get all evidence for an issue."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if issue.visibility == "draft":
        if not current_user or (current_user.id != issue.created_by_id and current_user.role not in ["moderator", "admin"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not published yet"
            )

    query = db.query(CivicEvidence).filter(CivicEvidence.issue_id == issue_id)

    if not include_rejected:
        query = query.filter(CivicEvidence.verification_state != EvidenceVerificationState.REJECTED)

    total = query.count()
    evidence = query.order_by(CivicEvidence.created_at.desc()).all()

    return {
        "items": evidence,
        "total": total
    }


@router.get("/{issue_id}/evidence/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence_detail(
    issue_id: int,
    evidence_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Get specific evidence item."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if issue.visibility == "draft":
        if not current_user or (current_user.id != issue.created_by_id and current_user.role not in ["moderator", "admin"]):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not published yet"
            )

    evidence = db.query(CivicEvidence).filter(
        CivicEvidence.id == evidence_id,
        CivicEvidence.issue_id == issue_id
    ).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    return evidence


@router.put("/evidence/{evidence_id}/verify")
async def verify_evidence(
    evidence_id: int,
    verification_state: str,
    verification_notes: str = None,
    current_user: User = Depends(get_current_moderator),
    db: Session = Depends(get_db)
):
    """Verify or reject evidence (Admin/Moderator only)."""
    evidence = db.query(CivicEvidence).filter(CivicEvidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    old_state = evidence.verification_state
    evidence.verification_state = verification_state
    evidence.verification_notes = verification_notes
    evidence.verified_by_id = current_user.id
    evidence.verified_at = datetime.utcnow()

    audit_log = AuditLog(
        action="EVIDENCE_VERIFIED",
        entity_type="CivicEvidence",
        entity_id=evidence_id,
        changes={
            "old_state": old_state,
            "new_state": verification_state,
            "notes": verification_notes
        },
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(evidence)

    return {
        "id": evidence.id,
        "verification_state": evidence.verification_state,
        "verified_at": evidence.verified_at
    }


@router.put("/evidence/{evidence_id}/redact")
async def redact_evidence(
    evidence_id: int,
    redaction_notes: str,
    current_user: User = Depends(get_current_moderator),
    db: Session = Depends(get_db)
):
    """Redact sensitive PII from evidence (Admin/Moderator only)."""
    evidence = db.query(CivicEvidence).filter(CivicEvidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    evidence.is_sensitive_pii = True
    evidence.redaction_notes = redaction_notes

    audit_log = AuditLog(
        action="EVIDENCE_REDACTED",
        entity_type="CivicEvidence",
        entity_id=evidence_id,
        changes={"redaction_notes": redaction_notes},
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(evidence)

    return {
        "id": evidence.id,
        "is_sensitive_pii": evidence.is_sensitive_pii,
        "redaction_notes": evidence.redaction_notes
    }


@router.delete("/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_evidence(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete evidence (Admin or uploader only)."""
    evidence = db.query(CivicEvidence).filter(CivicEvidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    if evidence.uploaded_by_id != current_user.id and current_user.role not in ["moderator", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    audit_log = AuditLog(
        action="EVIDENCE_DELETED",
        entity_type="CivicEvidence",
        entity_id=evidence_id,
        performed_by_id=current_user.id
    )
    db.add(audit_log)

    db.delete(evidence)
    db.commit()
