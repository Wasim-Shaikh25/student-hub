from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

from config.settings import settings
from config.database import engine, Base, SessionLocal
from services.auth_service import create_admin_user
from models.models import (
    GeographyHierarchy,
    SpendingEvidence,
    NewsArticle,
    Claim,
    NewsEvidence,
    Analysis,
    AnalysisSource,
    CivicEvidence,
)
from datetime import datetime, timedelta

# Create tables
Base.metadata.create_all(bind=engine)


def seed_geography():
    db = SessionLocal()
    try:
        states = [
            (1, "Maharashtra", "state"),
            (2, "Tamil Nadu", "state"),
            (3, "Karnataka", "state"),
            (4, "Uttar Pradesh", "state"),
            (5, "Bihar", "state"),
            (6, "Rajasthan", "state"),
            (7, "Madhya Pradesh", "state"),
            (8, "Gujarat", "state"),
            (9, "West Bengal", "state"),
            (10, "Punjab", "state"),
        ]
        for state_id, name, level in states:
            existing = db.query(GeographyHierarchy).filter(GeographyHierarchy.id == state_id).first()
            if not existing:
                db.add(GeographyHierarchy(id=state_id, name=name, level=level))
        db.commit()
    finally:
        db.close()


seed_geography()


def seed_demo_data():
    """Seed demo schemes and news investigations for the POC."""
    db = SessionLocal()
    try:
        # Demo government schemes (budget evidence)
        schemes = [
            {
                "source_name": "Union Budget 2024-25",
                "scheme_id": "mid-day-meal",
                "scheme_name": "Mid-Day Meal Scheme",
                "scheme_aliases": ["MDM", "School Meal Programme"],
                "financial_year": "2024-25",
                "amount_allocated": 1450000000000,
                "amount_released": 980000000000,
                "amount_spent": 720000000000,
                "applicable_state_id": 1,
                "source_type": "budget",
                "data_confidence": 95,
            },
            {
                "source_name": "Union Budget 2024-25",
                "scheme_id": "samagra-shiksha",
                "scheme_name": "Samagra Shiksha Abhiyan",
                "scheme_aliases": ["SSA", "Integrated School Education"],
                "financial_year": "2024-25",
                "amount_allocated": 3750000000000,
                "amount_released": 2900000000000,
                "amount_spent": 2450000000000,
                "applicable_state_id": 2,
                "source_type": "budget",
                "data_confidence": 92,
            },
            {
                "source_name": "Union Budget 2024-25",
                "scheme_id": "swachh-bharat-schools",
                "scheme_name": "Swachh Bharat Swachh Vidyalaya",
                "scheme_aliases": ["SBSV", "Clean Schools"],
                "financial_year": "2024-25",
                "amount_allocated": 120000000000,
                "amount_released": 85000000000,
                "amount_spent": 62000000000,
                "applicable_state_id": 3,
                "source_type": "budget",
                "data_confidence": 88,
            },
        ]
        for s in schemes:
            existing = db.query(SpendingEvidence).filter(
                SpendingEvidence.scheme_id == s["scheme_id"],
                SpendingEvidence.financial_year == s["financial_year"],
            ).first()
            if not existing:
                db.add(SpendingEvidence(**s))

        # Demo news investigation
        existing_article = db.query(NewsArticle).filter(NewsArticle.url == "https://example.com/demo-news").first()
        if not existing_article:
            article = NewsArticle(
                source="Example News",
                title="State claims 100% school electrification, but ground reports differ",
                url="https://example.com/demo-news",
                published_at=datetime.utcnow() - timedelta(days=7),
                summary="Official press releases say all schools have electricity, yet student submissions show power cuts in rural classrooms.",
                status="published",
            )
            db.add(article)
            db.flush()

            claim = Claim(
                article_id=article.id,
                claim_text="All government schools in the state have uninterrupted electricity.",
                importance="high",
                status="analyzed",
            )
            db.add(claim)
            db.flush()

            evidence = NewsEvidence(
                claim_id=claim.id,
                url="https://example.com/official-release",
                title="Official Press Release",
                source_type="government_document",
                relation="supports",
                excerpt="The department confirms 100% electrification of schools.",
                source_authority_score=0.7,
                relevance_score=0.9,
                recency_score=0.8,
            )
            db.add(evidence)
            db.flush()

            analysis = Analysis(
                article_id=article.id,
                verdict="misleading",
                confidence=0.75,
                summary="Official claim is overstated; on-the-ground reports show frequent outages in rural schools.",
                detailed_explanation="The press release reflects infrastructure installation but does not account for maintenance and supply reliability.",
                quality_score=0.82,
                conflicting_sources=True,
                missing_citations=False,
                published_at=datetime.utcnow() - timedelta(days=5),
            )
            db.add(analysis)
            db.flush()

            db.add(AnalysisSource(analysis_id=analysis.id, evidence_id=evidence.id))

        db.commit()
    finally:
        db.close()


seed_demo_data()


def normalize_evidence_urls():
    """Ensure legacy evidence file_url values point to the /uploads route."""
    db = SessionLocal()
    try:
        for evidence in db.query(CivicEvidence).all():
            if evidence.file_url and not evidence.file_url.startswith(("/uploads/", "http://", "https://")):
                evidence.file_url = f"/uploads/{evidence.file_url.lstrip('/')}"
                db.add(evidence)
        db.commit()
    finally:
        db.close()


normalize_evidence_urls()

app = FastAPI(
    title=settings.APP_NAME,
    description="India's Civic Accountability Platform - Evidence-First Government Spending Tracking",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


@app.on_event("startup")
def seed_super_admin():
    """Create the environment-defined super admin on startup."""
    db = SessionLocal()
    try:
        create_admin_user(db)
    finally:
        db.close()


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    return {
        "message": "CivicAudit API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "description": "India's civic accountability platform - Government spending transparency backed by citizen evidence"
    }


# Import routers
from app.routers import auth, issues, evidence, confirmations, comments, spending, admin, investigations

# Include routers
app.include_router(auth.router)
app.include_router(issues.router)
app.include_router(evidence.router)
app.include_router(confirmations.router)
app.include_router(comments.router)
app.include_router(spending.router)
app.include_router(admin.router)
app.include_router(investigations.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
