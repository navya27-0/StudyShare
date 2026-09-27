# StudyShare

> A high-density academic resource ledger and peer-reviewed study repository built for college campuses.

---

### What is StudyShare? (And why not just a shared Google Drive?)

Most college resource sharing starts in a shared Google Drive folder and quickly disintegrates: dead links, duplicate files named `notes_unit3_final_FINAL(1).pdf`, unorganized folders with no syllabus mapping, zero version history, and no way to know if an exam solution is actually accurate or completely outdated.

StudyShare organizes academic materials directly into a structured **Subject → Unit → Topic** curriculum hierarchy. Students and faculty can upload notes, past-year exam questions (PYQs), formula cheat sheets, and lab manuals with true version history, changelogs, peer ratings, and an algorithmic ranking engine that bubbles reliable, current resources to the top while letting stale or superseded notes sink.

---

## Visual Previews

<!-- SCREENSHOT PLACEHOLDER: Main academic catalog with curriculum tree, quick-jump rail, and filters -->
<!-- Drop screenshot here: docs/screenshots/catalog-browse-desktop.png -->
```text
+------------------------------------------------------------------------------------+
| [StudyShare]  Search CS201, Unit 3, formula sheets... (/)    [Saved] [Admin] [Moon]|
+------------------------------------------------------------------------------------+
| BROWSE BY CURRICULUM: CS101 Computer Science | EE201 Circuits | MA301 Linear Alg  |
| SELECTED: CS204 Discrete Math > Unit 2: Graph Theory > Topic: Dijkstra Algorithm   |
+------------------------------------------------------------------------------------+
| FILTERS: [Type: All] [Semester: 4] [Min Rating: 4+]    SORT: [Most Useful (Ranked)]|
|                                                                                    |
| [PDF] Unit 2 Complete Lecture Notes & Proofs               ^ 42  * 4.8 (19 ratings)|
|       CS204 - Discrete Mathematical Structures             v     854 downloads     |
|       By Sneha Rao • Sem 4 • 24 pages • v2 (3d ago)        [Bookmark] [Download]   |
|       Changelog: Fixed inductive step proof on slide 14                            |
+------------------------------------------------------------------------------------+
```

<!-- SCREENSHOT PLACEHOLDER: Document view with inline PDF viewer, rating, and version timeline -->
<!-- Drop screenshot here: docs/screenshots/resource-detail-preview.png -->
> **Tip for contributors:** Place real production screenshots in `docs/screenshots/` (`catalog-browse-desktop.png`, `resource-detail-preview.png`, `mobile-drawer-walkthrough.gif`, and `admin-moderation-queue.png`).

---

## Key Features

- **Curriculum-First Taxonomy**: Browse by university course code (`CS204`), syllabus unit (`Unit 02`), and specific lecture topics (`Dijkstra Shortest Path`), or jump directly across branches using the top rail.
- **Academic Ranking Algorithm**: Transparent scoring formula that balances user ratings, net votes, and recent view/download activity with time-decay weighting (old-but-gold references stay visible; truly stale materials naturally drop down).
- **True Version Control**: Upload new versions to existing resources with mandatory changelogs (`v1 → v2`), avoiding duplicate file dumps.
- **In-Browser File Previews**: Integrated inline PDF viewer and external web link handling with direct download tracking.
- **Revision Desk (Personal Bookmarks)**: One-click offline-friendly saved library for assembling custom exam packs before midterms and finals.
- **Contributor Reputation**: Student profiles tracking uploaded materials, total upvotes, community karma points, and an activity log.
- **Administrative Governance**: Route-protected faculty/admin console with a queue to review student reports, action or dismiss flags, ban/unban abusive accounts, and inspect a tamper-evident moderation audit ledger.
- **Accessible & Responsive**: High-density desktop table mode, responsive mobile drawers and touch targets (≥44px), WCAG AA color contrast, full keyboard navigation, and an intentional paper-and-charcoal dark mode.
- **Resilient UX**: Contextual error boundaries preventing full-page whiteouts, toast alerts on failed network operations, and informative empty states for all filtered list views.

---

## Tech Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, React Router v7, Lucide Icons, CSS Custom Properties |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, Pydantic v2 |
| **Database** | PostgreSQL 16 with native `to_tsvector` full-text search indexing |
| **Auth & Security** | JWT (access + refresh tokens), Argon2 password hashing, rate limiting, role-based access control (RBAC) |
| **Infrastructure** | Docker, Docker Compose, Nginx (frontend SPA distribution), multi-stage builds |
| **Testing & Quality** | Pytest, AnyIO, Ruff (Python linter/formatter), TypeScript (`tsc -b`), ESLint |

---

## Project Structure Overview

```text
StudyShare/
├── backend/                        # FastAPI asynchronous application
│   ├── alembic/                    # Database migration scripts
│   │   └── versions/               # Schema evolution (users, taxonomy, resources, audit)
│   ├── app/
│   │   ├── api/                    # Route handlers (auth, resources, users, admin, health)
│   │   ├── core/                   # Security, JWT tokens, rate limiters, dependencies
│   │   ├── models/                 # SQLAlchemy 2.0 declarative database models
│   │   ├── schemas/                # Pydantic v2 request/response schemas
│   │   ├── seed.py                 # Realistic university curriculum & user seed script
│   │   ├── config.py               # Environment configuration via Pydantic Settings
│   │   ├── database.py             # Async engine & sessionmaker
│   │   └── main.py                 # FastAPI application factory & static file mounts
│   ├── tests/                      # Pytest suite (auth, resources, taxonomy, interactions, admin)
│   └── requirements.txt            # Python dependencies
│
├── frontend/                       # React 19 + TypeScript + Vite SPA
│   ├── public/                     # Static assets & favicons
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── common/             # ErrorBoundary, Modal, Badges, DarkModeToggle
│   │   │   ├── layout/             # AppShell, Navbar, SidebarTree, MobileDrawer
│   │   │   └── resources/          # ResourceCard, FilterBar, EmptyState, MostUsefulModule
│   │   ├── context/                # React contexts (AuthContext, ToastContext)
│   │   ├── pages/                  # Page views (Browse, Detail, Upload, Bookmarks, Profile, Admin)
│   │   ├── services/               # Typed API client with standardized error handling
│   │   └── types/                  # TypeScript interface definitions
│   ├── package.json
│   └── tsconfig.json
│
├── infra/                          # Docker configuration
│   └── docker-compose.yml          # Postgres 16, backend, and frontend service topology
├── DESIGN.md                       # Comprehensive design system & token specification
├── CONTRIBUTING.md                 # Contribution guidelines & coding conventions
├── docker-compose.yml              # Root proxy for convenience
└── README.md                       # You are here
```

---

## Local Setup (Docker Compose)

Follow these steps top to bottom to run the full stack locally with PostgreSQL, FastAPI, and React.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+ recommended)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/navya27-0/StudyShare.git
cd StudyShare
```

### 2. Environment Configuration

Copy the example environment file (the defaults work out of the box for local development):

```bash
cp .env.example .env
```

For complete documentation of all configuration keys, types, and security guidelines, see [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md).

Key environment defaults:
- `POSTGRES_USER=studyshare`
- `POSTGRES_PASSWORD=studyshare_dev`
- `POSTGRES_DB=studyshare_db`
- `POSTGRES_HOST_PORT=5433` *(mapped to 5432 internally so it won't conflict with a local Postgres install)*
- `BACKEND_PORT=8000`
- `CORS_ORIGINS=http://localhost:5173,http://localhost:80,http://localhost`

### 3. Build & Start the Containers

Spin up the development stack:

```bash
docker compose up --build -d
```

*(Alternatively, run `docker compose -f infra/docker-compose.yml up --build -d`)*

#### Production Deployment

For production environments with resource limits, isolated internal database networking, non-root user execution, and optimized Nginx reverse proxy caching:

```bash
# Ensure secure production values are set in .env:
# POSTGRES_PASSWORD=<strong_password>
# JWT_SECRET_KEY=$(openssl rand -hex 32)
docker compose -f infra/docker-compose.prod.yml up --build -d
```

Verify that all three containers are healthy:

```bash
docker compose ps
```

You should see:
- `studyshare-postgres` (healthy on port `5433->5432`)
- `studyshare-backend` (running on port `8000`)
- `studyshare-frontend` (running on port `5173`)

### 4. Run Database Migrations

Apply the Alembic migrations to set up the database schema:

```bash
docker exec -it studyshare-backend alembic upgrade head
```

### 5. Seed Realistic University Data

Populate the database with course syllabi (Computer Science, Electronics, Mathematics), lecture notes, past exam papers, lab manuals, sample student users, votes, and ratings:

```bash
docker exec -it studyshare-backend python -m app.seed
```

### 6. Open the Application

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Interactive API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

You can immediately sign up for a new account on the frontend (you'll get 10 welcome reputation points automatically).

### 7. Running the Automated Test Suite

To run all 33 backend tests inside the Docker container:

```bash
docker exec -it -e PYTHONPATH=/app studyshare-backend pytest tests/ -v
```

To run the frontend TypeScript validation and production build check:

```bash
cd frontend
npm run build
```

---

## Continuous Integration (CI)

Every commit and pull request triggers automated checks via GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

- **Backend CI**: Runs a dedicated PostgreSQL 16 container, applies Alembic migrations, runs database seeding, executes Ruff linter and format verification, and runs the 33-test Pytest suite.
- **Frontend CI**: Validates clean dependencies (`npm ci`), executes ESLint rules, and runs `npm run build` (TypeScript compilation + Vite bundle check).
- **Docker Validation**: Synthesizes and tests both development and production `docker-compose` YAML configs and builds both backend and frontend container images.

---

## Design Decisions

We deliberately avoided the generic "purple-gradient SaaS" look in favor of an **academic engineering ledger**:

- **Paper Canvas & Carbon Ink**: Warm archival paper neutrals (`#FBF9F5` light, `#121110` dark) paired with terracotta (`#C85A32`) as our single dominant interactive color.
- **Space Grotesk + Plus Jakarta Sans**: Space Grotesk gives course codes (`CS204`), semester badges, and technical metrics a structured feel, while Plus Jakarta Sans keeps dense lists legible on phone screens between classes.
- **Information Density**: Students cramming before an exam need quick scans, not floaty cards with 40px padding. We provide both a rich list view and a high-density compact table view.
- **Snappy Motion**: Transitions are mechanical and fast (≤120ms) rather than slow decorative easing curves.

For full token tables, spacing rules, and component specs, see [DESIGN.md](DESIGN.md).

---

## Known Limitations & Roadmap

We built this for real campus use, which means acknowledging trade-offs we had to make for the current version:

1. **Local Disk Storage vs. Object Storage**: Currently, uploaded PDFs and files are stored on the local container volume (`/app/uploads`). For a multi-node production deployment, this needs an S3/Cloudflare R2 storage provider with pre-signed upload URLs.
2. **OCR for Handwritten Notes**: Right now, search matches resource titles, descriptions, and taxonomy names. Scanned handwritten notes aren't full-text indexed yet — adding an asynchronous OCR worker (Tesseract/PaddleOCR) is on our wishlist.
3. **Real-time Push Notifications**: If a resource you bookmarked receives an updated version (`v2`), you only see it when browsing. Adding WebSockets or email alerts for followed resources would be a huge quality-of-life win.
4. **University SSO / Eduroam Auth**: Currently using JWT auth with university email addresses. Adding SAML/OAuth2 campus single sign-on would streamline onboarding for campus IT.
5. **PDF In-Reader Dark Inversion**: While the app has a dedicated dark mode, viewing white PDF backgrounds at night can still be harsh. Adding an optional canvas inversion filter in the PDF viewer is planned.

---

## Contributing

Interested in adding features or fixing bugs? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for local environment setup, testing requirements, and commit conventions.

---

## License

This project is open-source under the [MIT License](LICENSE).
