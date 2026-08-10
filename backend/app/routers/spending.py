from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from decimal import Decimal

from config.database import get_db
from models.models import SpendingEvidence, Issue, GeographyHierarchy
from schemas.schemas import SpendingEvidenceResponse, SpendingContext

router = APIRouter(prefix="/api/v1/spending", tags=["spending"])


@router.get("/schemes")
async def list_schemes(
    state_id: Optional[int] = None,
    financial_year: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List government schemes with spending data."""
    query = db.query(SpendingEvidence).filter(SpendingEvidence.source_type == "budget")

    if state_id:
        query = query.filter(SpendingEvidence.applicable_state_id == state_id)

    if financial_year:
        query = query.filter(SpendingEvidence.financial_year == financial_year)

    total = query.count()
    schemes = query.order_by(SpendingEvidence.amount_allocated.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "items": schemes,
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/schemes/{scheme_id}")
async def get_scheme_detail(
    scheme_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed scheme information with all aliases and historical data."""
    # Get all records for this scheme
    scheme_records = db.query(SpendingEvidence)\
        .filter(SpendingEvidence.scheme_id == scheme_id)\
        .order_by(SpendingEvidence.financial_year.desc())\
        .all()

    if not scheme_records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheme not found"
        )

    # Aggregate data
    primary_record = scheme_records[0]
    aliases = set()
    financial_data = {}

    for record in scheme_records:
        if record.scheme_aliases:
            aliases.update(record.scheme_aliases)

        if record.financial_year:
            financial_data[record.financial_year] = {
                "allocated": record.amount_allocated,
                "released": record.amount_released,
                "spent": record.amount_spent,
                "source": record.source_name,
                "data_confidence": float(record.data_confidence)
            }

    return {
        "scheme_id": scheme_id,
        "scheme_name": primary_record.scheme_name,
        "aliases": list(aliases),
        "source_type": primary_record.source_type,
        "financial_years": financial_data,
        "states_covered": [r.applicable_state_id for r in scheme_records if r.applicable_state_id],
        "last_updated": max(r.extracted_at for r in scheme_records) if scheme_records else None
    }


@router.get("/schemes/{scheme_id}/budget-vs-outcome")
async def get_scheme_budget_vs_outcome(
    scheme_id: str,
    financial_year: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Compare budget allocation vs actual outcomes for a scheme.

    Shows:
    - Allocation vs expenditure
    - Number of linked citizen issues
    - Average resolution rate
    - Efficiency metrics
    """
    # Get spending data
    spending_query = db.query(SpendingEvidence)\
        .filter(SpendingEvidence.scheme_id == scheme_id)

    if financial_year:
        spending_query = spending_query.filter(SpendingEvidence.financial_year == financial_year)

    spending_records = spending_query.all()

    if not spending_records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No spending data for this scheme"
        )

    # Get linked issues
    linked_issues = db.query(Issue)\
        .join(SpendingEvidence)\
        .filter(SpendingEvidence.scheme_id == scheme_id)\
        .all()

    # Calculate metrics
    total_allocated = sum(r.amount_allocated or 0 for r in spending_records)
    total_released = sum(r.amount_released or 0 for r in spending_records)
    total_spent = sum(r.amount_spent or 0 for r in spending_records)

    avg_resolution = sum(
        float(issue.resolution_confidence or 0) for issue in linked_issues
    ) / len(linked_issues) if linked_issues else 0

    efficiency_ratio = (
        (total_spent / total_allocated) if total_allocated > 0 else 0
    )

    return {
        "scheme_id": scheme_id,
        "scheme_name": spending_records[0].scheme_name,
        "financial_year": financial_year or "all",
        "budget": {
            "allocated_crores": total_allocated / 10000000,  # Convert paise to crores
            "released_crores": total_released / 10000000,
            "spent_crores": total_spent / 10000000,
            "release_percentage": (total_released / total_allocated * 100) if total_allocated > 0 else 0,
            "expenditure_percentage": (total_spent / total_allocated * 100) if total_allocated > 0 else 0,
            "unspent_crores": (total_allocated - total_spent) / 10000000
        },
        "outcomes": {
            "linked_issues": len(linked_issues),
            "avg_resolution_rate": avg_resolution,
            "issues_by_status": db.query(Issue.status, func.count(Issue.id))\
                .filter(Issue.id.in_([i.id for i in linked_issues]))\
                .group_by(Issue.status)\
                .all()
        },
        "efficiency": {
            "budget_utilization_ratio": efficiency_ratio,
            "spending_per_resolved_issue_crores": (
                total_spent / sum(1 for i in linked_issues if i.resolution_confidence >= 80)
            ) if any(i.resolution_confidence >= 80 for i in linked_issues) else 0,
            "status": "🔴 BELOW_EXPECTATIONS" if avg_resolution < 40 else "🟡 NEEDS_IMPROVEMENT" if avg_resolution < 70 else "🟢 ON_TRACK"
        },
        "red_flags": [
            flag for flag in [
                "Unspent funds" if (total_allocated - total_spent) > (total_allocated * 0.3) else None,
                "Low resolution rate" if avg_resolution < 30 else None,
                "Slow fund release" if total_released < (total_allocated * 0.5) else None,
            ] if flag is not None
        ]
    }


@router.get("/tenders")
async def list_tenders(
    state_id: Optional[int] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List government tenders and contracts."""
    query = db.query(SpendingEvidence)\
        .filter(SpendingEvidence.source_type == "tender")

    if state_id:
        query = query.filter(SpendingEvidence.applicable_state_id == state_id)

    tenders = query.order_by(SpendingEvidence.extracted_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return tenders


@router.get("/projects")
async def list_projects(
    state_id: Optional[int] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List government projects by location and category."""
    query = db.query(SpendingEvidence)\
        .filter(SpendingEvidence.source_type == "project")

    if state_id:
        query = query.filter(SpendingEvidence.applicable_state_id == state_id)

    projects = query.order_by(SpendingEvidence.amount_allocated.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return projects


@router.get("/audits")
async def list_audits(
    state_id: Optional[int] = None,
    scheme_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List CAG and other audit findings."""
    query = db.query(SpendingEvidence)\
        .filter(SpendingEvidence.source_type == "audit")

    if state_id:
        query = query.filter(SpendingEvidence.applicable_state_id == state_id)

    if scheme_id:
        query = query.filter(SpendingEvidence.scheme_id == scheme_id)

    audits = query.order_by(SpendingEvidence.extracted_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return audits


@router.get("/spending-gaps")
async def identify_spending_gaps(
    state_id: Optional[int] = None,
    financial_year: Optional[str] = None,
    min_allocation_crores: int = Query(10, ge=1)
):
    """Identify schemes with high allocation but low outcome/spending.

    Helps identify potential inefficiencies or misuse.
    """
    # TODO: Implement spending anomaly detection
    # - High allocation, low spending
    # - High allocation, low resolution rate
    # - Mismatched allocation vs expenditure patterns
    return {
        "message": "Spending gap analysis coming in Phase 2",
        "filters": {
            "state_id": state_id,
            "financial_year": financial_year,
            "min_allocation_crores": min_allocation_crores
        }
    }
