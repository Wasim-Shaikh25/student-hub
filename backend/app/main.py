from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/..")

from config.settings import settings
from config.database import engine, Base
from models.models import User

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="India's Civic Accountability Platform - Evidence-First Government Spending Tracking",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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
