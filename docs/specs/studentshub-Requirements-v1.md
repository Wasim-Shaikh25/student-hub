# studentshub — Product & Technical Requirements Specification

## 1. Document Purpose

This document captures the functional and non-functional requirements for **studentshub MVP Version 1**, an evidence-first student action network. It is derived from the product vision, case lifecycle, and MVP scope approved for `student-hub`.

## 2. Product Vision

studentshub is a trusted digital network for students to raise, validate, discuss, and collectively resolve education-related problems. The core journey is:

**Problem → Evidence → Community → Expert Support → Action → Authority Response → Verification → Resolution**

### 2.1 Core Product Principle

> **No evidence, no case.**

Any registered user may discuss an existing case, but creating a new formal case requires supporting evidence.

### 2.2 Resolution Principle

> **No verified outcome, no "Resolved."**

The resolution percentage represents **resolution confidence**, not "percent true." It is calculated from evidence, affected-user confirmations, institutional responses, and independent verification.

---

## 3. MVP Version 1 Scope

The MVP must prove the core loop with real students before adding backend complexity, hard-coded third-party integrations, or automated truth verification.

### 3.1 MVP Features

| ID | Feature | Priority |
|----|---------|----------|
| MVP-001 | Authentication (Google, Facebook, email) | P0 |
| MVP-002 | Home feed | P0 |
| MVP-003 | Case creation with mandatory evidence | P0 |
| MVP-004 | Case moderation queue (Super Admin) | P0 |
| MVP-005 | Case detail page | P0 |
| MVP-006 | Evidence gallery | P0 |
| MVP-007 | Student confirmations ("affected" and "resolved") | P0 |
| MVP-008 | Resolution percentage display | P0 |
| MVP-009 | Case timeline | P0 |
| MVP-010 | Comments on cases | P0 |
| MVP-011 | Join / follow case | P0 |
| MVP-012 | Basic expert profiles | P1 |
| MVP-013 | Super Admin control room | P0 |
| MVP-014 | Reports (case/evidence reporting) | P1 |

---

## 4. Functional Requirements

### 4.1 Authentication & Users

| ID | Requirement |
|----|-------------|
| AUTH-001 | Users can register and log in with Google OAuth. |
| AUTH-002 | Users can register and log in with Facebook OAuth. |
| AUTH-003 | Users can register and log in with email and password. |
| AUTH-004 | Progressive verification must be supported for future features (university email, phone, student ID, organization verification). |
| AUTH-005 | Every user has a default role of `Student` after registration. |
| AUTH-006 | Users must have a profile with display name, email, institution, and location. |

### 4.2 User Roles

| ID | Role | Permissions |
|----|------|-------------|
| ROLE-001 | Student | Create cases, upload evidence, join cases, comment, confirm resolution, follow cases. |
| ROLE-002 | Verified Expert | Review cases, provide guidance, add expert analysis, flag evidence, participate in action. |
| ROLE-003 | NGO / Association | Join cases, represent organizations, offer assistance, coordinate collective actions, publish verified updates. |
| ROLE-004 | Lawyer | Join relevant cases, provide legal information, offer consultation, identify legal pathways. |
| ROLE-005 | Super Admin | Full platform moderation, user management, evidence review, resolution audit, immutable audit logs. |

### 4.3 Case Model

| ID | Requirement |
|----|-------------|
| CASE-001 | A case has a title, description, institution, category, location, and estimated affected population. |
| CASE-002 | A case belongs to one `Student` creator. |
| CASE-003 | A case has a status from the defined lifecycle. |
| CASE-004 | A case has a resolution confidence percentage. |
| CASE-005 | A case has a timeline of events. |
| CASE-006 | A case can have multiple evidence items. |
| CASE-007 | A case can have multiple student confirmations (affected + resolved). |
| CASE-008 | A case can have comments. |
| CASE-009 | A case can have joined/following students. |
| CASE-010 | A case is publicly discoverable only after passing evidence review. |

### 4.4 Case Lifecycle

| ID | Stage | Description |
|----|-------|-------------|
| LIFE-001 | Draft | Student enters problem and attaches evidence. |
| LIFE-002 | Evidence Review | Platform/moderator checks evidence presence, relevance, and prohibited content. |
| LIFE-003 | Published Case | Approved and discoverable by community. |
| LIFE-004 | Collective Case | Affected students join and add evidence. |
| LIFE-005 | Expert Review | Verified experts assess case. |
| LIFE-006 | Action | Formal action initiated. |
| LIFE-007 | Authority Response | Institution/government response attached. |
| LIFE-008 | Resolution Verification | Affected students confirm outcome. |

### 4.5 Status Values

| ID | Status | Badge Color | Definition |
|----|--------|-------------|------------|
| STAT-001 | Unverified | Red | Submitted, evidence not yet reviewed. |
| STAT-002 | Confirmed Problem | Yellow | Evidence and community reports confirm issue warrants a case. |
| STAT-003 | Evidence Collection | Blue | More documentation being collected. |
| STAT-004 | Expert Review | Purple | Verified experts assessing. |
| STAT-005 | Action Initiated | Orange | Formal action taken. |
| STAT-006 | Authority Response | Orange | Institution/authority has responded. |
| STAT-007 | Partially Resolved | Yellow | Some affected users report resolution. |
| STAT-008 | Mostly Resolved | Green | Majority confirm resolution. |
| STAT-009 | Resolved | Green | Evidence and confirmations meet threshold. |
| STAT-010 | Reopened | Gray | Previously resolved but challenged with new evidence. |

### 4.6 Evidence System

| ID | Requirement |
|----|-------------|
| EVID-001 | Every evidence item has uploader, timestamp, type, case association, verification state, source classification, visibility level, and redaction status. |
| EVID-002 | Evidence is mandatory before case submission. |
| EVID-003 | Submit button remains disabled until at least one valid evidence item exists. |
| EVID-004 | Accepted types: official notices, emails, receipts, fee documents, government communications, university communications, examination documents, payment records, screenshots, publicly available official documents, and other relevant material. |
| EVID-005 | Users must be warned not to upload passwords, Aadhaar numbers, bank credentials, or unnecessary private personal information. |
| EVID-006 | Evidence states: Community Submitted, Under Review, Verified, Official Source, Expert Verified, Disputed, Rejected. |
| EVID-007 | Evidence can be reported by users. |
| EVID-008 | Super Admins can hide, request clarification, mark disputed, remove prohibited content, lock, and preserve audit history for evidence. |

### 4.7 Resolution Percentage

| ID | Requirement |
|----|-------------|
| RES-001 | The resolution percentage is displayed as "Resolution Confidence: X%". |
| RES-002 | It must never be presented as "X% true." |
| RES-003 | Inputs include: affected-student confirmations, resolution evidence, official response, government response, independent expert verification, number still reporting issue, evidence quality, recency, and contradictory reports. |
| RES-004 | Calculation methodology must be transparent and documented. |
| RES-005 | MVP formula must be simple and deterministic: `resolutionConfidence = (confirmedResolved / confirmedAffected) * 100`, adjusted by evidence and official response flags. |
| RES-006 | A case is marked `Resolved` only when resolution confidence meets a configurable threshold and minimum confirmation count. |

### 4.8 Confirmation System

| ID | Requirement |
|----|-------------|
| CONF-001 | A logged-in student can confirm they are affected by a case. |
| CONF-002 | A logged-in student can confirm their issue has been resolved. |
| CONF-003 | Confirmations are tied to a user and a case, and are idempotent. |
| CONF-004 | Confirmations are visible only in aggregate unless the user opts in. |
| CONF-005 | Confirmations feed into the resolution percentage. |

### 4.9 Social Layer

| ID | Requirement |
|----|-------------|
| SOC-001 | Users can follow cases. |
| SOC-002 | Users can comment on cases. |
| SOC-003 | Users can join cases. |
| SOC-004 | Users can react to updates. |
| SOC-005 | The feed ranks cases by evidence quality and community participation, not just likes. |

### 4.10 Home & Discover

| ID | Requirement |
|----|-------------|
| FEED-001 | Home shows a personalized stream of relevant cases, nearby cases, institution cases, followed case updates, and newly resolved cases. |
| FEED-002 | Discover allows filtering by university, city, state, category, institution, trending, most affected, and recently resolved. |
| FEED-003 | "Raise an Issue" is the primary CTA. |

### 4.11 Case Creation UX

| ID | Requirement |
|----|-------------|
| CREATE-001 | Step 1: Title and detailed description ("What happened?"). |
| CREATE-002 | Step 2: Institution, location, and estimated affected population ("Who is affected?"). |
| CREATE-003 | Step 3: Mandatory evidence upload. |
| CREATE-004 | Step 4: Review screen showing warnings and confirmation. |
| CREATE-005 | Step 5: Submit, entering moderation. |
| CREATE-006 | The submit button is disabled until evidence exists. |

### 4.12 Case Detail Page

| ID | Requirement |
|----|-------------|
| DETAIL-001 | Shows case title, institution, category, status, and resolution percentage. |
| DETAIL-002 | Has sections: Overview, Impact, Evidence, Discussion, Experts, Actions, Authority Responses, Timeline, Resolution, Audit. |
| DETAIL-003 | Each section is navigable and clear. |
| DETAIL-004 | Evidence is displayed as a gallery with verification state. |

### 4.13 Super Admin

| ID | Requirement |
|----|-------------|
| ADMIN-001 | One initial Super Admin account (founder-controlled). |
| ADMIN-002 | Approve, reject, request evidence, lock, reopen, and merge duplicate cases. |
| ADMIN-003 | Review, verify, reject, redact, flag, and remove evidence. |
| ADMIN-004 | Suspend, ban, verify, and review reports on users. |
| ADMIN-005 | Approve expert/NGO/lawyer roles. |
| ADMIN-006 | Inspect resolution calculation, student confirmations, evidence, official responses, expert verification, and contradictory evidence. |
| ADMIN-007 | Manage categories, institutions, locations, moderation rules, featured cases, reports, and analytics. |
| ADMIN-008 | Every administrative action creates an immutable audit record. |

### 4.14 Trust & Safety

| ID | Requirement |
|----|-------------|
| SAFETY-001 | UI clearly distinguishes claim, evidence, verified fact, official response, expert opinion, and community report. |
| SAFETY-002 | Use neutral language: "Students report…", "The uploaded document indicates…", "The institution responded…", "The claim remains under review…" |
| SAFETY-003 | Implement duplicate case detection. |
| SAFETY-004 | Implement spam detection. |
| SAFETY-005 | Implement a report system for cases, evidence, comments, and users. |
| SAFETY-006 | Implement rate limiting on case creation, evidence upload, comments, and confirmations. |
| SAFETY-007 | Provide privacy controls on evidence visibility. |
| SAFETY-008 | Provide evidence redaction. |
| SAFETY-009 | Maintain moderation queue. |
| SAFETY-010 | Maintain admin audit logs. |
| SAFETY-011 | Support case locking and reopening. |

### 4.15 Mobile Experience

| ID | Requirement |
|----|-------------|
| MOB-001 | Bottom navigation: Home, Discover, Raise, Cases, Profile. |
| MOB-002 | "Raise" button is visually prominent. |
| MOB-003 | Case page prioritizes: Problem, Evidence, Resolution status, Join, Timeline. |

---

## 5. Non-Functional Requirements

### 5.1 UI/UX Direction

| ID | Requirement |
|----|-------------|
| UX-001 | Premium modern SaaS feel, inspired by shadcn/ui, 21st.dev, Linear, Vercel, Notion, Stripe. |
| UX-002 | Generous whitespace, soft borders, subtle shadows, 16–20px card radius. |
| UX-003 | Strong typography, minimal gradients, purple primary action color. |
| UX-004 | Neutral background, clear status chips, smooth hover states. |
| UX-005 | Skeleton loading and command/search interface. |
| UX-006 | Responsive mobile-first design. |

### 5.2 Performance & Reliability

| ID | Requirement |
|----|-------------|
| PERF-001 | Page load under 3 seconds on 3G for critical paths. |
| PERF-002 | Evidence uploads must show progress and handle failures gracefully. |
| PERF-003 | Feed and search must be paginated. |

### 5.3 Security & Privacy

| ID | Requirement |
|----|-------------|
| SEC-001 | OAuth secrets must be stored securely. |
| SEC-002 | Evidence files must be scanned and stored securely. |
| SEC-003 | PII must be redactable by moderators. |
| SEC-004 | Audit logs must be append-only and tamper-evident. |
| SEC-005 | Admin actions require re-authentication for high-risk operations. |

---

## 6. Data Model (MVP)

### 6.1 Core Entities

- `User`
- `Case`
- `Evidence`
- `Confirmation`
- `Comment`
- `Follow`
- `ExpertProfile`
- `AuditLog`
- `Report`
- `Category`
- `Institution`
- `Location`

### 6.2 Entity Relationships

- A `User` can create many `Case` items.
- A `Case` has many `Evidence` items.
- A `Case` has many `Confirmation` items.
- A `Case` has many `Comment` items.
- A `User` can `Follow` many `Case` items.
- A `Case` has one `Category` and one `Institution`.
- An `ExpertProfile` belongs to one `User`.
- An `AuditLog` records actions by `User` on `Case`, `Evidence`, or other entities.
- A `Report` is filed by a `User` against a `Case`, `Evidence`, `Comment`, or `User`.

---

## 7. Version Roadmap

### 7.1 Version 1 (MVP)

- Authentication
- Home feed
- Case creation
- Mandatory evidence
- Case moderation
- Case detail
- Evidence gallery
- Student confirmations
- Resolution percentage
- Case timeline
- Comments
- Join/follow case
- Basic expert profiles
- Super Admin
- Reports

### 7.2 Version 2

- NGO onboarding
- Lawyer verification
- Institutional profiles
- Formal action workflows
- Government-response tracking
- Petition functionality
- Advanced notifications
- Case merging
- Geographic discovery
- University dashboards

### 7.3 Version 3

- Institutional response portal
- Government integrations
- Legal workflow integrations
- Public education issue analytics
- Policy research dashboards
- Anonymous aggregate reporting
- AI-assisted evidence classification
- Duplicate-case detection
- Resolution prediction
- Automated case summaries

---

## 8. Metrics & North Star

### 8.1 Primary Metric

> **Successfully Resolved Student Problems**

### 8.2 Supporting Metrics

- Cases created
- Cases passing evidence review
- Students participating
- Evidence contributions
- Expert participation
- Authority responses
- Actions initiated
- Resolution confirmations
- Reopened cases
- Average time to resolution

---

## 9. Brand Positioning

**studentshub**

- Tagline: *Turn problems into progress.*
- Alternative: *Students speak. Evidence leads. Action follows.*
- Feel: Trustworthy, modern, student-first, evidence-driven, action-oriented, non-partisan, transparent.

---

## 10. Out-of-Scope for MVP

| ID | Item | Rationale |
|----|------|-----------|
| OOS-001 | Hard-coded Facebook/Google auth backend | Use standard OAuth libraries; avoid lock-in. |
| OOS-002 | Automated "truth verification" | Prove core loop first; algorithm later. |
| OOS-003 | Legal workflow automation | Expert consultation only in MVP. |
| OOS-004 | Government integrations | Manual response tracking in MVP. |
| OOS-005 | AI-assisted evidence classification | Future enhancement. |

---

*Document version: 1.0*  
*Last updated: 2026-08-09*  
*Repository: Wasim-Shaikh25/student-hub*
