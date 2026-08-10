# CivicAudit Platform - Complete Features Overview

## Platform Architecture

CivicAudit is a comprehensive civic accountability platform that combines three core features to track government performance, citizen issues, and news verification through evidence-based analysis.

```
┌─────────────────────────────────────────────────────────────┐
│                    CivicAudit Platform                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐ │
│  │  1. CIVIC CASES  │  │ 2. GOVERNMENT    │  │ 3. NEWS    │ │
│  │    (Issues)      │  │    SPENDING DATA │  │ INVESTIG.  │ │
│  └──────────────────┘  └──────────────────┘  └────────────┘ │
│         ▲                       ▲                    ▲        │
│         │                       │                    │        │
│         └───────────┬───────────┴────────────────────┘        │
│                     │                                         │
│              PostgreSQL Database                              │
│              (with PostGIS for mapping)                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature 1: Civic Cases (Issues Reporting)

### Purpose
Enable citizens, NGOs, and experts to report and track government service failures, infrastructure issues, and civic problems with evidence.

### Frontend Pages

#### `/` - Home Page
- Dashboard showing case statistics
- Recent cases feed
- Category breakdown
- Call to action for reporting issues

#### `/discover` - Browse Cases
- Search and filter cases by:
  - Category (Health, Education, Infrastructure, Water & Electricity, etc.)
  - Status (Draft, Evidence Review, Confirmed, Investigating, etc.)
  - State/Location
- View case cards with:
  - Title and description
  - Status badge
  - Affected people count
  - Evidence count
  - Resolution confidence meter

#### `/raise` - Create New Case
- Form to report a civic issue:
  - Title and detailed description
  - Category selection
  - State selection (dropdown)
  - Estimated affected people
  - Upload evidence (photos, documents, videos)
- Evidence uploaded as FormData to backend
- Case status starts as "draft"

#### `/cases/[id]` - Case Details
- Full case information:
  - Title, description, category
  - Status timeline with confidence meter
  - Creator information
  - Location/state details
  - Estimated affected people
  
- **Evidence Section**:
  - All uploaded evidence files
  - Evidence type labels (photo, document, video, etc.)
  - Verification state badges
  - File links and descriptions

- **Comments Section**:
  - User comments and discussions
  - Expert comment designation
  - Comment timestamps
  - Add new comment form

- **Confirmation Section**:
  - Buttons for "I am affected" and "Issue is resolved"
  - Confirmation counts
  - Shows who confirmed

- **Resolution Confidence**:
  - Calculated from confirmations
  - Visual progress meter (0-100%)
  - Color-coded status

### Backend API Endpoints

#### Issues Management
- `POST /api/v1/issues` - Create new case
- `GET /api/v1/issues` - List cases with filters
- `GET /api/v1/issues/{id}` - Get case details
- `PUT /api/v1/issues/{id}` - Update case
- `DELETE /api/v1/issues/{id}` - Delete case (draft only)

#### Evidence
- `POST /api/v1/issues/{id}/evidence` - Upload evidence
- `GET /api/v1/issues/{id}/evidence` - List evidence for case

#### Comments
- `GET /api/v1/issues/{id}/comments` - List comments
- `POST /api/v1/issues/{id}/comments` - Add comment

#### Confirmations
- `POST /api/v1/issues/{id}/confirm` - Add affected/resolved confirmation
- `GET /api/v1/issues/{id}/confirmations` - List confirmations

### Database Models

```sql
CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  description TEXT,
  category VARCHAR(50),
  status VARCHAR(50),           -- draft, evidence_review, confirmed, investigating, etc.
  resolution_confidence NUMERIC, -- 0-100%
  created_by_id INTEGER,         -- User who reported
  created_at TIMESTAMP,
  state_id INTEGER,              -- Geography reference
  estimated_affected_people INTEGER,
  visibility VARCHAR(50),        -- draft, public
  is_featured BOOLEAN
);

CREATE TABLE civic_evidence (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER,              -- Link to case
  uploaded_by_id INTEGER,        -- User who uploaded
  evidence_type VARCHAR(50),     -- photo, document, video
  file_url VARCHAR(2000),        -- S3 or storage URL
  verification_state VARCHAR(50),-- submitted, verified, rejected
  created_at TIMESTAMP
);

CREATE TABLE confirmations (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER,
  user_id INTEGER,
  confirmation_type VARCHAR(50), -- affected, resolved
  created_at TIMESTAMP
);

CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER,
  user_id INTEGER,
  text TEXT,
  is_expert_comment BOOLEAN,
  created_at TIMESTAMP
);
```

### User Roles Involved
- **Citizens**: Report issues, upload evidence, confirm impact
- **Experts**: Verify evidence, provide expert comments
- **NGOs**: Track systemic issues across regions
- **Moderators**: Review and verify evidence quality

---

## Feature 2: Indian Government Spending Data

### Purpose
Track government budget allocation, actual spending, and link civic issues to government spending programs to understand resource allocation and identify mismatches.

### Frontend Integration

#### Spending Context Display
- Shown on case detail pages
- Displays:
  - Allocated budget for related schemes
  - Actual spending data
  - Financial year comparison
  - Source and authority (Government of India data)

#### Spending Evidence Cards
- Government scheme information
- Budget allocation vs. actual spending
- Confidence score (data quality)
- Links to official government documents

### Backend API Endpoints

#### Spending Data
- `GET /api/v1/spending` - List spending records
- `GET /api/v1/issues/{id}/spending` - Get spending context for an issue
- Search by scheme name, financial year, state

### Database Models

```sql
CREATE TABLE spending_evidence (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER,              -- Link to civic issue (optional)
  source_type VARCHAR(50),       -- budget, pfms, tender, audit, project
  source_name VARCHAR(255),      -- Government portal name
  scheme_id VARCHAR(255),        -- Government scheme code
  scheme_name VARCHAR(500),      -- Scheme name (e.g., PMAY, NREGA)
  scheme_aliases JSONB,          -- Alternative names
  financial_year VARCHAR(10),    -- "2024-25"
  
  -- Financial data (in paise for precision)
  amount_allocated BIGINT,
  amount_released BIGINT,
  amount_spent BIGINT,
  currency VARCHAR(3),           -- INR
  
  -- Geography
  applicable_state_id INTEGER,
  applicable_district_id INTEGER,
  
  -- Data quality
  raw_data_hash VARCHAR(255),
  extracted_at TIMESTAMP,
  government_published_at TIMESTAMP,
  data_confidence NUMERIC,       -- 0-100%
  
  -- Linking to issues
  linked_at TIMESTAMP,
  link_confidence NUMERIC,       -- How confident is the link to civic issue
  linked_by_id INTEGER           -- User who made the link
);
```

### Key Features

1. **Scheme Tracking**
   - Track multiple government schemes
   - Budget vs. actual spending comparison
   - Financial year analysis

2. **Geographic Mapping**
   - State-level data
   - District-level breakdowns
   - Location-based issue correlation

3. **Data Provenance**
   - Track data source
   - Government publication date
   - Last verified date
   - Confidence scores

4. **Issue Linking**
   - Connect civic issues to spending programs
   - Identify resource allocation problems
   - Track if promised funds actually reached

### Data Sources
- Government of India budgets
- Public Financial Management System (PFMS)
- Tender portals
- Audit reports
- Project tracking systems

---

## Feature 3: News Investigations (InTruth)

### Purpose
Provide evidence-based fact-checking and analysis of news articles related to government performance, public services, and civic issues to combat misinformation.

### Frontend Pages

#### `/investigations` - Investigations List
- Grid view of all published investigations
- Verdict filtering buttons:
  - All
  - ✅ Supported (evidence confirms the claim)
  - ⚠️ Misleading (presented without context)
  - ❌ Contradicted (evidence conflicts)
  - ❓ Unverified (insufficient evidence)

- Investigation cards show:
  - Headline
  - Verdict badge (color-coded)
  - Summary text
  - Confidence meter (0-100%)
  - Source count
  - Publication date

#### `/investigations/[id]` - Detailed Investigation
- **Header Section**:
  - News article headline
  - Verdict badge with color coding
  - Confidence score with progress bar
  - Quality assessment

- **Analysis Summary**:
  - Executive summary
  - Detailed explanation
  - Quality metrics:
    - Quality score (0-100%)
    - Conflicting sources flag
    - Missing citations flag

- **Key Claims Section**:
  - Individual claims from article
  - Supporting/contradicting evidence for each claim
  - Evidence relation type (supports, contradicts, context)
  - Evidence excerpt quotes

- **Complete Sources**:
  - All evidence sources listed
  - Source type badges (primary source, news, research, government document)
  - Authority score (0-100%)
  - Relevance score (0-100%)
  - Recency score (0-100%)
  - Links to original sources (opens in new tab)

- **Original Article Reference**:
  - Source/publication name
  - Link to original article
  - Publication date

### Backend API Endpoints

#### Investigations
- `GET /api/v1/investigations` - List published analyses
  - Optional filter: ?verdict=supported|misleading|contradicted|unverified
  - Pagination: ?page=1&per_page=20
  
- `GET /api/v1/investigations/{analysis_id}` - Get detailed investigation
  - Returns full analysis with all claims and evidence

- `GET /api/v1/investigations/article/{article_id}` - Get analysis for article

### Database Models

```sql
CREATE TABLE news_articles (
  id SERIAL PRIMARY KEY,
  source VARCHAR(255),           -- Publication name (e.g., "The Hindu", "BBC")
  title VARCHAR(500),            -- Article headline
  url VARCHAR(2000) UNIQUE,      -- Original article URL
  published_at TIMESTAMP,        -- When published
  summary TEXT,                  -- Article summary
  article_hash VARCHAR(255),     -- For deduplication
  status VARCHAR(50),            -- ingested, selected, analyzed, published
  created_at TIMESTAMP
);

CREATE TABLE claims (
  id SERIAL PRIMARY KEY,
  article_id INTEGER,            -- Link to article
  claim_text TEXT,               -- Specific factual claim
  importance VARCHAR(50),        -- high, medium, low
  status VARCHAR(50),            -- pending, analyzed, verified
  created_at TIMESTAMP
);

CREATE TABLE news_evidence (
  id SERIAL PRIMARY KEY,
  claim_id INTEGER,              -- Link to claim being verified
  url VARCHAR(2000),             -- Evidence source URL
  title VARCHAR(500),            -- Source title
  source_type VARCHAR(50),       -- primary_source, news, research, government_document
  published_at TIMESTAMP,
  excerpt TEXT,                  -- Relevant quote from source
  relation VARCHAR(50),          -- supports, contradicts, context, insufficient
  
  -- Evidence scoring
  source_authority_score NUMERIC,  -- 0-1 (trustworthiness)
  relevance_score NUMERIC,         -- 0-1 (how related to claim)
  recency_score NUMERIC,           -- 0-1 (how current)
  
  created_at TIMESTAMP
);

CREATE TABLE analyses (
  id SERIAL PRIMARY KEY,
  article_id INTEGER UNIQUE,    -- One analysis per article
  verdict VARCHAR(50),          -- supported, misleading, contradicted, unverified
  confidence NUMERIC,           -- 0-1 confidence score
  summary TEXT,                 -- Executive summary
  detailed_explanation TEXT,    -- Full analysis
  quality_score NUMERIC,        -- 0-1 overall quality
  conflicting_sources BOOLEAN,  -- Whether sources disagree
  missing_citations BOOLEAN,    -- Whether some claims lack citations
  published_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE analysis_sources (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER,
  evidence_id INTEGER,
  UNIQUE(analysis_id, evidence_id)
);
```

### Verdict Categories

1. **SUPPORTED** ✅
   - Strong evidence directly supports the claim
   - Multiple credible sources confirm
   - Primary sources validate
   - High confidence score

2. **MISLEADING** ⚠️
   - Real fact but presented without important context
   - Numbers accurate but implications wrong
   - Selective presentation of data
   - Medium confidence that claim is misleading

3. **CONTRADICTED** ❌
   - Reliable evidence directly conflicts with claim
   - Primary sources contradict
   - Expert consensus disagrees
   - High confidence in contradiction

4. **UNVERIFIED** ❓
   - Insufficient reliable evidence found
   - Lack of primary sources
   - Claim too recent or too vague
   - Unable to determine truth value

### Evidence Quality Scoring

Each evidence source scored on:

- **Source Authority (0-1)**
  - Primary sources (Government docs, official stats): 0.9-1.0
  - Reputable news organizations: 0.7-0.9
  - Academic research: 0.8-0.95
  - Opinion pieces: 0.3-0.6
  - Social media: 0.0-0.3

- **Relevance (0-1)**
  - Directly addresses claim: 0.9-1.0
  - Partially related: 0.5-0.8
  - Tangentially related: 0.2-0.4
  - Unrelated: 0.0

- **Recency (0-1)**
  - Published within 1 month: 0.9-1.0
  - Within 1 year: 0.7-0.9
  - Within 5 years: 0.4-0.7
  - Older than 5 years: 0.0-0.4
  - (Adjusted for topic relevance)

### Integration with n8n Pipeline

The system is designed to work with n8n for background processing:

1. **News Ingestion**
   - Scheduled trigger (1-2x daily)
   - Fetch from RSS feeds or news APIs
   - Extract article metadata

2. **Deduplication**
   - Check article URL against database
   - Compare normalized title/hash
   - Skip duplicates

3. **Candidate Filtering**
   - LLM selects articles with verifiable claims
   - Rules-based filtering
   - Relevance to civic/government topics

4. **Claim Extraction**
   - LLM extracts 3-5 key factual claims
   - Score claim importance
   - Mark for analysis

5. **Evidence Search**
   - Generate search queries for each claim
   - Prioritize primary sources
   - Capture snippets and relevance

6. **Evidence Ranking**
   - Score by authority, relevance, recency
   - Identify conflicting sources
   - Flag insufficient evidence

7. **Analysis**
   - LLM compares evidence to claims
   - Classify relation (supports/contradicts/context)
   - Generate verdict reasoning

8. **Quality Gate**
   - Check confidence level
   - Verify evidence quality
   - Reject low-confidence analyses

9. **Publishing**
   - Save to database
   - Mark published_at timestamp
   - Notify API consumers

### News Sources
- Indian news publications (Hindu, Times of India, etc.)
- International news (BBC, Reuters, etc.)
- Government official statements
- Press releases and bulletins

---

## How The Three Features Work Together

### Example: Water Supply Issue Investigation

```
1. CIVIC CASE
   ├─ Citizen reports: "No clean water in Village X for 3 months"
   ├─ Evidence: Photos of dry pipes, water testing results
   ├─ 47 people confirm they're affected
   └─ Resolution confidence: 23% (still ongoing)

2. GOVERNMENT SPENDING
   ├─ Link to Jal Jeevan Mission budget
   ├─ Allocated: ₹2 Crore for the state
   ├─ Released: ₹1.5 Crore
   ├─ Spent: ₹0.8 Crore
   └─ Question: Why only 53% utilization?

3. NEWS INVESTIGATION
   ├─ Article: "State completes water supply targets"
   ├─ Claims:
   │  ├─ "100% coverage achieved"
   │  └─ "All villages have clean water"
   ├─ Evidence found:
   │  ├─ Government press release says targets met
   │  ├─ But civic reports show 47 affected people
   │  └─ Spending data shows funds not fully utilized
   └─ Verdict: MISLEADING ⚠️
      (Targets reported as met but ground reality differs)
```

### Data Flow

```
Citizens → Upload Cases & Evidence
          ↓
     Database → Analyzed by Moderators
          ↓
    Spending Data ← Linked to Government Programs
          ↓
    News Articles → Fact-checked Against Evidence
          ↓
    Investigations Published → Inform Public & Policy
```

---

## Mobile Responsiveness

All three features are fully responsive:

✅ **Cases**
- Responsive grid/list layouts
- Touch-friendly buttons
- Readable on 320px+ screens
- Optimized evidence gallery

✅ **Spending Data**
- Compact financial displays
- Collapsible details
- Horizontal scroll for tables if needed

✅ **Investigations**
- Card-based layouts on mobile
- Filterable verdict buttons
- Readable evidence sections
- External links open in new tabs

---

## Technology Stack

### Frontend
- Next.js 14 (React 18)
- TypeScript for type safety
- Tailwind CSS for styling
- Shadcn/ui components
- Responsive mobile-first design

### Backend
- FastAPI (Python)
- PostgreSQL with PostGIS
- SQLAlchemy ORM
- Pydantic for validation
- JWT authentication

### Infrastructure
- Docker containerization
- Environment-based configuration
- CORS enabled for frontend
- S3 storage for evidence files
- Redis for caching (optional)

---

## User Roles & Permissions

### Citizens
- Report civic issues
- Upload evidence
- Comment on cases
- Confirm impact (affected/resolved)
- View all public information

### Experts
- All citizen permissions +
- Expert comment designation
- Evidence verification authority
- Investigation reviewing (future)

### NGOs
- All citizen permissions +
- Track systemic issues
- Bulk reporting capabilities
- Impact analysis tools

### Moderators
- All NGO permissions +
- Evidence verification
- Content moderation
- User management
- Data quality oversight

### Admins
- Full system access
- Database management
- User role assignment
- System configuration
- Analytics dashboard

---

## Security & Privacy

- JWT-based authentication
- Password hashing (bcrypt)
- PII detection in evidence (redaction support)
- User data encryption
- HTTPS enforcement
- CORS validation
- Input validation & sanitization
- SQL injection prevention (ORM)
- Rate limiting on APIs

---

## Future Enhancements

### Phase 2 - Enhanced Analytics
- Trend analysis across issues
- Regional hotspot detection
- Budget utilization visualization
- Government response tracking

### Phase 3 - AI Integration
- Automated claim extraction
- Evidence quality scoring
- Duplicate detection
- Predictive resolution modeling

### Phase 4 - Community Features
- Issue crowdfunding
- Expert marketplace
- Media partnerships
- Citizen journalism tools

### Phase 5 - Government Integration
- Direct integration with government portals
- Automated budget data updates
- Government response tracking
- Policy impact measurement

---

## Summary

CivicAudit combines three powerful features:

1. **Civic Cases**: Bottom-up reporting of government service failures
2. **Government Spending**: Top-down tracking of budget allocation
3. **News Investigations**: Third-party verification of claims

Together, they create a comprehensive accountability ecosystem that empowers citizens, tracks resources, and combats misinformation about public services and government performance in India.
