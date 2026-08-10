from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Float, BigInteger, JSON, Enum, UniqueConstraint, Index, func, Numeric
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime
from enum import Enum as PyEnum
from config.database import Base


class IssueStatus(str, PyEnum):
    DRAFT = "draft"
    EVIDENCE_REVIEW = "evidence_review"
    CONFIRMED_PROBLEM = "confirmed_problem"
    INVESTIGATING = "investigating"
    AWAITING_RESPONSE = "awaiting_response"
    PARTIALLY_RESOLVED = "partially_resolved"
    MOSTLY_RESOLVED = "mostly_resolved"
    RESOLVED = "resolved"
    REOPENED = "reopened"


class ConfirmationType(str, PyEnum):
    AFFECTED = "affected"
    RESOLVED = "resolved"
    WITNESSED = "witnessed"


class EvidenceVerificationState(str, PyEnum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    OFFICIAL_SOURCE = "official_source"
    EXPERT_VERIFIED = "expert_verified"
    DISPUTED = "disputed"
    REJECTED = "rejected"


class UserRole(str, PyEnum):
    CITIZEN = "citizen"
    EXPERT = "expert"
    NGO = "ngo"
    JOURNALIST = "journalist"
    GOVERNMENT_OFFICIAL = "government_official"
    MODERATOR = "moderator"
    ADMIN = "admin"


class AnalysisVerdict(str, PyEnum):
    SUPPORTED = "supported"
    MISLEADING = "misleading"
    CONTRADICTED = "contradicted"
    UNVERIFIED = "unverified"


# ======================== USERS ========================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=True)
    display_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)

    role = Column(String(50), default=UserRole.CITIZEN, nullable=False)

    # Location
    state_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=True)
    location_point = Column(Geometry("POINT", 4326), nullable=True)

    verification_status = Column(String(50), default="unverified")  # unverified, email_verified, phone_verified, expert_verified

    bio = Column(Text, nullable=True)
    avatar_url = Column(String(2000), nullable=True)

    is_active = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)
    ban_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active_at = Column(DateTime, nullable=True)

    # Relationships
    issues = relationship("Issue", back_populates="created_by", foreign_keys="Issue.created_by_id")
    evidence = relationship("CivicEvidence", back_populates="uploaded_by", foreign_keys="CivicEvidence.uploaded_by_id")
    confirmations = relationship("Confirmation", back_populates="user")
    state = relationship("GeographyHierarchy", foreign_keys=[state_id])

    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )


# ======================== GEOGRAPHY ========================
class GeographyHierarchy(Base):
    __tablename__ = "geography_hierarchy"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    level = Column(String(50), nullable=False)  # state, district, block, ward, constituency
    parent_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=True)

    official_code = Column(String(100), nullable=True, index=True)
    geometry = Column(Geometry("MULTIPOLYGON", 4326), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    children = relationship("GeographyHierarchy", remote_side=[id], foreign_keys=[parent_id], back_populates="parent")
    parent = relationship("GeographyHierarchy", remote_side=[parent_id], foreign_keys=[parent_id], back_populates="children")

    __table_args__ = (
        UniqueConstraint("level", "official_code", name="uq_level_code"),
        Index("ix_geography_level_name", "level", "name"),
    )


# ======================== ISSUES ========================
class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, index=True)  # infrastructure, health, education, water, etc.

    status = Column(String(50), default=IssueStatus.DRAFT, nullable=False, index=True)
    resolution_confidence = Column(Numeric(5, 2), default=0)  # 0-100%

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Geography
    state_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=False)
    district_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=True)
    block_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=True)
    ward_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=True)

    location_point = Column(Geometry("POINT", 4326), nullable=True)

    # Metadata
    estimated_affected_people = Column(Integer, nullable=True)
    visibility = Column(String(50), default="draft")  # public, draft, private
    is_featured = Column(Boolean, default=False)

    moderation_notes = Column(Text, nullable=True)
    moderated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    moderated_at = Column(DateTime, nullable=True)

    # Relationships
    created_by = relationship("User", back_populates="issues", foreign_keys=[created_by_id])
    moderated_by = relationship("User", foreign_keys=[moderated_by_id])

    evidence = relationship("CivicEvidence", back_populates="issue", cascade="all, delete-orphan")
    confirmations = relationship("Confirmation", back_populates="issue", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="issue", cascade="all, delete-orphan")
    spending_evidence = relationship("SpendingEvidence", back_populates="issue")
    government_claims = relationship("GovernmentClaim", back_populates="issue")
    timeline_events = relationship("ResolutionEvent", back_populates="issue", cascade="all, delete-orphan")

    state = relationship("GeographyHierarchy", foreign_keys=[state_id])
    district = relationship("GeographyHierarchy", foreign_keys=[district_id])

    __table_args__ = (
        Index("ix_issues_status_created", "status", "created_at"),
        Index("ix_issues_state_category", "state_id", "category"),
    )


# ======================== EVIDENCE ========================
class CivicEvidence(Base):
    __tablename__ = "civic_evidence"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    evidence_type = Column(String(50), nullable=False)  # photo, document, video, expert_analysis, audit_report

    file_url = Column(String(2000), nullable=True)
    file_hash = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)

    verification_state = Column(String(50), default=EvidenceVerificationState.SUBMITTED)
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verification_notes = Column(Text, nullable=True)
    verified_at = Column(DateTime, nullable=True)

    visibility_level = Column(String(50), default="public")  # public, private, registered_only
    is_sensitive_pii = Column(Boolean, default=False)
    redaction_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    flagged_at = Column(DateTime, nullable=True)
    flag_reason = Column(Text, nullable=True)

    # Relationships
    issue = relationship("Issue", back_populates="evidence")
    uploaded_by = relationship("User", back_populates="evidence", foreign_keys=[uploaded_by_id])
    verified_by = relationship("User", foreign_keys=[verified_by_id])

    __table_args__ = (
        Index("ix_evidence_issue_type", "issue_id", "evidence_type"),
        Index("ix_evidence_verification", "verification_state", "verified_at"),
    )


# ======================== SPENDING EVIDENCE ========================
class SpendingEvidence(Base):
    __tablename__ = "spending_evidence"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=True)

    source_type = Column(String(50), nullable=False)  # budget, pfms, tender, audit, project
    source_name = Column(String(255), nullable=False)
    source_url = Column(String(2000), nullable=True)
    source_document_id = Column(String(255), nullable=True)

    scheme_id = Column(String(255), nullable=True, index=True)
    scheme_name = Column(String(500), nullable=True)
    scheme_aliases = Column(JSON, nullable=True)  # Array of alternative names

    financial_year = Column(String(10), nullable=False)  # "2024-25"

    # Financial data (in paise)
    amount_allocated = Column(BigInteger, nullable=True)
    amount_released = Column(BigInteger, nullable=True)
    amount_spent = Column(BigInteger, nullable=True)
    currency = Column(String(3), default="INR")

    # Geography
    applicable_state_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=True)
    applicable_district_id = Column(Integer, ForeignKey("geography_hierarchy.id"), nullable=True)

    # Provenance
    raw_data_hash = Column(String(255), nullable=True)
    raw_data_path = Column(String(2000), nullable=True)  # S3 path
    extracted_at = Column(DateTime, default=datetime.utcnow)
    government_published_at = Column(DateTime, nullable=True)
    last_verified_at = Column(DateTime, nullable=True)
    data_confidence = Column(Numeric(5, 2), default=100)  # 0-100

    # Linking
    linked_at = Column(DateTime, nullable=True)
    link_confidence = Column(Numeric(5, 2), default=0)  # 0-100
    linked_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    issue = relationship("Issue", back_populates="spending_evidence")
    linked_by = relationship("User", foreign_keys=[linked_by_id])
    state = relationship("GeographyHierarchy", foreign_keys=[applicable_state_id])
    district = relationship("GeographyHierarchy", foreign_keys=[applicable_district_id])

    __table_args__ = (
        UniqueConstraint("source_document_id", "scheme_id", "financial_year", name="uq_spending_source"),
        Index("ix_spending_scheme_year", "scheme_id", "financial_year"),
    )


# ======================== CONFIRMATIONS ========================
class Confirmation(Base):
    __tablename__ = "confirmations"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    confirmation_type = Column(String(50), nullable=False)  # affected, resolved, witnessed
    description = Column(Text, nullable=True)

    verified_by_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    issue = relationship("Issue", back_populates="confirmations")
    user = relationship("User", back_populates="confirmations")

    __table_args__ = (
        UniqueConstraint("issue_id", "user_id", "confirmation_type", name="uq_confirmation"),
        Index("ix_confirmations_issue_type", "issue_id", "confirmation_type"),
    )


# ======================== GOVERNMENT CLAIMS ========================
class GovernmentClaim(Base):
    __tablename__ = "government_claims"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)

    claim_text = Column(Text, nullable=False)
    claim_date = Column(DateTime, nullable=True)
    claimed_by = Column(String(255), nullable=True)  # Ministry, Department, Official

    source_document_id = Column(String(255), nullable=True)
    source_url = Column(String(2000), nullable=True)

    status = Column(String(50), nullable=False)  # unverified, verified, disputed, contradicted
    verification_status = Column(Text, nullable=True)
    verification_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    issue = relationship("Issue", back_populates="government_claims")

    __table_args__ = (
        Index("ix_claims_status", "status", "issue_id"),
    )


# ======================== RESOLUTION EVENTS ========================
class ResolutionEvent(Base):
    __tablename__ = "resolution_events"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)

    event_type = Column(String(50), nullable=False)  # status_change, evidence_added, confirmation_added, claim_made, outcome_verified
    event_description = Column(Text, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    issue = relationship("Issue", back_populates="timeline_events")
    created_by = relationship("User", foreign_keys=[created_by_id])


# ======================== COMMENTS ========================
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    text = Column(Text, nullable=False)
    is_expert_comment = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    flagged_at = Column(DateTime, nullable=True)
    flag_reason = Column(Text, nullable=True)

    # Relationships
    issue = relationship("Issue", back_populates="comments")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("ix_comments_issue_created", "issue_id", "created_at"),
    )


# ======================== NEWS INVESTIGATIONS ========================
class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(255), nullable=False)
    title = Column(String(500), nullable=False, index=True)
    url = Column(String(2000), nullable=False, unique=True, index=True)
    published_at = Column(DateTime, nullable=True)
    summary = Column(Text, nullable=True)

    article_hash = Column(String(255), nullable=True, unique=True)
    status = Column(String(50), default="ingested")  # ingested, selected, analyzed, published

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    claims = relationship("Claim", back_populates="article", cascade="all, delete-orphan")
    analysis = relationship("Analysis", back_populates="article", uselist=False)

    __table_args__ = (
        Index("ix_articles_status_created", "status", "created_at"),
    )


class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("news_articles.id"), nullable=False)

    claim_text = Column(Text, nullable=False)
    importance = Column(String(50), default="medium")  # high, medium, low
    status = Column(String(50), default="pending")  # pending, analyzed, verified

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    article = relationship("NewsArticle", back_populates="claims")
    evidence_items = relationship("NewsEvidence", back_populates="claim", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_claims_article_status", "article_id", "status"),
    )


class NewsEvidence(Base):
    __tablename__ = "news_evidence"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=False)

    url = Column(String(2000), nullable=False)
    title = Column(String(500), nullable=False)
    source_type = Column(String(50), nullable=False)  # primary_source, news, research, government_document
    published_at = Column(DateTime, nullable=True)

    excerpt = Column(Text, nullable=True)
    relation = Column(String(50), nullable=False)  # supports, contradicts, context, insufficient

    source_authority_score = Column(Numeric(3, 2), default=0)  # 0-1
    relevance_score = Column(Numeric(3, 2), default=0)  # 0-1
    recency_score = Column(Numeric(3, 2), default=0)  # 0-1

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    claim = relationship("Claim", back_populates="evidence_items")
    analysis_sources = relationship("AnalysisSource", back_populates="evidence")

    __table_args__ = (
        Index("ix_evidence_claim_relation", "claim_id", "relation"),
    )


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("news_articles.id"), nullable=False, unique=True)

    verdict = Column(String(50), nullable=False)  # supported, misleading, contradicted, unverified
    confidence = Column(Numeric(3, 2), default=0)  # 0-1

    summary = Column(Text, nullable=False)
    detailed_explanation = Column(Text, nullable=True)

    quality_score = Column(Numeric(3, 2), default=0)  # 0-1 based on evidence quality
    conflicting_sources = Column(Boolean, default=False)
    missing_citations = Column(Boolean, default=False)

    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    article = relationship("NewsArticle", back_populates="analysis")
    sources = relationship("AnalysisSource", back_populates="analysis", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_analyses_verdict_created", "verdict", "created_at"),
    )


class AnalysisSource(Base):
    __tablename__ = "analysis_sources"

    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=False)
    evidence_id = Column(Integer, ForeignKey("news_evidence.id"), nullable=False)

    # Relationships
    analysis = relationship("Analysis", back_populates="sources")
    evidence = relationship("NewsEvidence", back_populates="analysis_sources")

    __table_args__ = (
        UniqueConstraint("analysis_id", "evidence_id", name="uq_analysis_evidence"),
        Index("ix_analysis_sources_analysis", "analysis_id"),
    )


# ======================== AUDIT LOG ========================
class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)

    changes = Column(JSON, nullable=True)

    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    performed_at = Column(DateTime, default=datetime.utcnow, index=True)

    ip_address = Column(String(45), nullable=True)

    # Relationships
    performed_by = relationship("User", foreign_keys=[performed_by_id])

    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id", "performed_at"),
    )
