from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from fastapi.encoders import jsonable_encoder

from config.database import get_db
from models.models import Analysis, NewsArticle
from app.middleware.auth_middleware import get_optional_user

router = APIRouter(prefix="/api/v1/investigations", tags=["investigations"])


def _serialize_evidence(evidence):
    return {
        "id": evidence.id,
        "url": evidence.url,
        "title": evidence.title,
        "source_type": evidence.source_type,
        "published_at": evidence.published_at,
        "excerpt": evidence.excerpt,
        "relation": evidence.relation,
        "source_authority_score": float(evidence.source_authority_score) if evidence.source_authority_score is not None else 0.0,
        "relevance_score": float(evidence.relevance_score) if evidence.relevance_score is not None else 0.0,
        "recency_score": float(evidence.recency_score) if evidence.recency_score is not None else 0.0,
        "created_at": evidence.created_at,
    }


def _serialize_claim(claim):
    return {
        "id": claim.id,
        "claim_text": claim.claim_text,
        "importance": claim.importance,
        "status": claim.status,
        "evidence_items": [_serialize_evidence(item) for item in (claim.evidence_items or [])],
    }


def _serialize_article(article):
    return {
        "id": article.id,
        "source": article.source,
        "title": article.title,
        "url": article.url,
        "published_at": article.published_at,
        "summary": article.summary,
        "status": article.status,
        "created_at": article.created_at,
    }


def _serialize_analysis(analysis, detail=False):
    # sources are AnalysisSource association rows; the evidence is on .evidence
    sources = []
    for source in (analysis.sources or []):
        if source.evidence:
            sources.append(_serialize_evidence(source.evidence))

    data = {
        "id": analysis.id,
        "article": _serialize_article(analysis.article),
        "verdict": analysis.verdict,
        "confidence": float(analysis.confidence) if analysis.confidence is not None else 0.0,
        "summary": analysis.summary,
        "detailed_explanation": analysis.detailed_explanation,
        "quality_score": float(analysis.quality_score) if analysis.quality_score is not None else 0.0,
        "conflicting_sources": analysis.conflicting_sources,
        "missing_citations": analysis.missing_citations,
        "published_at": analysis.published_at,
        "created_at": analysis.created_at,
        "sources": sources,
    }

    if detail:
        data["claims"] = [_serialize_claim(claim) for claim in (analysis.article.claims or [])]

    return data


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
        "items": [jsonable_encoder(_serialize_analysis(a)) for a in analyses],
        "total": total,
        "page": page,
        "per_page": per_page
    }


@router.get("/{analysis_id}")
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

    return jsonable_encoder(_serialize_analysis(analysis, detail=True))


@router.get("/article/{article_id}")
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

    return jsonable_encoder(_serialize_analysis(analysis))
