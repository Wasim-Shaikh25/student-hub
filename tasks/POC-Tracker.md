# studentshub POC v1 — Implementation Tracker

This tracker covers the focused proof-of-concept described in `docs/specs/POC-Requirements-v1.md`.

---

## Foundation

| # | Task | Acceptance Criteria | Status |
|---|------|---------------------|--------|
| F1 | Create `docs/specs/POC-Requirements-v1.md` and `tasks/POC-Tracker.md` | Documents merged to POC branch | in-progress |
| F2 | Update `backend/.env.example` and `docker-compose.yml` for super admin + Postgres | `SUPER_ADMIN_*` variables documented; `docker compose config` valid | pending |
| F3 | Pin `numpy<2` and fix `JSONB` import in `backend/models/models.py` | `python -c "import app.main"` succeeds; `pytest` collects | pending |
| F4 | Seed initial reference data (categories, states) | API returns categories and states; frontend dropdowns populated | pending |

## Authentication & Users

| # | Task | Acceptance Criteria | Status |
|---|------|---------------------|--------|
| A1 | Implement env-based super admin auto-creation at startup | Admin user created if missing with email/mobile from env | pending |
| A2 | Add `POST /api/v1/auth/admin-login` | Returns token for valid env admin credentials; 401 otherwise | pending |
| A3 | Update `POST /api/v1/auth/register` to return access token | Response includes `access_token`, `token_type`, `user` | pending |
| A4 | Fix `GET /api/v1/auth/me` | Returns current user from JWT | pending |
| A5 | Enforce JWT on all write endpoints and add ownership checks | No endpoint accepts a `user_id` parameter; `get_current_user` injected | pending |
| A6 | Restrict roles for POC to `student` and `admin` | Registration creates `student`; admin is seeded only from env | pending |

## Backend Business Logic

| # | Task | Acceptance Criteria | Status |
|---|------|---------------------|--------|
| B1 | Make evidence mandatory on case creation | `POST /issues` rejects request with no evidence files | pending |
| B2 | Validate `IssueUpdate`/`AdminIssueModeration` status and visibility against enums | Unknown status strings rejected | pending |
| B3 | Implement resolution auto-transition | At threshold + min confirmations, status moves to `resolved` | pending |
| B4 | Add ownership checks to evidence verify/redact/delete | Only admin or uploader can mutate evidence | pending |
| B5 | Add ownership checks to comments | Users can edit/delete own; admin can delete any | pending |
| B6 | Add ownership check to confirmation delete | Only the confirming user can withdraw | pending |
| B7 | Standardize list response shape | All list endpoints return `{ items, total }` | pending |
| B8 | Fix `spending.py` `budget-vs-outcome` `TypeError` | Router no longer crashes on load | pending |

## Frontend

| # | Task | Acceptance Criteria | Status |
|---|------|---------------------|--------|
| FE1 | Fix `formatDate` and build errors | `npx tsc --noEmit` and `npm run build` pass | pending |
| FE2 | Remove Google/Apple/Facebook social login UI | Login/register forms show email/password only | pending |
| FE3 | Simplify registration form | Fields: email, display_name, phone, password | pending |
| FE4 | Add super admin login page at `/admin/login` | Admin can log in and get a session | pending |
| FE5 | Align API client with backend response shapes | `result.items`, `file_url`, `user` object used correctly | pending |
| FE6 | Wire home/discover feeds with backend status/visibility filters | Resolved and latest public cases display correctly | pending |
| FE7 | Wire case creation with mandatory evidence | Form disables submit until files selected; backend enforces it | pending |
| FE8 | Wire case detail: evidence gallery, comments, confirmations | Buttons work; resolution percentage updates | pending |
| FE9 | Build `/cases` “My Cases” page | Shows cases created by the logged-in student | pending |
| FE10 | Build `/admin` dashboard | Moderation queue, case status/visibility update | pending |

## Integration & Validation

| # | Task | Acceptance Criteria | Status |
|---|------|---------------------|--------|
| I1 | Update `frontend/lib/types.ts` to match backend enums | `CaseStatus`, `UserRole`, etc. aligned | pending |
| I2 | Run backend `pytest` and frontend `npm run build` | Both exit 0 | pending |
| I3 | Manual end-to-end demo | Student register → login → raise case → admin approve → discover shows case → confirm resolved | pending |
| I4 | Open PR and verify Netlify preview | PR green or failures documented as pre-existing | pending |

---

## Deferred (post-POC)

- OAuth (Google/Apple/Facebook)
- Email verification / SMTP
- S3 / virus scan / PII redaction for evidence
- `Follow`, `Report`, `ExpertProfile` entities
- Real government spending data ingestion
- Mobile app / PWA
- Notifications and background jobs
