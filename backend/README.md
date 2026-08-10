# CivicAudit Backend

FastAPI backend for CivicAudit - India's civic accountability platform.

## Project Structure

```
backend/
├── app/                          # FastAPI application
│   ├── main.py                   # Main app entry point
│   └── routers/                  # API route handlers
│       ├── auth.py              # Authentication endpoints
│       ├── issues.py            # Issue management endpoints
│       ├── evidence.py          # Evidence upload/verification
│       ├── spending.py          # Government spending data
│       └── admin.py             # Admin operations
├── config/                       # Configuration
│   ├── settings.py              # Environment settings
│   └── database.py              # Database configuration
├── models/                       # SQLAlchemy models
│   └── models.py                # Data models
├── schemas/                      # Pydantic schemas
│   └── schemas.py               # Request/response schemas
├── services/                     # Business logic
│   ├── auth_service.py          # Authentication logic
│   ├── issue_service.py         # Issue operations
│   ├── spending_service.py      # Government data integration
│   └── evidence_service.py      # Evidence handling
├── repositories/                # Data access layer (optional, for complex queries)
├── migrations/                   # Database migrations
│   └── 001_initial_schema.sql   # Initial schema
├── tests/                        # Test suite
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment template
└── README.md                    # This file
```

## Setup Instructions

### 1. Prerequisites

- Python 3.11+
- PostgreSQL 12+
- PostGIS extension for PostgreSQL
- Redis (for Celery tasks, optional)

### 2. Install PostgreSQL & PostGIS

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib postgis
```

**macOS (via Homebrew):**
```bash
brew install postgresql postgis
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### 3. Create Database

```bash
# Start PostgreSQL
sudo service postgresql start  # Linux
# or
brew services start postgresql  # macOS

# Create database
createdb civic_audit

# Enable PostGIS
psql -d civic_audit -c "CREATE EXTENSION postgis;"
```

### 4. Setup Python Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### 5. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env  # or use your editor
```

Key settings to update:
- `DATABASE_URL=postgresql://user:password@localhost:5432/civic_audit`
- `SECRET_KEY=your-secret-key-change-in-production`
- AWS S3 credentials (if using S3 for evidence storage)

### 6. Run Database Migrations

```bash
# Apply initial schema
psql -d civic_audit -f migrations/001_initial_schema.sql

# Or use Alembic for version control
# alembic upgrade head
```

### 7. Start Development Server

```bash
# From backend directory with venv activated
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server will be available at: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints (Phase 1)

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get token
- `GET /api/v1/auth/me` - Get current user

### Issues
- `POST /api/v1/issues` - Create new issue
- `GET /api/v1/issues` - List issues (with filters)
- `GET /api/v1/issues/{id}` - Get issue detail
- `PUT /api/v1/issues/{id}` - Update issue
- `DELETE /api/v1/issues/{id}` - Delete issue
- `GET /api/v1/issues/{id}/spending` - Get spending context

### Evidence
- `POST /api/v1/issues/{id}/evidence` - Upload evidence
- `GET /api/v1/issues/{id}/evidence` - Get all evidence
- `PUT /api/v1/evidence/{id}` - Verify/reject evidence

### Confirmations
- `POST /api/v1/issues/{id}/confirm` - Confirm affected/resolved
- `GET /api/v1/issues/{id}/confirmations` - Get confirmations

### Government Claims
- `POST /api/v1/issues/{id}/claims` - Add government claim
- `PUT /api/v1/claims/{id}` - Verify/dispute claim

## Data Model

### Core Entities

**User**
- Email, name, phone, role
- Verification status
- Geographic location

**Issue**
- Title, description, category
- Status, resolution confidence
- Geographic hierarchy (state → district → block → ward)
- Created by, moderated by

**Evidence** (from Citizens)
- Type (photo, document, video, etc.)
- Verification state
- File storage (S3)
- PII flagging

**SpendingEvidence** (Government Data)
- Source (budget, PFMS, tender, audit, project)
- Scheme, allocation, release, expenditure
- Fiscal year, geographic scope
- Data confidence score

**Confirmation** (Citizens Verify Outcomes)
- Type: affected, resolved, witnessed
- Aggregated for resolution percentage

**GovernmentClaim**
- Claim text, claimed by, date
- Verification status (unverified, verified, disputed, contradicted)

**ResolutionEvent**
- Timeline of status changes
- Evidence additions
- Confirmations

## Database Queries

### Find Issues in a District with Spending Data

```sql
SELECT i.id, i.title, i.status, i.resolution_confidence,
       COUNT(DISTINCT ce.id) as evidence_count,
       COUNT(DISTINCT se.id) as spending_records
FROM issues i
LEFT JOIN civic_evidence ce ON ce.issue_id = i.id
LEFT JOIN spending_evidence se ON se.issue_id = i.id
WHERE i.district_id = 123 AND i.status != 'draft'
GROUP BY i.id
ORDER BY i.created_at DESC;
```

### Get Resolution Metrics by Category

```sql
SELECT 
    i.category,
    COUNT(*) as total_issues,
    COUNT(CASE WHEN i.status = 'resolved' THEN 1 END) as resolved,
    AVG(i.resolution_confidence) as avg_confidence
FROM issues i
WHERE i.visibility = 'public'
GROUP BY i.category;
```

### Find Spending Anomalies (High Allocation, Low Outcomes)

```sql
SELECT 
    se.scheme_name,
    se.amount_allocated / 100::float as allocated_crores,
    COUNT(DISTINCT i.id) as linked_issues,
    AVG(i.resolution_confidence) as avg_resolution_rate
FROM spending_evidence se
LEFT JOIN issues i ON se.issue_id = i.id
WHERE se.financial_year = '2024-25'
GROUP BY se.scheme_id
HAVING AVG(i.resolution_confidence) < 40
ORDER BY se.amount_allocated DESC;
```

## Development Guidelines

### Adding New Endpoint

1. Create schema in `schemas/schemas.py`
2. Create models in `models/models.py` (if needed)
3. Add business logic in `services/`
4. Create route in `app/routers/`
5. Import and include router in `app/main.py`

### Error Handling

All endpoints should return proper HTTP status codes:
- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Auth required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Testing

```bash
# Run tests (once tests are added)
pytest

# With coverage
pytest --cov=app
```

## Common Issues

### PostGIS Extension Not Found
```bash
psql -d civic_audit -c "CREATE EXTENSION postgis;"
```

### Database Connection Error
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running
- Check credentials and database name

### Port 8000 Already in Use
```bash
# Use different port
uvicorn app.main:app --reload --port 8001
```

## Performance Considerations

- Database queries are indexed on frequently filtered columns (status, created_at, category, geography)
- PostGIS geometry columns support spatial queries
- Implement pagination for list endpoints (default 20 per page, max 100)
- Cache geographic hierarchies after first load
- Use connection pooling (default 10 connections, max 20)

## Next Steps

1. **Implement JWT middleware** for proper authentication
2. **Add evidence upload service** (S3 integration)
3. **Implement data ingestion** (government data connectors)
4. **Add geographic snapping** (PostGIS queries)
5. **Build admin dashboard** API endpoints
6. **Implement search** (full-text search)
7. **Add analytics** endpoints
8. **Setup monitoring** (logging, error tracking)

## Contributing

- Follow PEP 8 style guide
- Add type hints to all functions
- Write docstrings for complex logic
- Test new features before committing

## License

[To be added]
