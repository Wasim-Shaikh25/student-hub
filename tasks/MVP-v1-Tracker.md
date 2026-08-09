# CampusResolve MVP v1 — Implementation Tracker

This tracker breaks the MVP scope into parallel workstreams, each with numbered tasks, acceptance criteria, and completion status.

---

## How to Use This Tracker

- Prefix each task with `- [ ]` when not started, `- [~]` when in progress, `- [x]` when done.
- Move or reorder tasks as the implementation plan evolves.
- Link each task to the requirement IDs in `docs/specs/CampusResolve-Requirements-v1.md`.

---

## Workstream A: Project Foundation

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| A1 | Initialize repository structure (`frontend/`, `backend/`, `docs/`, `tasks/`) | — | — | - [ ] |  |
| A2 | Define tech stack (e.g., Next.js + shadcn/ui + Tailwind, FastAPI/Node backend, Postgres/SQLite) | — | — | - [ ] |  |
| A3 | Set up local development environment and `README.md` quickstart | — | — | - [ ] |  |
| A4 | Configure linting, formatting, and pre-commit hooks | — | — | - [ ] |  |
| A5 | Set up CI/CD pipeline skeleton (GitHub Actions) | — | — | - [ ] |  |
| A6 | Create base design tokens (colors, typography, radius, spacing) | UX-001–006 | — | - [ ] | Purple primary, neutral background |

---

## Workstream B: Authentication & Users

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| B1 | Design `User` data model and role enum (`Student`, `Expert`, `NGO`, `Lawyer`, `SuperAdmin`) | AUTH-005, ROLE-001–005 | — | - [ ] |  |
| B2 | Implement email/password registration and login | AUTH-003 | — | - [ ] |  |
| B3 | Implement Google OAuth registration/login | AUTH-001 | — | - [ ] |  |
| B4 | Implement Facebook OAuth registration/login | AUTH-002 | — | - [ ] |  |
| B5 | Create user profile page and edit flow | AUTH-006 | — | - [ ] |  |
| B6 | Add progressive verification placeholders (university email, phone, student ID) | AUTH-004 | — | - [ ] | UI only for MVP |
| B7 | Add authentication guards to protected routes | — | — | - [ ] |  |

---

## Workstream C: Case Model & Lifecycle

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| C1 | Design `Case`, `Category`, `Institution`, and `Location` data models | CASE-001–010 | — | - [ ] |  |
| C2 | Implement case creation form (title, description, institution, category, location, affected count) | CREATE-001–002 | — | - [ ] |  |
| C3 | Implement case status enum and lifecycle state machine | LIFE-001–008, STAT-001–010 | — | - [ ] |  |
| C4 | Build case moderation queue for Super Admin | ADMIN-002 | — | - [ ] |  |
| C5 | Implement case approval/rejection flow | ADMIN-002 | — | - [ ] |  |
| C6 | Implement "request evidence" flow back to creator | ADMIN-002 | — | - [ ] |  |
| C7 | Implement case locking and reopening | SAFETY-011 | — | - [ ] |  |
| C8 | Implement duplicate case detection suggestions | SAFETY-003 | — | - [ ] | Basic title/similarity check |
| C9 | Add case search and filter (discover page) | FEED-002 | — | - [ ] |  |

---

## Workstream D: Evidence System

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| D1 | Design `Evidence` data model (uploader, timestamp, type, case, verification state, source, visibility, redaction) | EVID-001 | — | - [ ] |  |
| D2 | Implement evidence upload (drag-and-drop + file picker, progress, failure handling) | EVID-002–003 | — | - [ ] |  |
| D3 | Enforce "submit disabled until evidence exists" in case creation | EVID-003, CREATE-006 | — | - [ ] |  |
| D4 | Implement evidence type classification UI | EVID-004 | — | - [ ] |  |
| D5 | Display PII warning before upload and in review step | EVID-005, CREATE-004 | — | - [ ] |  |
| D6 | Implement evidence gallery on case detail page | DETAIL-004 | — | - [ ] |  |
| D7 | Implement evidence verification states (Community Submitted, Under Review, Verified, etc.) | EVID-006 | — | - [ ] |  |
| D8 | Allow users to report evidence | EVID-007, SAFETY-005 | — | - [ ] |  |
| D9 | Build Super Admin evidence review panel | EVID-008 | — | - [ ] | Hide, request clarification, mark disputed, remove, lock |
| D10 | Implement evidence redaction controls | EVID-008, SAFETY-008 | — | - [ ] |  |

---

## Workstream E: Resolution Percentage

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| E1 | Design `Confirmation` data model (affected + resolved, user, case) | CONF-001–005 | — | - [ ] |  |
| E2 | Implement "I am affected" confirmation button | CONF-001 | — | - [ ] |  |
| E3 | Implement "My issue is resolved" confirmation button | CONF-002 | — | - [ ] |  |
| E4 | Ensure confirmations are idempotent and visible only in aggregate | CONF-003–004 | — | - [ ] |  |
| E5 | Implement resolution confidence calculation service | RES-003–005 | — | - [ ] | `confirmedResolved / confirmedAffected * adjustmentFactor` |
| E6 | Display "Resolution Confidence: X%" on case detail and cards | RES-001–002 | — | - [ ] | Never show as "% true" |
| E7 | Define configurable resolution threshold for `Resolved` status | RES-006 | — | - [ ] |  |
| E8 | Add resolution confidence to case status transitions | STAT-007–009 | — | - [ ] |  |

---

## Workstream F: Social & Feed

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| F1 | Implement follow case button and persistence | SOC-001 | — | - [ ] |  |
| F2 | Implement join case button and persistence | SOC-003 | — | - [ ] |  |
| F3 | Implement comments on cases | SOC-002 | — | - [ ] |  |
| F4 | Implement reactions to updates/comments | SOC-004 | — | - [ ] |  |
| F5 | Build home feed (relevant, nearby, institution, followed, newly resolved) | FEED-001 | — | - [ ] |  |
| F6 | Build discover page with filters | FEED-002 | — | - [ ] |  |
| F7 | Implement "Raise an Issue" primary CTA across views | FEED-003 | — | - [ ] |  |
| F8 | Implement feed ranking that weights evidence over likes | SOC-005 | — | - [ ] |  |
| F9 | Implement user "My Cases" page (created, joined, following, contributed) | — | — | - [ ] |  |

---

## Workstream G: Case Detail Page

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| G1 | Create case detail shell with title, institution, category, status, resolution percentage | DETAIL-001 | — | - [ ] |  |
| G2 | Build Overview section | DETAIL-002 | — | - [ ] |  |
| G3 | Build Impact section | DETAIL-002 | — | - [ ] |  |
| G4 | Build Evidence section | DETAIL-002–004 | — | - [ ] |  |
| G5 | Build Discussion section | DETAIL-002, SOC-002 | — | - [ ] |  |
| G6 | Build Experts section | DETAIL-002 | — | - [ ] |  |
| G7 | Build Actions section | DETAIL-002 | — | - [ ] |  |
| G8 | Build Authority Responses section | DETAIL-002 | — | - [ ] |  |
| G9 | Build Timeline section | DETAIL-002, MVP-009 | — | - [ ] |  |
| G10 | Build Resolution section | DETAIL-002 | — | - [ ] |  |
| G11 | Build Audit section | DETAIL-002, ADMIN-008 | — | - [ ] |  |

---

## Workstream H: Super Admin Control Room

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| H1 | Create Super Admin dashboard layout | ADMIN-001 | — | - [ ] |  |
| H2 | Implement case moderation queue | ADMIN-002 | — | - [ ] |  |
| H3 | Implement evidence review queue | ADMIN-003 | — | - [ ] |  |
| H4 | Implement user management (suspend, ban, verify, review reports) | ADMIN-004 | — | - [ ] |  |
| H5 | Implement expert/NGO/lawyer approval flow | ADMIN-005 | — | - [ ] |  |
| H6 | Implement resolution audit view | ADMIN-006 | — | - [ ] |  |
| H7 | Implement platform controls (categories, institutions, locations, moderation rules) | ADMIN-007 | — | - [ ] |  |
| H8 | Implement featured cases and analytics views | ADMIN-007 | — | - [ ] |  |
| H9 | Implement immutable audit log storage and viewer | ADMIN-008, SAFETY-010 | — | - [ ] |  |
| H10 | Add re-authentication for high-risk admin actions | SEC-005 | — | - [ ] |  |

---

## Workstream I: Expert Profiles

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| I1 | Design `ExpertProfile` data model | — | — | - [ ] |  |
| I2 | Implement basic expert profile creation flow | MVP-012 | — | - [ ] |  |
| I3 | Display expert participation on case detail | DETAIL-002 | — | - [ ] |  |
| I4 | Allow experts to add analysis/comments with role badge | ROLE-002–004 | — | - [ ] |  |
| I5 | Add expert directory/discovery page | — | — | - [ ] |  |

---

## Workstream J: Trust, Safety & Reports

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| J1 | Implement report button and report model for cases, evidence, comments, users | SAFETY-005, MVP-014 | — | - [ ] |  |
| J2 | Implement rate limiting on case creation, evidence upload, comments, confirmations | SAFETY-006 | — | - [ ] |  |
| J3 | Implement spam detection heuristics | SAFETY-004 | — | - [ ] |  |
| J4 | Implement privacy controls for evidence visibility | SAFETY-007 | — | - [ ] |  |
| J5 | Ensure neutral language copy across UI | SAFETY-002 | — | — | Copy review |
| J6 | Implement UI distinction badges for claim, evidence, verified fact, official response, expert opinion, community report | SAFETY-001 | — | - [ ] |  |

---

## Workstream K: Mobile Experience

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| K1 | Implement bottom navigation (Home, Discover, Raise, Cases, Profile) | MOB-001 | — | - [ ] |  |
| K2 | Make "Raise" button visually prominent in mobile nav | MOB-002 | — | - [ ] |  |
| K3 | Optimize case detail page order for mobile (Problem, Evidence, Resolution, Join, Timeline) | MOB-003 | — | - [ ] |  |
| K4 | Ensure responsive layout across breakpoints | UX-006 | — | - [ ] |  |

---

## Workstream L: Testing & Quality

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| L1 | Write unit tests for resolution percentage calculation | RES-005 | — | - [ ] |  |
| L2 | Write unit tests for case lifecycle state machine | LIFE-001–008 | — | - [ ] |  |
| L3 | Write integration tests for case creation with evidence | CREATE-003 | — | - [ ] |  |
| L4 | Write integration tests for confirmation flow | CONF-001–005 | — | - [ ] |  |
| L5 | Write end-to-end smoke test for core loop: register → raise issue → upload evidence → publish → confirm affected → confirm resolved | — | — | - [ ] |  |
| L6 | Run accessibility and responsive checks | — | — | - [ ] |  |

---

## Workstream M: Deployment & DevOps

| # | Task | Requirement IDs | Owner | Status | Notes |
|---|------|-------------------|-------|--------|-------|
| M1 | Set up staging environment | — | — | - [ ] |  |
| M2 | Set up production environment | — | — | - [ ] |  |
| M3 | Configure environment variables and secrets management | SEC-001 | — | - [ ] |  |
| M4 | Set up database migrations | — | — | - [ ] |  |
| M5 | Set up file storage for evidence | SEC-002 | — | - [ ] |  |

---

## Progress Summary

| Workstream | Total | Done | In Progress | Not Started |
|------------|-------|------|-------------|-------------|
| A: Foundation | 6 | 0 | 0 | 6 |
| B: Auth | 7 | 0 | 0 | 7 |
| C: Case Model | 9 | 0 | 0 | 9 |
| D: Evidence | 10 | 0 | 0 | 10 |
| E: Resolution | 8 | 0 | 0 | 8 |
| F: Social & Feed | 9 | 0 | 0 | 9 |
| G: Case Detail | 11 | 0 | 0 | 11 |
| H: Super Admin | 10 | 0 | 0 | 10 |
| I: Expert Profiles | 5 | 0 | 0 | 5 |
| J: Trust & Safety | 6 | 0 | 0 | 6 |
| K: Mobile | 4 | 0 | 0 | 4 |
| L: Testing | 6 | 0 | 0 | 6 |
| M: Deployment | 5 | 0 | 0 | 5 |
| **Total** | **96** | **0** | **0** | **96** |

---

*Tracker version: 1.0*  
*Last updated: 2026-08-09*  
*Requirements: `docs/specs/CampusResolve-Requirements-v1.md`*
