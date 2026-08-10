# studentshub POC v1 — Requirements

**Goal:** Deliver a working, demo-ready proof-of-concept of the studentshub platform backed by PostgreSQL/PostGIS, with email/password registration for students and environment-based super admin login. Social login (Google, Apple, Facebook) is explicitly out of scope for the POC.

**Scope:** Core case-creation, evidence, discovery, confirmation, comment, and moderation flows. Everything else is deferred.

---

## 1. In Scope

### 1.1 Infrastructure

- PostgreSQL 15+ with PostGIS extension running via `docker-compose.yml`.
- Backend starts without import or dependency errors (`JSONB`, `numpy`/`shapely` compatibility).
- Frontend builds without TypeScript/ESLint errors.
- Environment-based configuration for DB, JWT, CORS, and super admin credentials.

### 1.2 Authentication & Users

- **Super admin seeding:** On startup the backend reads `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_MOBILE`, and `SUPER_ADMIN_PASSWORD` from the environment, hashes the password, and creates a `User` with role `admin` if one does not already exist.
- **Super admin login:** A dedicated `POST /api/v1/auth/admin-login` endpoint accepts email/mobile and password, verifies against the seeded admin record, and returns a JWT access token.
- **Student registration:** `POST /api/v1/auth/register` accepts `email`, `display_name`, `password`, and `phone`. It validates email uniqueness, hashes the password, and returns the user **and** a JWT access token so the frontend can log the user in immediately.
- **Student login:** `POST /api/v1/auth/login` accepts email and password and returns a JWT.
- **Current user:** `GET /api/v1/auth/me` returns the current user from the JWT.
- **JWT enforcement:** All write endpoints (create issue, upload evidence, add confirmation, comment, moderation actions) must derive `user_id` from the JWT and enforce ownership/role checks.
- **Frontend auth forms:** Simple, clean forms for student register/login and a separate super admin login form. No Google / Apple / Facebook buttons.

### 1.3 Case (Issue) Lifecycle

- **Create case:** Authenticated students can create a case with title, description, category, state, district/optional location, and estimated affected people. At least one evidence file is required at creation time.
- **Status values (backend):** `draft` → `evidence_review` → `confirmed_problem` → `investigating` → `awaiting_response` → `partially_resolved` → `mostly_resolved` → `resolved` → `reopened`.
- **Moderation:** Super admin can review the moderation queue and update an issue's status and visibility (`public` / `draft` / `hidden`).
- **Public discovery:** Only issues with `visibility = public` appear on the home feed and discover page.
- **My cases:** Authenticated students see cases they created.

### 1.4 Evidence

- Evidence is mandatory for case creation. The frontend disables submit until at least one file is selected; the backend rejects a case with no evidence.
- Evidence files are uploaded as multipart/form-data, stored locally in `storage/evidence/issue_{id}` for the POC, and linked to the case.
- Accepted evidence types: `photo`, `document`, `video`, `official_letter`, `receipt`, `screenshot`, `other`.
- Evidence returns `file_url` to the frontend.

### 1.5 Confirmations & Resolution

- Authenticated students can confirm they are `affected` or that the issue is `resolved`.
- Confirmations are idempotent per user and type.
- `resolution_confidence = (resolved_count / affected_count) * 100`, capped at 100.
- When `resolution_confidence` reaches a configurable threshold (`RESOLVED_CONFIDENCE_THRESHOLD`, default 75) and at least `MIN_RESOLUTION_CONFIRMATIONS` (default 2) resolved confirmations exist, the case auto-transitions to `resolved`.

### 1.6 Comments

- Authenticated users can add comments to a case.
- Comment authors can edit or delete their own comments.
- Super admin can delete any comment.

### 1.7 Frontend Pages

- `/` — home feed with recently resolved and latest public cases.
- `/discover` — filterable public case list (category, status, state).
- `/raise` — authenticated case creation with mandatory file upload.
- `/cases/[id]` — case detail with evidence, comments, confirmation buttons, resolution percentage.
- `/cases` — “My Cases” for the logged-in user.
- `/login` and `/register` — student auth forms.
- `/admin/login` and `/admin` — super admin login and moderation dashboard.
- `/profile` — simple read-only profile.

### 1.8 Admin Dashboard

- Super admin logs in via `/admin/login`.
- Dashboard shows: moderation queue (cases pending review), list of public/under-review cases, users, and a simple audit log.
- Admin can change case status and visibility.

---

## 2. Explicitly Out of Scope

- Google, Apple, Facebook OAuth.
- Email verification / SMTP.
- Real government data ingestion (`spending` router stays as stubs or read-only demo data).
- S3 / external object storage (local disk only for POC).
- Advanced analytics, AI, notifications, mobile app.
- `Follow` / `Report` / `ExpertProfile` (case joining/following and reporting are deferred).
- Payment, legal workflows, government official portal.

---

## 3. Data Models (POC)

Use the existing SQLAlchemy models with the following simplifications:

- `User` — roles limited to `student` and `admin` for the POC.
- `Issue` — mandatory evidence enforced at creation.
- `CivicEvidence` — linked to `Issue`; `file_url` returned to frontend.
- `Confirmation` — `confirmation_type` in `affected`, `resolved`.
- `Comment` — linked to `Issue` and `User`.
- `AuditLog` — append-only records for admin actions.

All other models remain for future use.

---

## 4. API Contract (Frontend ↔ Backend)

- List endpoints return `{ items: [...], total: int }`.
- Detail endpoints return the object directly.
- Auth endpoints return `{ access_token, token_type, user }`.
- Error responses use `{ detail: string }`.
- Status strings must match the backend enum (`draft`, `confirmed_problem`, `resolved`, etc.).

---

## 5. Environment Variables

New variables added for the POC:

```bash
# Super admin (auto-created on startup)
SUPER_ADMIN_EMAIL=admin@studentshub.local
SUPER_ADMIN_MOBILE=+91-0000000000
SUPER_ADMIN_PASSWORD=change-me-in-production

# Resolution auto-transition thresholds
RESOLVED_CONFIDENCE_THRESHOLD=75
MIN_RESOLUTION_CONFIRMATIONS=2
```

Existing variables keep their meaning (`DATABASE_URL`, `SECRET_KEY`, `ALLOWED_ORIGINS`, etc.).

---

## 6. Success Criteria

1. `docker compose up` brings up Postgres, backend, and frontend.
2. A student can register, log in, raise a case with evidence, and see it on Discover after an admin approves it.
3. A student can confirm affected/resolved; the case resolution percentage updates and auto-resolves at threshold.
4. A super admin can log in with env credentials and approve/reject/hide cases.
5. `npm run build` and `pytest` pass locally.

---

*Version 1.0 — POC*
