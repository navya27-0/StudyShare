# StudyShare — Course-Organized Academic Study Resource Platform

StudyShare is a full-stack academic platform built for university students and faculty to discover, share, preview, and organize verified course materials (**Lecture Notes, Past Exam Papers / PYQs, Question Banks, Lab Manuals, and Reference Links**) mapped to a structured **`Course → Unit → Topic`** curriculum hierarchy.

---

## Key Capabilities & Student-First Workflows

### 1. Immediate 5-Second Clarity & Guided Student Flow
- **Student-Friendly Terminology**: Clear labels (**Find Resources**, **Upload Notes**, **My Bookmarks**, **My Profile**, **Admin Review**, **Study Materials**) replace institutional jargon.
- **4-Step Primary Flow Banner**: Guides students immediately through:
  `1. Choose your course → 2. Pick a unit → 3. Find notes or past papers → 4. Preview or download`
- **Personalized Semester Onboarding**: Interactive setup modal capturing **University/Institution**, **Department**, **Current Semester**, **Enrolled Courses**, **Preferred Theme**, and **Contributor Intent**, powering a personalized **Your Semester** strip on the home view.

### 2. Student-Oriented Search & Fast Exam-Time Filtering
- **Multi-Token & Synonym Search**: Searches across resource titles, descriptions, course codes (`CS201`), course names (`Operating Systems`), unit numbers/titles (`Unit 3`), topics (`Dijkstra`), contributor names, and filenames. Automatically expands student synonyms (`pyq`, `past paper`, `last year` → Exam Papers & Question Banks; `lab`, `manual` → Lab Records).
- **1-Click Exam Mode Chips**: Instant filters for **Exam Prep (PYQs & Q-Banks)**, **Verified Only**, **4★ & Above**, and **My Semester**, plus **Recently Updated** and **Smart Ranked** sorting.
- **Helpful Empty States**: Provides actionable recovery buttons (**Clear All Filters**, **Search All Courses**, **Upload First Resource**, **Browse Resources**) whenever a filter combination or personal library is empty.

### 3. Frictionless Upload, Duplicate Detection & Inline PDF Preview
- **Drag-and-Drop Auto-Fill**: Dropping a file (`CS201_Unit2_AVL_Trees_Notes.pdf`) automatically extracts a clean title, detects the matching course (`CS201`) and unit (`Unit 2`), and sets the resource type.
- **Streaming Upload & Magic-Byte Signature Validation**: Uploads stream in 64 KB chunks (`backend/app/core/storage.py`) with SHA-256 integrity hashing, strict path containment, and magic-byte header verification (rejecting disguised executables such as Windows PE `MZ` or Linux `ELF` binaries).
- **Pre-Upload Duplicate Detection**: Real-time `/api/resources/check-duplicate` check alerts contributors if similar material already exists in the selected course/unit, offering a 1-click **Upload as New Version** flow.
- **Inline Document Preview & Revision History**: Built-in PDF/image preview directly inside the resource detail modal, **Downloaded** tracking badge, and a collapsible version timeline with changelogs.
- **Governed File Serving (`/uploads/{file_key}`)**: Uploaded files are served through a moderation-aware endpoint with `X-Content-Type-Options: nosniff` that automatically blocks access (`404 Not Found`) if the parent resource is soft-deleted by moderation.

### 4. Accessibility, Comfortable Reading & Low-Bandwidth Campus Mode
- **DAQ Consulting Monochrome Design System**: High-contrast **Dark Mode** (`#000000` canvas, `#080808` surface, `#FFFFFF` typography) and **Light Paper Mode** (`#F8FAFC` canvas, `#FFFFFF` surface, `#09090B` ink) with `1px` architectural hairlines and 160–240ms `cubic-bezier(0.16, 1, 0.3, 1)` transitions.
- **Comfortable Reading Mode**: 1-click toggle increasing body typography (`16px`), line height (`1.72`), and card padding for extended pre-exam study sessions.
- **Low-Bandwidth Lite Mode**: Strips decorative grids, blurs, and animations while caching the course taxonomy (`studyshare_taxonomy_cache_v2`) and saved bookmarks locally for slow hostel Wi-Fi or mobile data.
- **WCAG AA Keyboard & Screen-Reader Support**: Skip-to-main-content link, `44×44px` minimum touch targets, semantic landmarks, `aria-live` status feedback, and focus traps on all dialogs (`Escape` to close, `/` to focus search).

---

## System Architecture & Tech Stack

| Layer | Technology | Highlights |
| :--- | :--- | :--- |
| **Backend API** | FastAPI (Python 3.11+) | Async SQLAlchemy 2.0, Pydantic v2 validation, canonical `/api/...` OpenAPI namespace |
| **Database** | PostgreSQL 16 / SQLite (`aiosqlite`) | Dialect-aware SQL ranking compiler (`_AgeInDays`) supporting both PostgreSQL & SQLite |
| **Security & Auth** | `bcrypt` + `PyJWT` (`HS256`) | Cost-12 `bcrypt` password hashing, `jti`-rotated `HttpOnly` refresh cookies, in-memory/tab-scoped access tokens, TTL-pruned rate limiting & token revocation, CSP + `nosniff` + `X-Request-ID` headers |
| **Frontend UI** | React 19 + TypeScript + Vite | Modular domain API services (`src/services/`), modular CSS architecture (`src/styles/`), zero external UI bloat |
| **CI/CD** | GitHub Actions | Automated Ruff linter/formatter, Pytest integration suite, TypeScript strict check, Vite build, Docker Compose smoke test |

### Project Structure

```text
StudyShare/
├── backend/
│   ├── app/
│   │   ├── api/            # Canonical /api routers (auth, resources, users, admin, health)
│   │   ├── core/           # Security (bcrypt + PyJWT), Ranking compiler, TTL Rate Limiter, Streaming Storage
│   │   ├── models/         # SQLAlchemy 2.0 ORM models (User, Subject, Unit, Topic, Resource, Version, Vote, Rating, Report)
│   │   ├── schemas/        # Pydantic v2 request/response contracts
│   │   ├── main.py         # FastAPI app, CSP/Request-ID middleware, governed /uploads route
│   │   └── seed.py         # Idempotent academic curriculum & sample resource seeder
│   ├── tests/              # Comprehensive async Pytest suite (auth, resources, interactions, admin, security & contracts)
│   ├── requirements.txt    # Version-bounded Python dependencies
│   └── requirements.lock   # Pinned reproducible lockfile
├── frontend/
│   ├── src/
│   │   ├── components/     # AppShell, BrowseView, ResourceCard, ResourceDetailView, UploadView, OnboardingModal, etc.
│   │   ├── context/        # AuthContext (in-memory + HttpOnly refresh lifecycle) & ToastContext
│   │   ├── services/       # Modular API layer: httpClient, authApi, taxonomyApi, resourcesApi, usersApi, adminApi, localStorage
│   │   ├── styles/         # Modular CSS: tokens, reset, motion, layout, components, accessibility, responsive
│   │   └── types/          # Strict TypeScript interfaces matching backend Pydantic schemas
└── DESIGN.md               # Canonical DAQ Consulting design system & motion specification
```

---

## Canonical API Overview (`/api/...`)

All documented OpenAPI endpoints live under `/api/...` (legacy root paths `/resources`, `/users`, `/admin` are maintained only as hidden backward-compatibility aliases):

- **Health**: `GET /api/health` — Database connectivity & latency check.
- **Authentication**:
  - `POST /api/auth/signup` — Register student account & provision contributor profile (+10 welcome reputation).
  - `POST /api/auth/login` — Authenticate with `bcrypt`, return short-lived access token + set `HttpOnly` refresh cookie.
  - `POST /api/auth/refresh` — Rotate refresh token (`jti` revocation check) and issue fresh access token.
  - `POST /api/auth/logout` — Revoke refresh token and clear `HttpOnly` cookie.
  - `GET /api/auth/me` — Retrieve current authenticated user profile.
- **Resources & Curriculum Taxonomy**:
  - `GET /api/resources` — Paginated catalog with multi-level taxonomy filters, student synonym search, and single-pass bookmark/vote hydration.
  - `GET /api/resources/taxonomy` — Full `Subject → Unit → Topic` tree.
  - `GET /api/resources/check-duplicate` — Pre-upload duplicate detection by title similarity, unit/topic, and byte size.
  - `POST /api/resources` — Streaming multipart upload with magic-byte validation and initial version creation.
  - `GET /api/resources/{id}` — Resource detail with version history and deduplicated view tracking.
  - `PUT /api/resources/{id}` — Publish a new immutable `ResourceVersion` with changelog.
  - `POST /api/resources/{id}/vote` — Upvote/downvote toggle & switch with atomic counter recomputation.
  - `POST /api/resources/{id}/rating` — 1–5 star rating upsert.
  - `POST /api/resources/{id}/bookmark` & `DELETE /api/resources/{id}/bookmark` — Personal study library management.
  - `POST /api/resources/{id}/report` — Submit moderation report.
  - `POST /api/resources/{id}/download` — Deduplicated download counter increment.
- **Users & Admin Moderation**:
  - `GET /api/users/{id}`, `GET /api/users/{id}/activity`, `GET /api/users/{id}/bookmarks`
  - `GET /api/admin/reports`, `POST /api/admin/reports/{id}/action`, `POST /api/admin/resources/{id}/remove`, `POST /api/admin/resources/{id}/restore`, `GET /api/admin/users`, `POST /api/admin/users/{id}/ban`, `POST /api/admin/users/{id}/unban`, `POST /api/admin/users/{id}/warn`, `GET /api/admin/moderation-actions`

---

## Mathematical Ranking Algorithm

Implemented in [`backend/app/core/ranking.py`](backend/app/core/ranking.py) and compiled directly into SQL (`PostgreSQL` and `SQLite` compatible):

$$\text{RankingScore} = \left(2.0 \cdot R_{\text{adj}} + V_{\text{net}} + E + B_{\text{auth}}\right) \times D_{\text{recency}}$$

1. **Bayesian Adjusted Rating ($R_{\text{adj}}$)**: Smooths star ratings toward a prior of $m = 3.5$ over $C = 3$ pseudo-ratings:
   $$R_{\text{adj}} = \frac{\text{rating\_count} \cdot \text{rating\_avg} + 3.0 \times 3.5}{\text{rating\_count} + 3.0}$$
2. **Logarithmic Net Votes ($V_{\text{net}}$)**: Signed logarithmic compression of authenticated community votes:
   $$V_{\text{net}} = \text{sign}(v) \cdot \ln(1 + |v|) \cdot 1.5 \quad \text{where } v = \text{upvotes} - \text{downvotes}$$
3. **Anti-Manipulation Bounded Engagement ($E$)**: Downloads are weighted at $1.5\times$, while passive views are weighted at $0.15\times$ and hard-capped at $500$ effective views so unauthenticated view spikes cannot outrank community-reviewed notes:
   $$E = \ln\left(1 + 1.5 \cdot \text{downloads} + 0.15 \cdot \min(\text{views}, 500)\right)$$
4. **Syllabus Authority Bonus ($B_{\text{auth}}$)**: $+2.0$ flat boost for faculty-verified materials (`is_verified = True`).
5. **Curricular Gravity Decay ($D_{\text{recency}}$)**: Soft power-law curve over a 30-day academic baseline:
   $$D_{\text{recency}} = \frac{1}{\left(1 + \frac{\text{age\_in\_days}}{30}\right)^{0.4}}$$

---

## Quick Start (Local Development)

### 1. Backend Setup (SQLite Zero-Config or PostgreSQL)

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

pip install -r requirements.txt

# Seed sample academic courses, units, topics, users, and resources:
# (For local SQLite without Docker, set DATABASE_URL="sqlite+aiosqlite:///./studyshare.db")
python -m app.seed

# Start FastAPI server on http://127.0.0.1:8000
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Demo Accounts (Seeded by `python -m app.seed`)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Student Contributor** | `arvind.raman@student.univ.edu` | `StudyShare2024!` |
| **Student Peer** | `sneha.rao@student.univ.edu` | `StudyShare2024!` |
| **Faculty Moderator (Admin)** | `prof.sharma@university.edu` | `StudyShare2024!` |

---

## Verification, Linting & Automated Tests

```bash
# Backend Lint, Format Check & Full Pytest Suite
cd backend
ruff check .
ruff format --check .
pytest -v

# Frontend TypeScript & Production Bundle Verification
cd ../frontend
npm run lint
npm run build
```
