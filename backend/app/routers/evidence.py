from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import os
import hashlib
from datetime import datetime

from config.database import get_db
from models.models import CivicEvidence, Issue, EvidenceVerificationState, AuditLog
from schemas.schemas import EvidenceCreate, EvidenceResponse

router = APIRouter(prefix="/api/v1/issues", tags=["evidence"])


def calculate_file_hash(file_data: bytes) -> str:
    """Calculate SHA-256 hash of file."""
    return hashlib.sha256(file_data).hexdigest()


async def save_evidence_file(
    file: UploadFile,
    issue_id: int,
    user_id: int
) -> dict:
    """Save evidence file and return metadata.

    In Phase 1: Save locally in /storage/evidence/
    In Phase 2: Upload to S3
    """
    file_data = await file.read()
    file_hash = calculate_file_hash(file_data)

    # Create storage directory if it doesn't exist
    storage_dir = f"storage/evidence/issue_{issue_id}"
    os.makedirs(storage_dir, exist_ok=True)

    # Save file with hash-based naming to prevent duplicates
    file_extension = os.path.splitext(file.filename)[1]
    file_path = f"{storage_dir}/{file_hash}{file_extension}"

    # Skip if file already exists
    if not os.path.exists(file_path):
        with open(file_path, "wb") as f:
            f.write(file_data)

    return {
        "file_path": file_path,
        "file_hash": file_hash,
        "file_size": len(file_data),
        "original_filename": file.filename,
        "content_type": file.content_type
    }


@router.post("/{issue_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    issue_id: int,
    file: UploadFile = File(...),
    title: str = Form(None),
    description: str = Form(None),
    evidence_type: str = Form(...),
    user_id: int = Form(...),  # TODO: Get from JWT token
    db: Session = Depends(get_db)
):
    """Upload evidence for an issue.

    Supported types: photo, document, video, expert_analysis, audit_report

    Max file size: 50MB
    """
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    # Validate file size (50MB max)
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > 50 * 1024 * 1024:  # 50MB
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 50MB limit"
        )

    # Save file
    try:
        file_metadata = await save_evidence_file(file, issue_id, user_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )

    # Create evidence record
    db_evidence = CivicEvidence(
        issue_id=issue_id,
        uploaded_by_id=user_id,
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

    # Create audit log
    audit_log = AuditLog(
        action="EVIDENCE_UPLOADED",
        entity_type="CivicEvidence",
        changes={
            "issue_id": issue_id,
            "evidence_type": evidence_type,
            "file_hash": file_metadata["file_hash"]
        },
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.commit()
    db.refresh(db_evidence)

    return db_evidence


@router.get("/{issue_id}/evidence", response_model=List[EvidenceResponse])
async def list_evidence(
    issue_id: int,
    include_rejected: bool = False,
    db: Session = Depends(get_db)
):
    """Get all evidence for an issue.

    By default, excludes rejected evidence unless explicitly requested.
    """
    # Check issue exists
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    query = db.query(CivicEvidence).filter(CivicEvidence.issue_id == issue_id)

    if not include_rejected:
        query = query.filter(CivicEvidence.verification_state != EvidenceVerificationState.REJECTED)

    evidence = query.order_by(CivicEvidence.created_at.desc()).all()
    return evidence


@router.get("/{issue_id}/evidence/{evidence_id}", response_model=EvidenceResponse)
async def get_evidence_detail(
    issue_id: int,
    evidence_id: int,
    db: Session = Depends(get_db)
):
    """Get specific evidence item."""
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
    user_id: int = None,  # TODO: Get from JWT, ensure admin/moderator
    db: Session = Depends(get_db)
):
    """Verify or reject evidence (Admin/Moderator only).

    States: verified, disputed, rejected
    """
    evidence = db.query(CivicEvidence).filter(CivicEvidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    # TODO: Check user is admin/moderator

    old_state = evidence.verification_state
    evidence.verification_state = verification_state
    evidence.verification_notes = verification_notes
    evidence.verified_by_id = user_id
    evidence.verified_at = datetime.utcnow()

    # Create audit log
    audit_log = AuditLog(
        action="EVIDENCE_VERIFIED",
        entity_type="CivicEvidence",
        entity_id=evidence_id,
        changes={
            "old_state": old_state,
            "new_state": verification_state,
            "notes": verification_notes
        },
        performed_by_id=user_id
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
    user_id: int = None,  # TODO: Get from JWT, ensure admin/moderator
    db: Session = Depends(get_db)
):
    """Redact sensitive PII from evidence (Admin/Moderator only)."""
    evidence = db.query(CivicEvidence).filter(CivicEvidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    # TODO: Check user is admin/moderator
    # TODO: Actually redact file (blur/mask sensitive info)

    evidence.is_sensitive_pii = True
    evidence.redaction_notes = redaction_notes

    # Create audit log
    audit_log = AuditLog(
        action="EVIDENCE_REDACTED",
        entity_type="CivicEvidence",
        entity_id=evidence_id,
        changes={"redaction_notes": redaction_notes},
        performed_by_id=user_id
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
    user_id: int = None,  # TODO: Get from JWT, ensure admin or uploader
    db: Session = Depends(get_db)
):
    """Delete evidence (Admin or uploader only)."""
    evidence = db.query(CivicEvidence).filter(CivicEvidence.id == evidence_id).first()

    if not evidence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence not found"
        )

    # TODO: Check permission (uploader or admin)

    # Create audit log
    audit_log = AuditLog(
        action="EVIDENCE_DELETED",
        entity_type="CivicEvidence",
        entity_id=evidence_id,
        performed_by_id=user_id
    )
    db.add(audit_log)

    db.delete(evidence)
    db.commit()
