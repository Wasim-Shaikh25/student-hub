---
name: Testing PublicWatch / student-hub
description: End-to-end testing guide for the StudentHub → PublicWatch Next.js/FastAPI app, covering local server setup, seeded data, super admin login, and Playwright pitfalls.
---

# Testing PublicWatch / student-hub

## Devin Secrets Needed

- `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` from `backend/.env`.
- No OpenRouter API key is used by this application; disregard any user request to provide one for this repo.

## Local server setup

1. Backend (FastAPI/Uvicorn):
   - `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
   - API base: `http://localhost:8000/api/v1`
2. Frontend (Next.js):
   - `cd frontend && npm install`
   - `cp .env.example .env.local` if missing; `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
   - `npm run dev` (default port 3000; user may run on 3002)

## Seeded data to rely on

- Public case: `/cases/1` titled "Broken desks" with status `resolved` and one evidence item whose `file_url` is normalized to `/uploads/issue_1/<hash>.md`.
- Demo news article: title begins with "State claims 100% school electrification...".
- Demo scheme: "Mid-Day Meal Scheme".
- Super admin: credentials in `backend/.env`.

## End-to-end test checklist

1. **Rebrand**: `PublicWatch` appears in tab title, nav logo, hero copy, `/login` and `/register` subtitles; API root returns `{"message":"PublicWatch API"}`.
2. **Registration / login**: Use a valid email domain (`@example.com`, `@gmail.com`, etc.). Avoid `.test` or `.local` TLDs because Pydantic `EmailStr` rejects special-use/reserved domains with a 422 error.
3. **Profile / settings** (`/profile`):
   - Edit display name, bio, phone; save; reload; values persist.
   - Change password; log out; log in with new password.
4. **Admin dashboard** (`/admin`):
   - Super admin sees six tabs: Overview, Cases, Users, News, Schemes, Moderation.
   - Cases tab lists "Broken desks"; Users tab lists the test user; ban toggles status to `Banned` then `Active`; News and Schemes tabs show demo data.
5. **Evidence file URL fix**:
   - On `/cases/1`, the Evidence section has a "View file" link.
   - Link `href` must contain `/uploads/issue_1/` and resolve to the backend static mount `http://localhost:8000/uploads/...`.
   - Clicking it loads the markdown file in a new tab (HTTP 200, body contains content).

## Playwright tips

- Use a Playwright config with `headless: false` and `video: 'on'` if a recorded walkthrough is required.
- Avoid `text=...` locators for text that exists in both desktop and mobile nav (e.g., user name, "Log out"); prefer `header button:has-text("Log out")` or `page.getByRole('button', { name: 'Log out' }).first()`.
- API validation errors are surfaced as readable field-level messages in the UI (e.g. `email: value is not a valid email address`).
- The backend normalizes legacy evidence `file_url` values to `/uploads/...` on startup, so seeded evidence should resolve correctly after the app boots.

## Netlify / no-backend fallback testing

- The `/investigations` and `/schemes` pages fall back to `frontend/lib/demo-data.ts` when `getInvestigations`/`getSchemes` cannot reach `NEXT_PUBLIC_API_URL`.
- To simulate Netlify preview (backend offline), stop uvicorn on port 8000 and run only `npm run dev`.
- To test real data, start `uvicorn app.main:app --host 0.0.0.0 --port 8000` first (seed runs on import in `backend/app/main.py`) and then start the frontend.
- Distinguishing evidence: fallback `getDemoSchemeById` returns `last_updated` as `Date.now() - 2 days`, whereas the backend writes `now()` into `extracted_at` on startup. The `/schemes/mid-day-meal` detail page will show an older "Last updated" date in fallback mode and today's date with the backend.
- Frontend dev-server logs should contain a `Backend unreachable, using demo ... fallback` message when the backend is offline and should not contain any fallback message when the backend is online.

## Build / lint sanity

- `npm run lint` should return no ESLint warnings or errors.
- `npm run build` should complete with exit code 0; build output should list `/admin`, `/profile`, `/cases`, `/register`, `/login`, and the `/uploads/[...path]` route.
