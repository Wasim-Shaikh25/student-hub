# Production Readiness Audit — student-hub / studentshub / CivicAudit

**Repository:** `Wasim-Shaikh25/student-hub`  
**Audit date:** 2026-08-10  
**Auditor:** Devin  
**Final recommendation:** **STOP — NO-GO** (do not release to production; the platform is not functional, not secure, and not deployable in its current state).

---

## 1. Executive Summary

The repository describes an evidence-first student action network (`studentshub`) and, in places, a civic-spending accountability platform (`CivicAudit`). The product goal is for students to raise education/civic problems, attach evidence, build community confirmations, and track resolution with moderation by a Super Admin.

The current codebase is a **partial backend scaffold plus a broken frontend**. It cannot be started, built, or deployed in a safe state. The most severe findings are:

1. The FastAPI backend fails at import time due to a SQLAlchemy 2.0 compatibility error, so the application and tests do not run.
2. Authentication/authorization is almost entirely unenforced: the JWT middleware exists, but every write endpoint still accepts a `user_id` query/form parameter and performs no ownership or role checks.
3. The frontend fails to compile (`next build` / `npx tsc` / `npm run lint`) and its API client expects response shapes and status values that the backend does not return.
4. Critical MVP features are missing: mandatory evidence enforcement, `Follow`, `Report`, expert profile/verification, OAuth, email, real government data ingestion, case lifecycle state machine, resolution auto-transition, and role-driven workflows.
5. Dependency scans and security checks reveal 60 Python and 5 high-severity Node.js vulnerabilities, plus hardcoded/default secrets in `docker-compose.yml` and the frontend session code.

The implementation documentation (`IMPLEMENTATION_SUMMARY.md`, `COMPLETE_FEATURES_OVERVIEW.md`) claims Phase 1-2 are complete, while `tasks/MVP-v1-Tracker.md` shows **0 of 96 tasks** started. This contradiction is documented as a process finding.

**No source code was modified during this audit.** All findings are derived from static code analysis and the validation commands recorded below.

---

## 2. Product Context and Audit Coverage

### 2.1 Product Definition

The approved specification (`docs/specs/studentshub-Requirements-v1.md`) defines an MVP v1 with the following core properties:

- **Core principle:** “No evidence, no case.”
- **Resolution principle:** “No verified outcome, no ‘Resolved.’”
- **Primary roles:** Student, Verified Expert, NGO / Association, Lawyer, Super Admin.
- **MVP P0 features:** authentication (Google, Facebook, email), home feed, case creation with mandatory evidence, case moderation queue, case detail, evidence gallery, student confirmations, resolution percentage, timeline, comments, join/follow case, Super Admin control room.
- **Out of scope for MVP:** hard-coded OAuth backend, automated truth verification, legal workflow automation, government integrations, AI-assisted evidence classification.

### 2.2 Stated Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, `iron-session` cookie sessions.
- **Backend:** FastAPI, SQLAlchemy 2.0, PostgreSQL 14+ with PostGIS, Pydantic v2, JWT (`python-jose` + `passlib`/`bcrypt`).
- **Task queue / cache:** Celery + Redis (declared, not used).
- **Object storage:** AWS S3 (declared, not implemented; files are written to local disk).
- **Deployment:** Docker Compose, Netlify (`netlify.toml` present for frontend).

### 2.3 Audit Scope

| In scope | Evidence reviewed |
|----------|-----------------|
| Full repository file tree (source, docs, configs, tests, docker files) | `find` over repo root |
| Backend routers, models, schemas, services, middleware, CLI, tests | `backend/app`, `backend/models`, `backend/schemas`, `backend/services`, `backend/tests`, `backend/cli` |
| Frontend pages, components, lib, types, config | `frontend/app`, `frontend/components`, `frontend/lib`, `frontend/*.config.*` |
| Build and test tooling | `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm audit`, `pytest`, `flake8`, `pip-audit`, `bandit` |
| Documentation and trackers | `README.md`, `docs/specs/...`, `tasks/MVP-v1-Tracker.md`, `IMPLEMENTATION_SUMMARY.md`, `COMPLETE_FEATURES_OVERVIEW.md` |

### 2.4 Out of Scope / Inaccessible

- Live production environments, cloud accounts, S3 buckets, OAuth credentials, email/SMTP servers, and government API keys.
- Real user data; only test fixtures and local storage paths were inspected.
- End-to-end browser tests could not be executed because the backend will not start and the frontend will not build.

### 2.5 Validation Baseline

All commands were run on the Devin session VM (Ubuntu, Python 3.10.12, Node 20.x). No application source files were changed.

| Check | Command(s) | Result | Notes |
|-------|-----------|--------|-------|
| Backend unit tests | `cd backend && pytest` | **Failed at collection** | `ImportError: cannot import name 'JSONB' from 'sqlalchemy'` (`backend/models/models.py:1`). Also `geoalchemy2`/`shapely` fail with NumPy 2.x unless `numpy<2` is installed. |
| Backend linter | `flake8 app config models schemas services tests --max-line-length=120` | **61 warnings** | Exits 0 but reports many unused imports/style issues. |
| Backend dependency audit | `pip-audit -r requirements.txt --format=json` | **60 known vulnerabilities** | Affecting `fastapi`, `python-dotenv`, `python-jose`, `python-multipart`, `pillow`, `pytest`, `black`, `starlette`, `urllib3`, `ecdsa`. |
| Backend security scan | `bandit -r app config models schemas services cli` | **2 findings** | `B104` bind-all-interfaces in `app/main.py:76`; `B105` hardcoded string `'bearer'` in `auth.py:49`. |
| Frontend install | `cd frontend && npm install` | Succeeded with warnings | 5 high-severity vulnerabilities reported by `npm audit`. |
| Frontend lint | `npm run lint` | **Failed** | TypeScript/ESLint errors in `app/investigations/[id]/page.tsx` and `app/investigations/page.tsx`. |
| Frontend type check | `npx tsc --noEmit` | **Failed** | Missing `formatDate` export from `frontend/lib/utils.ts`; private property `request` accessed in `frontend/lib/queries.ts:179,189`. |
| Frontend build | `npm run build` | **Failed** | Same errors as lint/type check; build cannot complete. |
| Docker Compose config | `docker compose config` | Valid but risky | Hardcoded `SECRET_KEY` and `POSTGRES_PASSWORD`; `version` attribute obsolete; `frontend/Dockerfile` does not exist. |
| Backend Docker build | `docker compose build backend` | **Failed** | Docker Hub returned `500 Internal Server Error` for `python:3.11-slim` during the audit session. |

### 2.6 Key Documentation Contradictions

- `README.md` and `docs/specs/studentshub-Requirements-v1.md` use the product name **studentshub**.
- `backend/README.md` and multiple backend files refer to the product as **CivicAudit**.
- `IMPLEMENTATION_SUMMARY.md` and `COMPLETE_FEATURES_OVERVIEW.md` claim **Phase 1-2 are complete**.
- `tasks/MVP-v1-Tracker.md` contains **96 tasks, all `- [ ]` (not started)**.

These contradictions create release and onboarding risk: it is unclear which product identity, scope, and completeness claim is authoritative.

---

## 3. Product Completeness Assessment

### 3.1 Role-to-Capability Matrix

The spec (`ROLE-001` through `ROLE-005`) defines five roles. The backend model declares seven (`citizen`, `student`, `expert`, `ngo`, `journalist`, `government_official`, `moderator`, `admin`) while the frontend types use five different labels (`Student`, `Expert`, `NGO`, `Lawyer`, `SuperAdmin`).

| Capability | Student (spec) | Backend `student`/`citizen` | Verified Expert | NGO/Association | Lawyer | Super Admin (spec) | Backend `admin` |
|------------|--------------|-----------------------------|-----------------|-----------------|--------|---------------------|-----------------|
| Register / login | Spec: P0 | `/auth/register`, `/auth/login` work; `/auth/me` returns 401 | Not implemented | Not implemented | Not implemented | Spec: P0 | CLI `create-admin` only; no frontend enforcement |
| Create case with evidence | Spec: P0 | Endpoint exists but does **not** enforce evidence or ownership | Not implemented | Not implemented | Not implemented | Spec: P0 | Can via admin API but no evidence enforcement |
| Comment | Spec: P0 | Endpoint exists; no authz/ownership | Not implemented | Not implemented | Not implemented | Spec: P0 | Endpoints exist but unprotected |
| Confirm affected / resolved | Spec: P0 | `/confirm` exists; no JWT check | N/A | N/A | N/A | N/A | N/A |
| Follow / join case | Spec: P0 | **Missing** — no `Follow` model or API | Missing | Missing | Missing | N/A | N/A |
| Upload / verify evidence | Spec: P0 | Upload works locally; verify/redact/delete lack role checks | Missing | Missing | Missing | Spec: P0 | Endpoints present but no role checks on mutations |
| Moderate cases / users | N/A | N/A | N/A | N/A | N/A | Spec: P0 | `/admin` endpoints require `get_current_moderator`/`get_current_admin` but other write paths bypass them |
| Approve expert/NGO/lawyer | N/A | N/A | N/A | N/A | N/A | Spec: P0 | **Missing** |

**Finding:** Only the most basic registration/login paths are partially implemented. Every capability involving ownership, role enforcement, or approval is either missing or unprotected.

### 3.2 Entity-to-Operation Matrix

| Entity | Create | Read | Update | Delete | Notes |
|--------|--------|------|--------|--------|-------|
| `User` | Yes (`/auth/register`) | Partial (`/auth/me` returns 401; `GET /users` admin only) | **Missing** | **Missing** | Registration does not return a token; frontend expects one. |
| `Case` / `Issue` | Yes | Yes (list/detail) | Yes | Yes (draft only) | No evidence enforcement; no ownership checks; status strings not validated against enum. |
| `Evidence` | Yes | Yes | Partial (verify/redact flags) | Yes | Local disk only; no S3, no PII scan, no content validation; mutations lack ownership/role checks. |
| `Confirmation` | Yes | Yes | N/A | Yes | Idempotent via DB constraint; no auto status transition; no ownership check on delete. |
| `Comment` | Yes | Yes | Yes | Yes / flag | All endpoints accept `user_id`; no ownership, moderation, or rate limiting. |
| `GovernmentClaim` | Yes | Yes | Yes | **Missing** | No authz. |
| `SpendingRecord` / schemes | Stub (`spending-gaps` is `pass`/TODO) | Stubs | N/A | N/A | All data is synthetic/hard-coded; real ingestion not implemented. |
| `NewsArticle` / `Investigation` | **Missing** | Yes (list/detail published) | **Missing** | **Missing** | Read-only placeholder data. |
| `Follow` | **Missing** | **Missing** | **Missing** | **Missing** | Not modeled. |
| `Report` | **Missing** | **Missing** | **Missing** | **Missing** | Not modeled despite spec `SAFETY-005`. |
| `Category`, `Institution`, `Location` | **Missing** (frontend hardcodes 10 states) | Partial (`getCategories` hardcoded; `getInstitutions`/`getLocations` return `[]`) | **Missing** | **Missing** | No backend tables or seed data. |
| `ExpertProfile` | **Missing** | **Missing** | **Missing** | **Missing** | Not modeled. |
| `AuditLog` | Yes (created on some actions) | Yes (admin endpoint) | N/A | **Must never delete** | Append-only intent, but enforced by application code only. |

### 3.3 Workflow Completeness

| Spec lifecycle stage | Backend status | Frontend status | Gap |
|----------------------|----------------|-----------------|-----|
| Draft | Partial (`status` field exists) | `case-form.tsx` enforces file selection before submit | Backend does **not** enforce mandatory evidence on `POST /issues`; mismatch means the UI guard is bypassable. |
| Evidence Review | Moderation endpoint exists but accepts arbitrary strings | No dedicated review UI | No automated or manual review workflow; evidence states not transitioned. |
| Published Case | No distinct `published` status; `visibility` field exists | Home/discover try to filter by `status='Resolved'` etc. | Status values differ between frontend and backend (`Resolved` vs `resolved`). |
| Collective Case | Confirmations exist | Case detail re-derives counts | No “join” / `Follow` capability; no collective action workflow. |
| Expert Review | **Missing** | **Missing** | No expert profile, assignment, or badge flow. |
| Action | **Missing** | **Missing** | No petitions, campaigns, or formal action tracking. |
| Authority Response | `GovernmentClaim` endpoints are stubs with no authz | No authority response UI | No official response verification workflow. |
| Resolution Verification | `Confirmation` count feeds `resolution_confidence` | Detail page displays a percentage | No configurable threshold or auto-transition to `resolved`; formula is `resolved/affected * 100` only. |

### 3.4 Dashboard and Reporting Matrix

| Dashboard / Report | Spec | Implementation | Status |
|--------------------|------|----------------|--------|
| Home feed (personalized) | `FEED-001` | `frontend/app/page.tsx` calls `getCases({ status: 'Resolved' })` with hardcoded filter | Broken — backend status string mismatch; no personalization. |
| Discover / search with filters | `FEED-002` | `frontend/app/discover/page.tsx` has a form but status/location/category values are not aligned with backend | Broken — `getLocations()` returns `[]`; status mismatch. |
| Case detail | `DETAIL-001` to `DETAIL-004` | Page exists but reads wrong response fields (`ev.url`, `comment.user_display_name`) | Broken. |
| Moderation queue | `ADMIN-002` | `GET /admin/moderation-queue` exists | Backend only; no admin UI. |
| Admin analytics dashboard | `ADMIN-007` | `GET /admin/analytics/dashboard` returns metrics | Backend only; frontend `/admin` is a placeholder. |
| Audit log view | `ADMIN-008` | `GET /admin/audit-logs` exists | Backend only. |
| User management (ban/unban) | `ADMIN-004` | Endpoints exist | Backend only; no ownership/role validation on other paths. |
| Reports on cases/evidence/comments/users | `SAFETY-005` | **Missing** | Not implemented. |
| Spending transparency / budget reports | Spending router | `spending-gaps` is a TODO; `budget-vs-outcome` contains a `TypeError` (`] \| {None}`) | Not functional. |

---

## 4. Detailed Findings

Findings are grouped by area. Severity: **Critical**, **High**, **Medium**, **Low**. Disposition: **Open — Release Blocker**, **Open — Required Before Release**, **Needs Product Decision**, **Open — Recommended**.

### 4.1 Authentication & Authorization

#### AUTH-1: Backend cannot start due to SQLAlchemy 2.0 `JSONB` import error
- **Severity:** Critical
- **Disposition:** Open — Release Blocker
- **Summary:** `backend/models/models.py` line 1 imports `JSONB` from the top-level `sqlalchemy` package. SQLAlchemy 2.0 does not expose `JSONB` at the top level; it must be imported from `sqlalchemy.dialects.postgresql`. This causes `pytest` and `python -c "import app.main"` to fail before the application can run.
- **Evidence:** `pytest` collection fails with `ImportError: cannot import name 'JSONB' from 'sqlalchemy'`.
- **Files:** `backend/models/models.py:1`, `backend/requirements.txt:3` (`sqlalchemy==2.0.23`).

#### AUTH-2: Authentication is not enforced on write endpoints
- **Severity:** Critical
- **Disposition:** Open — Release Blocker
- **Summary:** Mutating endpoints accept `user_id` as a query or form parameter and do not use the JWT dependency. Examples:
  - `backend/app/routers/issues.py` `create_issue`, `update_issue`, `delete_issue` all declare `user_id: int` with comments `# TODO: Get from JWT token`.
  - `backend/app/routers/evidence.py` `upload_evidence` uses `user_id: int = Form(...)`.
  - `backend/app/routers/confirmations.py` `add_confirmation` and `delete_confirmation` accept `user_id`.
  - `backend/app/routers/comments.py` all endpoints accept `user_id`.
- **Evidence:** Static search for `user_id: int` and `# TODO: Get from JWT token` across routers.
- **Files:** `backend/app/routers/issues.py`, `backend/app/routers/evidence.py`, `backend/app/routers/confirmations.py`, `backend/app/routers/comments.py`.

#### AUTH-3: No ownership or role checks on mutations
- **Severity:** Critical
- **Disposition:** Open — Release Blocker
- **Summary:** Because endpoints use a supplied `user_id` rather than the JWT identity, any client can create, update, delete, or verify content as any user. There is no check that the caller owns the resource or has the required role.
- **Evidence:** No `get_current_user` dependency is injected in `issues.py`, `evidence.py`, `confirmations.py`, `comments.py` write methods.
- **Files:** Same as AUTH-2.

#### AUTH-4: `/auth/me` is unimplemented and always returns 401
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** The `/auth/me` endpoint ignores the provided token and raises `401 Token validation not yet implemented` with a `TODO` comment. The frontend calls this endpoint in `getCurrentUser()` and will never obtain the current user.
- **Evidence:** `backend/app/routers/auth.py` contains the `TODO` and unconditional 401.
- **Files:** `backend/app/routers/auth.py`.

#### AUTH-5: Registration response does not include an access token
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `/auth/register` returns a `UserResponse` with no token. The frontend `register` server action stores `result.access_token`, which is `undefined`, so a newly registered user is not logged in.
- **Evidence:** `backend/app/routers/auth.py` `register` returns `user`; `frontend/lib/actions.ts` `register` does `session.accessToken = result.access_token`.
- **Files:** `backend/app/routers/auth.py`, `frontend/lib/actions.ts`.

#### AUTH-6: `get_optional_user` FastAPI dependency is invalid
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `get_optional_user` uses `Depends(security) if security else None` and `Depends(get_db) if get_db else None`. Conditional `Depends` is not valid FastAPI dependency syntax and will raise at runtime. The function is also not wired correctly.
- **Evidence:** `backend/app/middleware/auth_middleware.py`.
- **Files:** `backend/app/middleware/auth_middleware.py`.

#### AUTH-7: OAuth providers and email are not implemented
- **Severity:** High
- **Disposition:** Open — Required Before Release
- **Summary:** The spec lists Google/Facebook OAuth (`AUTH-001`, `AUTH-002`) and user profile with institution/location (`AUTH-006`) as P0. The backend schema only accepts `email`, `display_name`, `password`, `phone`; no OAuth, email verification, or progressive verification flows exist. `SMTP_*` settings are required but unused.
- **Evidence:** `backend/schemas/schemas.py` `UserCreate`, `frontend/app/register/page.tsx` collects institution/location but actions do not send them.
- **Files:** `backend/schemas/schemas.py`, `backend/config/settings.py`, `frontend/app/register/page.tsx`, `frontend/lib/actions.ts`.

#### AUTH-8: Frontend session secret has a hardcoded fallback
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `iron-session` is initialized with a default 32-character secret if `SESSION_SECRET` is not set. This is fine for local dev but dangerous if the default reaches production, because all session cookies could be forged.
- **Evidence:** `frontend/lib/session.ts` `const SESSION_SECRET = process.env.SESSION_SECRET || 'studentshub-default-secret-min-32-characters!'`.
- **Files:** `frontend/lib/session.ts`.

### 4.2 Data Integrity & Business Logic

#### DATA-1: Case creation does not enforce mandatory evidence
- **Severity:** Critical
- **Disposition:** Open — Release Blocker
- **Summary:** The spec’s core principle “No evidence, no case” is not enforced by the backend. `POST /issues` creates an issue without requiring evidence. The frontend only disables the submit button until files are selected, but a direct API call bypasses this.
- **Evidence:** `backend/app/routers/issues.py` `create_issue` creates the issue and returns it; no evidence records are created or validated.
- **Files:** `backend/app/routers/issues.py`, `frontend/components/case-form.tsx`.

#### DATA-2: Issue status and visibility are not validated against enums
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `IssueUpdate` and `AdminIssueModeration` Pydantic schemas accept plain `str` for `status` and `visibility`. The backend model defines `IssueStatus` and visibility values, but the schemas do not constrain input, so arbitrary status strings can be written.
- **Evidence:** `backend/schemas/schemas.py` `IssueUpdate`, `AdminIssueModeration`.
- **Files:** `backend/schemas/schemas.py`, `backend/app/routers/issues.py`, `backend/app/routers/admin.py`.

#### DATA-3: Resolution confidence calculation does not auto-transition status
- **Severity:** High
- **Disposition:** Open — Required Before Release
- **Summary:** `calculate_resolution_confidence` computes `(resolved_count / affected_count) * 100` but does not update `issue.status` to `resolved` when the configurable threshold is reached. The spec (`RES-006`) requires a threshold + minimum confirmation count before marking a case resolved.
- **Evidence:** `backend/app/routers/confirmations.py` `calculate_resolution_confidence`.
- **Files:** `backend/app/routers/confirmations.py`.

#### DATA-4: Status value mismatch between frontend and backend
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** Backend uses lowercase enum values (`draft`, `evidence_review`, `confirmed_problem`, … `resolved`). Frontend `CaseStatus` uses sentence-case labels (`Unverified`, `Confirmed Problem`, … `Resolved`). Discover and home filters send `Resolved`, `Mostly Resolved`, etc., which the backend does not recognize.
- **Evidence:** `frontend/lib/types.ts` `CaseStatus` enum vs `backend/models/models.py` `IssueStatus`.
- **Files:** `frontend/lib/types.ts`, `backend/models/models.py`, `frontend/app/page.tsx`, `frontend/app/discover/page.tsx`, `frontend/lib/queries.ts`.

#### DATA-5: Comment model response does not match frontend expectations
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `CommentResponse` returns a nested `user` object, but `frontend/app/cases/[id]/page.tsx` accesses `comment.user_display_name` (flat string). Comments will not render the author name.
- **Evidence:** `backend/schemas/schemas.py` `CommentResponse`, `frontend/app/cases/[id]/page.tsx`.
- **Files:** `backend/schemas/schemas.py`, `frontend/app/cases/[id]/page.tsx`.

#### DATA-6: Evidence response uses `file_url`, frontend uses `url`
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** The backend `EvidenceResponse` returns `file_url`, while the case detail page reads `ev.url`. Evidence links will be broken in the UI.
- **Evidence:** `backend/schemas/schemas.py` `EvidenceResponse`, `frontend/app/cases/[id]/page.tsx`.
- **Files:** `backend/schemas/schemas.py`, `frontend/app/cases/[id]/page.tsx`.

#### DATA-7: Frontend API client assumes `result.items` wrapper
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `frontend/lib/queries.ts` casts backend responses as `result.items`, but the backend routers return the raw list (e.g., `return issues`). The discover page, home page, and case listing will receive `undefined` for `items`.
- **Evidence:** `frontend/lib/queries.ts` `getCases`, `getCaseComments` vs `backend/app/routers/issues.py` `list_issues` and `backend/app/routers/comments.py` `list_comments`.
- **Files:** `frontend/lib/queries.ts`, `backend/app/routers/issues.py`, `backend/app/routers/comments.py`.

#### DATA-8: `getLocations` / `getInstitutions` return empty arrays
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** The discover filter and case form depend on location and institution data, but the server-side fetchers return `[]`. The case form hardcodes 10 Indian states and defaults `state_id` to `1`.
- **Evidence:** `frontend/lib/queries.ts` `getInstitutions`, `getLocations`; `frontend/components/case-form.tsx`.
- **Files:** `frontend/lib/queries.ts`, `frontend/components/case-form.tsx`.

#### DATA-9: Spending router has a runtime bug and missing implementation
- **Severity:** High
- **Disposition:** Open — Required Before Release
- **Summary:** `budget-vs-outcome` constructs `"red_flags": [...] | {None}` which is a list-or-set operation that will raise `TypeError` at runtime. `spending-gaps` is a `pass` placeholder. Data ingestion connectors are stubs that return empty lists or placeholders.
- **Evidence:** `backend/app/routers/spending.py` line 176; `backend/services/data_ingestion_service.py`.
- **Files:** `backend/app/routers/spending.py`, `backend/services/data_ingestion_service.py`.

#### DATA-10: Resolution confidence formula ignores evidence quality and official response flags
- **Severity:** Medium
- **Disposition:** Needs Product Decision
- **Summary:** The spec (`RES-003`) says resolution confidence should incorporate evidence quality, official response, independent expert verification, contradictory reports, etc. The current implementation is a raw count ratio. This may be acceptable for MVP if documented, but it does not meet the stated formula.
- **Evidence:** `backend/app/routers/confirmations.py`.
- **Files:** `backend/app/routers/confirmations.py`.

#### DATA-11: Case detail page recomputes counts from confirmations instead of using backend value
- **Severity:** Low
- **Disposition:** Open — Recommended
- **Summary:** `frontend/app/cases/[id]/page.tsx` recalculates affected/resolved counts from `confirmations` rather than reading the `resolution_confidence` field returned by the backend. This duplicates logic and may diverge from backend calculation.
- **Evidence:** `frontend/app/cases/[id]/page.tsx`.
- **Files:** `frontend/app/cases/[id]/page.tsx`.

### 4.3 Frontend Quality & API Contract

#### FE-1: Frontend build fails due to missing `formatDate` export
- **Severity:** Critical
- **Disposition:** Open — Release Blocker
- **Summary:** `frontend/lib/utils.ts` only exports `cn`. `investigation-card.tsx` and `app/investigations/[id]/page.tsx` import `formatDate`, which does not exist, causing `next build`, `npm run lint`, and `npx tsc` to fail.
- **Evidence:** Build output and TypeScript errors.
- **Files:** `frontend/lib/utils.ts`, `frontend/components/investigation-card.tsx`, `frontend/app/investigations/[id]/page.tsx`.

#### FE-2: ESLint `Unexpected any` errors block build
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `app/investigations/[id]/page.tsx` and `app/investigations/page.tsx` use `any` types, violating the project ESLint config and blocking `next build`.
- **Evidence:** `npm run lint` output.
- **Files:** `frontend/app/investigations/[id]/page.tsx`, `frontend/app/investigations/page.tsx`.

#### FE-3: Private `request` property accessed in queries
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `frontend/lib/queries.ts` accesses `client.request` and `serverClient.request`, but `request` is a private member of the generated/typed API client. `tsc --noEmit` reports this error.
- **Evidence:** `npx tsc --noEmit` output.
- **Files:** `frontend/lib/queries.ts`.

#### FE-4: Admin page is a placeholder and checks wrong role value
- **Severity:** High
- **Disposition:** Open — Required Before Release
- **Summary:** `frontend/app/admin/page.tsx` only renders “Admin features are being developed.” It checks for `SuperAdmin` (frontend type), while the backend role value is `admin`. The `/admin` route will never display admin tools.
- **Evidence:** `frontend/app/admin/page.tsx`, `backend/models/models.py` `UserRole`.
- **Files:** `frontend/app/admin/page.tsx`, `backend/models/models.py`.

#### FE-5: Follow button has no backend integration
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `frontend/components/follow-button.tsx` toggles local React state and ignores `caseId`. There is no `Follow` model or endpoint, so following a case is not persisted.
- **Evidence:** `frontend/components/follow-button.tsx`.
- **Files:** `frontend/components/follow-button.tsx`.

#### FE-6: Discover filter form does not actually filter via API
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** The discover page destructures `searchParams` and passes them to `getCases`, but the status values are sentence-cased and the location dropdown is empty. The backend `list_issues` does not parse most of these query parameters.
- **Evidence:** `frontend/app/discover/page.tsx`, `frontend/lib/queries.ts`, `backend/app/routers/issues.py`.
- **Files:** `frontend/app/discover/page.tsx`, `frontend/lib/queries.ts`, `backend/app/routers/issues.py`.

### 4.4 Security & Privacy

#### SEC-1: Dependency vulnerabilities
- **Severity:** Critical
- **Disposition:** Open — Release Blocker
- **Summary:** `pip-audit` reports 60 known CVEs across 10 Python packages, including FastAPI, Starlette, python-jose, python-multipart, Pillow, and urllib3. `npm audit` reports 5 high-severity issues, including Next.js and PostCSS.
- **Evidence:** `pip-audit -r backend/requirements.txt --format=json` and `npm audit` outputs.
- **Files:** `backend/requirements.txt`, `frontend/package.json`/`package-lock.json`.

#### SEC-2: Hardcoded/default secrets in deployment configuration
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `docker-compose.yml` hardcodes `SECRET_KEY: dev-secret-key-change-in-production` and `POSTGRES_PASSWORD: secure_password_change_me`. These are unsafe if the file is used outside a local developer machine.
- **Evidence:** `docker-compose.yml`.
- **Files:** `docker-compose.yml`.

#### SEC-3: CORS allows all methods/headers and credentials from env origins
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `backend/app/main.py` sets `allow_methods=["*"]`, `allow_headers=["*"]`, and `allow_credentials=True`. If `ALLOWED_ORIGINS` is misconfigured or includes `*`, this opens the API to cross-origin credential leakage.
- **Evidence:** `backend/app/main.py` CORS middleware.
- **Files:** `backend/app/main.py`.

#### SEC-4: Evidence stored on local disk with no content scanning or path traversal protection
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** Uploaded files are saved to `storage/evidence/issue_{id}/{file_hash}{ext}`. There is no virus scanning, file-type validation beyond the filename extension, size cap enforcement, PII detection, or S3 integration. The path is constructed from `issue_id`, which is an integer so traversal is unlikely, but content security is absent.
- **Evidence:** `backend/app/routers/evidence.py` `upload_evidence`.
- **Files:** `backend/app/routers/evidence.py`.

#### SEC-5: No rate limiting on public write endpoints
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** The spec (`SAFETY-006`) requires rate limiting for case creation, evidence upload, comments, and confirmations. No rate-limiting middleware or decorator is implemented.
- **Evidence:** No `SlowAPI`, `RateLimit`, or custom rate-limit usage in routers or `main.py`.
- **Files:** `backend/app/main.py`, all routers.

#### SEC-6: No input sanitization, spam detection, duplicate detection, or reporting system
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `SAFETY-003` (duplicate case detection), `SAFETY-004` (spam detection), `SAFETY-005` (report system), `SAFETY-007` (privacy controls), and `SAFETY-009` (moderation queue) are largely unimplemented. PII redaction is a stub flag setter.
- **Evidence:** `backend/app/routers/evidence.py` `redact_evidence`; missing `Report` model.
- **Files:** `backend/app/routers/evidence.py`, `backend/models/models.py`.

#### SEC-7: Admin endpoints do not require re-authentication for high-risk actions
- **Severity:** Medium
- **Disposition:** Needs Product Decision
- **Summary:** The spec (`SEC-005`) says admin actions require re-authentication for high-risk operations. The backend only checks `get_current_admin` once per request.
- **Evidence:** `backend/app/routers/admin.py`.
- **Files:** `backend/app/routers/admin.py`.

#### SEC-8: Audit logs are append-only only by convention
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `AuditLog` records are inserted in application code. There is no database-level append-only policy, no signing, and no tamper-evident hashing. A compromised database account can delete or alter logs.
- **Evidence:** `backend/models/models.py` `AuditLog`; `backend/app/routers/admin.py` `get_audit_logs`.
- **Files:** `backend/models/models.py`, `backend/app/routers/admin.py`.

### 4.5 Operations, Deployment & Dependencies

#### OPS-1: Frontend Dockerfile is missing
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `docker-compose.yml` references a `frontend/Dockerfile`, but the file does not exist in the repository. The `frontend` service cannot be built with Docker Compose.
- **Evidence:** `find_file_by_name frontend/Dockerfile` returned no matches; `docker-compose.yml` `frontend.build`.
- **Files:** `docker-compose.yml`, `frontend/`.

#### OPS-2: Backend Docker build failed in this environment
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `docker compose build backend` failed because Docker Hub returned `500 Internal Server Error` for `python:3.11-slim`. This may be transient, but it prevented verification of the container image in this audit.
- **Evidence:** `docker compose build backend` output.
- **Files:** `backend/Dockerfile`.

#### OPS-3: `docker-compose.yml` uses obsolete `version` attribute and a bind mount for development
- **Severity:** Low
- **Disposition:** Open — Recommended
- **Summary:** `docker-compose.yml` starts with `version: '3.8'` (obsolete in modern Compose). The backend container bind-mounts `./backend:/app` and runs with `--reload`, which is suitable for local dev but not for production.
- **Evidence:** `docker-compose.yml`.
- **Files:** `docker-compose.yml`.

#### OPS-4: No Alembic migration runner; schema is created with `Base.metadata.create_all`
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** Raw SQL migration files exist, but `main.py` uses `Base.metadata.create_all`. There is no Alembic upgrade/downgrade workflow, no idempotent seeding, and no migration validation in CI. This is not a production-grade database lifecycle.
- **Evidence:** `backend/app/main.py`, `backend/migrations/*.sql`, `backend/alembic.ini`.
- **Files:** `backend/app/main.py`, `backend/alembic.ini`, `backend/migrations/`.

#### OPS-5: No health check, observability, or backup/rollback documentation
- **Severity:** Medium
- **Disposition:** Open — Recommended
- **Summary:** There is no `Dockerfile` healthcheck, no structured logging, no metrics endpoint, no tracing, and no documented backup/restore/rollback procedure.
- **Evidence:** Search for `health`, `logging`, `backup`, `metrics` in backend; absence of `healthcheck` in `docker-compose.yml`.
- **Files:** `backend/app/main.py`, `docker-compose.yml`.

#### OPS-6: NumPy 2.x incompatibility with pinned Shapely/GeoAlchemy2
- **Severity:** Medium
- **Disposition:** Open — Required Before Release
- **Summary:** `requirements.txt` pins `shapely==2.0.2` and `geoalchemy2==0.14.1` but does not pin `numpy`. With NumPy 2.x, `geoalchemy2`/`shapely` fail with `_ARRAY_API not found`. Downgrading to `numpy<2` removes the error but is not reflected in `requirements.txt`.
- **Evidence:** `backend/requirements.txt`, `pytest` runtime errors.
- **Files:** `backend/requirements.txt`.

### 4.6 Quality & Test Coverage

#### QA-1: Test suite cannot collect and does not validate behavior
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `pytest` fails at import due to `JSONB`. Even if it could run, `tests/test_issues.py` asserts status codes `in [201, 422, 401]`, which accepts almost any outcome and does not verify functional correctness. Tests use SQLite, which is incompatible with PostGIS/JSONB/Geometry columns used in the models.
- **Evidence:** `backend/tests/test_issues.py`, `backend/tests/conftest.py`.
- **Files:** `backend/tests/test_issues.py`, `backend/tests/conftest.py`.

#### QA-2: Implementation tracker and completion docs contradict each other
- **Severity:** Medium
- **Disposition:** Needs Product Decision
- **Summary:** `IMPLEMENTATION_SUMMARY.md` and `COMPLETE_FEATURES_OVERVIEW.md` claim Phase 1-2 are complete, while `tasks/MVP-v1-Tracker.md` shows 0 of 96 tasks started. This inconsistency makes it impossible to trust the stated completion status.
- **Evidence:** `tasks/MVP-v1-Tracker.md` (96 `- [ ]` items), `IMPLEMENTATION_SUMMARY.md`.
- **Files:** `tasks/MVP-v1-Tracker.md`, `IMPLEMENTATION_SUMMARY.md`, `COMPLETE_FEATURES_OVERVIEW.md`.

#### QA-3: Lint and type-check errors in frontend
- **Severity:** High
- **Disposition:** Open — Release Blocker
- **Summary:** `npm run lint` and `npx tsc --noEmit` both fail. The build pipeline cannot produce a deployable artifact.
- **Evidence:** Build and type-check outputs.
- **Files:** `frontend/app/investigations/[id]/page.tsx`, `frontend/app/investigations/page.tsx`, `frontend/lib/queries.ts`, `frontend/lib/utils.ts`.

---

## 5. Remediation Plan

The table below orders workstreams by priority. All **Critical** and **Release Blocker** findings must be resolved before any release.

| # | Workstream | Priority | Key actions | Rough effort indicator | Blockers cleared |
|---|-----------|----------|-------------|----------------------|------------------|
| 1 | Fix backend startup and dependency pins | P0 | Correct `JSONB` import in `models.py`; pin `numpy<2` or upgrade `shapely`/`geoalchemy2`; make `pytest` collect and pass. | Hours | AUTH-1, OPS-6, QA-1 (partial) |
| 2 | Implement real authentication/authorization | P0 | Remove `user_id` params from all write endpoints; inject `get_current_user`; add ownership/role checks; fix `/auth/me`; make `/register` return a token or require login after registration. | Days | AUTH-2, AUTH-3, AUTH-4, AUTH-5 |
| 3 | Enforce mandatory evidence and case state machine | P0 | Make `POST /issues` require at least one evidence record; validate `status`/`visibility` against enums; implement resolution auto-transition with configurable threshold + minimum confirmations. | Days | DATA-1, DATA-2, DATA-3 |
| 4 | Align frontend-backend API contract | P0 | Unify status/role enums; fix `formatDate` and `tsc` errors; remove `any` types; return paginated wrappers or align `queries.ts` to actual responses; fix `file_url`/`url` and `user`/`user_display_name` mismatches. | Days | FE-1, FE-2, FE-3, DATA-4, DATA-5, DATA-6, DATA-7 |
| 5 | Make frontend build and lint pass | P0 | Resolve all `next build`, `npm run lint`, and `npx tsc --noEmit` errors. | Hours | QA-3 |
| 6 | Harden file and evidence handling | P0-P1 | Store evidence in S3 (or MinIO for dev) with presigned URLs; validate MIME type, magic bytes, file size; run virus/PII scanning; prevent path traversal. | Days | SEC-4 |
| 7 | Dependency and secret hygiene | P0-P1 | Update vulnerable Python/Node packages; rotate secrets; remove hardcoded passwords from `docker-compose.yml`; require `SESSION_SECRET` env var in production; configure `ALLOWED_ORIGINS` strictly. | Days | SEC-1, SEC-2, AUTH-8, SEC-3 |
| 8 | Complete missing MVP entities | P1-P2 | Implement `Follow`/`Report`/`ExpertProfile`/Category/Institution/Location models and APIs; add OAuth/email; implement moderation queue UI. | Weeks | AUTH-7, FE-5, FE-4, many DATA/SEC findings |
| 9 | Data ingestion and spending | P2 | Fix `budget-vs-outcome` TypeError; implement `spending-gaps`; build real connectors or remove unsupported claims. | Weeks | DATA-9 |
| 10 | Deployment and operations | P2 | Add `frontend/Dockerfile`; remove obsolete Compose `version`; add healthchecks; implement Alembic migrations; document backup/rollback; add structured logging and monitoring. | Days-weeks | OPS-1, OPS-3, OPS-4, OPS-5 |
| 11 | Reconcile documentation | P2 | Update `README`, spec, and tracker so product name, role names, and completion status are consistent. | Hours | QA-2 |

---

## 6. Residual Risks and Final Checklist

### 6.1 Residual Risks (after all remediation above)

1. **Reputation risk:** The platform handles civic allegations. Without robust trust & safety (duplicate detection, spam filtering, legal review), false or malicious cases could cause harm.
2. **Legal/compliance risk:** Storing government communications and student evidence in India requires attention to data-localization, PII, and content-takedown obligations. The current system has no legal workflow or takedown tooling.
3. **Data source risk:** Government integrations (data.gov.in, PFMS, eProcure, CAG) are documented but unimplemented. Any claims about spending transparency will be unverifiable until connectors are built.
4. **Operational risk:** The project currently lacks CI/CD, automated tests, migration rollbacks, and runbooks. A production deployment would be hard to operate safely.

### 6.2 Release Gates

| Gate | Required state | Current status |
|------|---------------|----------------|
| No open Critical findings | All Critical issues closed or accepted with mitigations | **FAIL** — multiple Critical findings open |
| No open release-blocking High findings | All High release blockers closed | **FAIL** — many High release blockers open |
| Critical user journeys verified | Registration → login → create case with evidence → moderation → confirmation → resolution can be exercised end-to-end | **FAIL** — backend does not start; frontend does not build |
| Auth/authz/tenant isolation verified | JWT enforced on every mutation; ownership and role checks pass; no `user_id` parameter bypass | **FAIL** — not implemented |
| Clean production build | `next build` passes; `npx tsc --noEmit` passes | **FAIL** |
| Tests pass | `pytest` and frontend tests pass with meaningful assertions | **FAIL** — `pytest` cannot collect; frontend tests not run |
| Lint and type checks pass | `flake8`, `npm run lint`, `npx tsc` clean | **FAIL** |
| Dependency vulnerabilities addressed | `pip-audit` and `npm audit` at acceptable thresholds | **FAIL** — 60 Python + 5 high Node vulnerabilities |
| Migration/deployment/rollback pass | Alembic migrations, Docker build, staging deploy, documented rollback | **FAIL** — no `frontend/Dockerfile`, no migration runner, Docker build blocked |
| Backup and disaster recovery documented | Database backup/restore tested | **FAIL** — not documented |
| Secrets not hardcoded | No default/hardcoded secrets in repo or compose | **FAIL** — `docker-compose.yml` and `session.ts` contain defaults |

### 6.3 Final Recommendation

**STOP — NO-GO.**

The `student-hub` repository is not production-ready and is not currently deployable as a functional application. The FastAPI backend fails at import, the Next.js frontend fails to build, authentication/authorization is unenforced, the API contract between frontend and backend is broken, and multiple P0 MVP features are missing or stubbed. Before any release, the Critical and High release-blocking findings in this report must be resolved and the release gates above must pass.

---

*Report generated: 2026-08-10*  
*Audit methodology: static code review, build/test/type scans, dependency vulnerability scans, security linting, documentation review. No production systems were accessed.*
