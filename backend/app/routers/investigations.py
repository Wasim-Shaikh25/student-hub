from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from config.database import get_db
from models.models import Analysis, NewsArticle
from schemas.schemas import AnalysisResponse, AnalysisDetailResponse
from app.middleware.auth_middleware import get_optional_user

router = APIRouter(prefix="/api/v1/investigations", tags=["investigations"])


@router.get("")
async def list_analyses(
    verdict: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List published investigations."""
    query = db.query(Analysis).filter(Analysis.published_at.isnot(None))

    if verdict:
        query = query.filter(Analysis.verdict == verdict)

    total = query.count()
    analyses = query.order_by(Analysis.published_at.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return {
        "items": analyses,
        "total": total,
        "page": page,
        "per_page": per_page
    }


@router.get("/{analysis_id}", response_model=AnalysisDetailResponse)
async def get_analysis_detail(analysis_id: int, db: Session = Depends(get_db)):
    """Get detailed investigation with claims and evidence."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    if not analysis.published_at:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analysis not yet published"
        )

    return analysis


@router.get("/article/{article_id}", response_model=AnalysisResponse)
async def get_article_analysis(article_id: int, db: Session = Depends(get_db)):
    """Get analysis for a specific article."""
    article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )

    analysis = db.query(Analysis).filter(Analysis.article_id == article_id).first()

    if not analysis or not analysis.published_at:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No published analysis found for this article"
        )

    return analysis
