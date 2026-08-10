# News Investigations Feature (InTruth)

## Overview

The News Investigations feature (codenamed "InTruth") adds evidence-based analysis of news claims to the CivicAudit platform. This feature allows the platform to publish investigations of news articles with verified evidence, expert assessments, and verdict verdicts.

## Architecture

### Backend Components

#### Database Models (`backend/models/models.py`)

1. **NewsArticle** - Stores metadata of news articles being investigated
   - source: The news outlet/publication
   - title: Headline
   - url: Original article URL
   - published_at: Publication date
   - article_hash: Hash for deduplication
   - status: ingested, selected, analyzed, published

2. **Claim** - Individual factual claims extracted from articles
   - article_id: Foreign key to NewsArticle
   - claim_text: The specific claim being investigated
   - importance: high, medium, low
   - status: pending, analyzed, verified

3. **NewsEvidence** - Evidence supporting or contradicting claims
   - claim_id: Foreign key to Claim
   - url: Source URL
   - title: Source title
   - source_type: primary_source, news, research, government_document
   - relation: supports, contradicts, context, insufficient
   - Scoring fields: source_authority_score, relevance_score, recency_score

4. **Analysis** - Published investigation result
   - article_id: Foreign key to NewsArticle
   - verdict: supported, misleading, contradicted, unverified
   - confidence: 0-1 score
   - summary: Executive summary
   - detailed_explanation: Full analysis
   - quality_score: Evidence quality assessment
   - conflicting_sources: Boolean flag
   - missing_citations: Boolean flag

5. **AnalysisSource** - Many-to-many relationship between Analysis and NewsEvidence

#### API Endpoints (`backend/app/routers/investigations.py`)

- `GET /api/v1/investigations` - List published investigations with optional verdict filter
- `GET /api/v1/investigations/{analysis_id}` - Get detailed investigation with claims and evidence
- `GET /api/v1/investigations/article/{article_id}` - Get analysis for specific article

#### Pydantic Schemas (`backend/schemas/schemas.py`)

- `NewsEvidenceResponse` - Evidence data serialization
- `ClaimResponse` - Claim data with related evidence
- `NewsArticleResponse` - Article metadata
- `AnalysisResponse` - Published analysis summary
- `AnalysisDetailResponse` - Full analysis with claims and all evidence

### Frontend Components

#### Components (`frontend/components/investigation-card.tsx`)

**InvestigationCard** - Displays investigation summary
- Shows headline, verdict badge, summary
- Confidence meter visualization
- Source count and publication date
- Interactive link to detailed page

#### Pages

**Investigations Index** (`frontend/app/investigations/page.tsx`)
- Lists all published analyses
- Verdict filtering buttons (All, Supported, Misleading, Contradicted, Unverified)
- Responsive grid layout with investigation cards

**Investigation Detail** (`frontend/app/investigations/[id]/page.tsx`)
- Full investigation view with:
  - Headline and verdict badge with color coding
  - Confidence and quality metrics
  - Executive summary and detailed explanation
  - Key claims section with supporting evidence
  - Complete source listing with authority/relevance/recency scores
  - Original article reference

#### Query Functions (`frontend/lib/queries.ts`)

- `getInvestigations(filters)` - Fetch list of analyses
- `getInvestigationById(id)` - Fetch detailed analysis

### Navigation Integration

Updated `frontend/components/nav.tsx` to include "Investigations" link in main navigation menu

## Verdict Categories

1. **SUPPORTED** - Strong evidence directly supports the claim
2. **MISLEADING** - Real fact presented without important context or with inaccurate implication
3. **CONTRADICTED** - Reliable evidence directly conflicts with claim
4. **UNVERIFIED** - Insufficient reliable evidence found

## Evidence Quality Rules

The system prioritizes evidence in this order:
1. Primary sources (government documents, official statistics, court orders)
2. Reputable reporting (news from established outlets)
3. Research and studies
4. Government or corporate documents

Each evidence item is scored on:
- **Source Authority (0-1)**: Trustworthiness of the source
- **Relevance (0-1)**: How directly related to the claim
- **Recency (0-1)**: How current the evidence is

## Analysis Quality Assessment

Analyses are evaluated on:
- **Quality Score (0-1)**: Overall quality based on evidence gathered
- **Conflicting Sources**: Whether different sources disagree
- **Missing Citations**: Whether some claims lack direct citations

## Integration with n8n (Background Processing)

The feature is designed to work with n8n for background analysis:

1. **News Ingestion**: n8n fetches articles from RSS feeds
2. **Deduplication**: Check for existing articles in database
3. **Filtering**: Select articles containing verifiable factual claims
4. **Claim Extraction**: LLM extracts 3-5 important claims per article
5. **Evidence Search**: AI search finds relevant sources
6. **Evidence Ranking**: Score sources by authority and relevance
7. **Analysis**: LLM compares evidence to claims
8. **Verdict Generation**: Produce verdict with explanation
9. **Quality Gate**: Reject low-confidence analyses
10. **Publishing**: Save to database for frontend display

## Database Schema

### Migration File
`backend/migrations/002_news_investigations.sql` creates:
- news_articles table
- claims table
- news_evidence table
- analyses table
- analysis_sources junction table

All tables include appropriate indexes for performance.

## Frontend Type System

All API responses are properly typed using Pydantic models and TypeScript interfaces for type safety throughout the application.

## Future Enhancements (Phase 2)

- Multiple Indian news sources
- Primary-source document retrieval
- Contradiction detection across outlets
- Source reliability history tracking
- Human/editor review queue
- User-submitted claims for investigation
- Investigation comments and social sharing
- API caching to reduce search costs
- Investigation embedding/sharing on social feed

## Mobile Responsiveness

All investigation pages are mobile-friendly:
- Responsive grid layouts
- Touch-friendly verdict buttons
- Readable typography on small screens
- Optimized evidence presentation
- Proper spacing and padding

## Usage Example

### Viewing Investigations
1. Navigate to `/investigations` from main menu
2. View cards with investigation summaries
3. Click any card to see detailed analysis
4. Review claims and evidence with source links

### Analysis Display
- Color-coded verdict badges
- Confidence meters
- Quality scores
- Source authority ratings
- Full evidence excerpts with links
- Original article reference

## Implementation Notes

- No dependencies on third-party investigation services
- All evidence URLs are external links (respects copyright)
- Supports multiple evidence sources per claim
- Handles conflicting evidence gracefully
- Scalable database schema with proper indexing
