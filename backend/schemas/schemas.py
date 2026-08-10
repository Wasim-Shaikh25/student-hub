from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


# ======================== USER SCHEMAS ========================
class UserCreate(BaseModel):
    email: EmailStr
    display_name: str
    password: str = Field(min_length=8)
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    role: str
    verification_status: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None


# ======================== GEOGRAPHY SCHEMAS ========================
class GeographyResponse(BaseModel):
    id: int
    name: str
    level: str
    official_code: Optional[str] = None

    class Config:
        from_attributes = True


# ======================== EVIDENCE SCHEMAS ========================
class EvidenceCreate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    evidence_type: str
    file_url: Optional[str] = None
    visibility_level: str = "public"


class EvidenceResponse(BaseModel):
    id: int
    issue_id: int
    evidence_type: str
    title: Optional[str] = None
    description: Optional[str] = None
    verification_state: str
    created_at: datetime
    uploaded_by: UserResponse

    class Config:
        from_attributes = True


# ======================== SPENDING EVIDENCE SCHEMAS ========================
class SpendingEvidenceResponse(BaseModel):
    id: int
    source_type: str
    source_name: str
    scheme_name: Optional[str] = None
    scheme_id: Optional[str] = None
    financial_year: str

    amount_allocated: Optional[int] = None
    amount_released: Optional[int] = None
    amount_spent: Optional[int] = None

    data_confidence: Decimal
    link_confidence: Optional[Decimal] = None
    extracted_at: datetime

    class Config:
        from_attributes = True


# ======================== CONFIRMATION SCHEMAS ========================
class ConfirmationCreate(BaseModel):
    confirmation_type: str  # affected, resolved, witnessed
    description: Optional[str] = None


class ConfirmationResponse(BaseModel):
    id: int
    confirmation_type: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ======================== GOVERNMENT CLAIM SCHEMAS ========================
class GovernmentClaimCreate(BaseModel):
    claim_text: str
    claim_date: Optional[datetime] = None
    claimed_by: Optional[str] = None
    source_url: Optional[str] = None


class GovernmentClaimResponse(BaseModel):
    id: int
    claim_text: str
    status: str
    claim_date: Optional[datetime] = None
    claimed_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ======================== COMMENT SCHEMAS ========================
class CommentCreate(BaseModel):
    text: str


class CommentResponse(BaseModel):
    id: int
    text: str
    user: UserResponse
    created_at: datetime
    is_expert_comment: bool

    class Config:
        from_attributes = True


# ======================== ISSUE SCHEMAS ========================
class IssueCreate(BaseModel):
    title: str
    description: str
    category: str
    state_id: int
    district_id: Optional[int] = None
    block_id: Optional[int] = None
    ward_id: Optional[int] = None
    estimated_affected_people: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    estimated_affected_people: Optional[int] = None


class IssueDetailResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    status: str
    resolution_confidence: Decimal

    created_by: UserResponse
    created_at: datetime
    updated_at: datetime

    # Evidence
    evidence: List[EvidenceResponse] = []

    # Spending context
    spending_evidence: List[SpendingEvidenceResponse] = []

    # Confirmations summary
    total_affected_confirmations: Optional[int] = None
    total_resolved_confirmations: Optional[int] = None

    # Government claims
    government_claims: List[GovernmentClaimResponse] = []

    # Comments
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True


class IssueListResponse(BaseModel):
    id: int
    title: str
    category: str
    status: str
    resolution_confidence: Decimal

    created_by: UserResponse
    created_at: datetime

    total_affected_confirmations: Optional[int] = None
    estimated_affected_people: Optional[int] = None

    class Config:
        from_attributes = True


class IssueListFilters(BaseModel):
    category: Optional[str] = None
    status: Optional[str] = None
    state_id: Optional[int] = None
    district_id: Optional[int] = None
    page: int = 1
    per_page: int = 20


# ======================== RESOLUTION SUMMARY ========================
class ResolutionSummary(BaseModel):
    affected_count: int
    resolved_count: int
    partially_resolved_count: int
    still_affected_count: int
    resolution_confidence: Decimal


# ======================== SPENDING CONTEXT ========================
class SpendingContext(BaseModel):
    schemes: List[SpendingEvidenceResponse] = []
    projects: List[SpendingEvidenceResponse] = []
    tenders: List[SpendingEvidenceResponse] = []
    audits: List[SpendingEvidenceResponse] = []
    last_updated: datetime
    data_quality: str  # high, medium, low


# ======================== ADMIN SCHEMAS ========================
class AdminIssueModeration(BaseModel):
    status: str
    moderation_notes: Optional[str] = None
    visibility: str


class AdminEvidenceReview(BaseModel):
    verification_state: str
    verification_notes: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    performed_by: Optional[UserResponse] = None
    performed_at: datetime

    class Config:
        from_attributes = True


# ======================== AUTH SCHEMAS ========================
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None
