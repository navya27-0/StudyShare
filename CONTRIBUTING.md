# Contributing to StudyShare

Thanks for your interest in helping improve StudyShare! Whether you're fixing a typo in documentation, squashing a bug in mobile navigation, or adding a new feature for student revision packs, we welcome your pull requests.

This guide walks you through setting up your development environment, testing your changes, and formatting your commits to match our project conventions.

---

## 1. Ground Rules

- **Keep it student-focused**: Changes should prioritize fast scannability, accessibility on low-end devices or campus Wi-Fi, and clear error feedback.
- **Respect the Design System**: StudyShare uses an intentional "engineering ledger" aesthetic (`DESIGN.md`). Always use the established CSS custom properties (`var(--accent-core)`, `var(--bg-canvas)`, etc.) rather than hardcoding random hex colors or arbitrary card shadows.
- **No silent failures**: Never swallow network or API errors with an empty `catch {}`. Provide clear toast messages or visible inline retry banners.
- **Every list needs an empty state**: If you add a filtered view, table, or list feed, make sure it has an informative empty state explaining why nothing is there and how the user can clear filters or take action.

---

## 2. Development Setup

### Option A: Docker (Recommended)

The easiest way to get everything running in tandem is Docker Compose:

```bash
# 1. Clone your fork
git clone https://github.com/<your-username>/StudyShare.git
cd StudyShare

# 2. Configure environment
cp .env.example .env

# 3. Start containers
docker compose up --build -d

# 4. Apply database migrations
docker exec -it studyshare-backend alembic upgrade head

# 5. Populate initial course and user seeds
docker exec -it studyshare-backend python -m app.seed
```

Services will be available at:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Option B: Local Bare-Metal (Fast Frontend Iteration)

If you're only working on React UI components and want ultra-fast HMR:

```bash
# In one terminal: run Postgres & Backend via Docker
docker compose up studyshare-postgres studyshare-backend -d

# In another terminal: run the frontend locally
cd frontend
npm install
npm run dev
```

---

## 3. Git Workflow & Branching

1. Fork the repo and create your branch from `main`:
   ```bash
   git checkout -b feat/formula-sheet-preview
   ```
2. Keep branches focused on a single logical change:
   - `feat/feature-name` — new user-facing functionality
   - `fix/bug-description` — fixing an issue or broken interaction
   - `docs/topic-name` — documentation or README updates
   - `refactor/subsystem` — restructuring without changing behavior

---

## 4. Commit Conventions

We follow a consistent commit convention across the repository. Commit messages should be concise, written in the lowercase imperative mood ("add", "fix", not "added", "fixes"):

### Format

```text
<type>(<optional scope>): <imperative summary>

[optional body explaining rationale and non-obvious details]
```

### Types

| Type | When to use |
| :--- | :--- |
| `feat:` | New features, screens, or API endpoints |
| `fix:` | Bug fixes, visual repairs, or a11y corrections |
| `test:` | Adding or improving automated tests |
| `refactor:` | Code restructuring without altering functionality |
| `docs:` | Documentation, comments, or specification edits |
| `style:` / `Tweaks:` | UI polish passes, consistency alignment, spacing fixes |
| `chore:` | Tooling, dependencies, or Docker configuration updates |

### Examples from our Commit History

```text
feat: implement resource detail with inline preview, upload flow, and versioning
fix(a11y): responsive mobile navigation, tablet breakpoints, WCAG AA contrast, and keyboard navigation
feat: build admin moderation dashboard with reports queue, user management, and audit log
Tweaks: consistency pass across browse, detail and profile screens
feat: complete backend test coverage, frontend error boundaries, network error toast messaging, and rich empty states across all list views
```

---

## 5. Code Quality & Verification

Before submitting your PR, ensure the following checks pass cleanly:

### Backend Checks

Inside the Docker backend container (or your active virtual environment):

```bash
# 1. Run the full automated test suite (must pass 100%)
docker exec -it -e PYTHONPATH=/app studyshare-backend pytest tests/ -v

# 2. Check and format code with Ruff
docker exec -it studyshare-backend ruff check .
docker exec -it studyshare-backend ruff format --check .
```

### Frontend Checks

Inside the `frontend/` directory:

```bash
cd frontend

# 1. Verify TypeScript types and build output
npm run build

# 2. Run ESLint checks
npm run lint
```

### Responsive & Accessibility Sanity Check

- [ ] Does the page layout degrade gracefully on mobile screens (< 640px) without horizontal scroll blowout?
- [ ] Are clickable buttons, icons, and chips at least 44×44px touch targets?
- [ ] Can form inputs and dialogs be closed or navigated using the keyboard (`Tab`, `Escape`, `Enter`)?
- [ ] Do text elements meet WCAG AA contrast against their container background?

---

## 6. Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feat/formula-sheet-preview
   ```
2. Open a Pull Request against the `main` branch.
3. In your PR description:
   - Describe what problem this solves.
   - Attach a screenshot or short screen recording for any UI modifications.
   - Mention any related issue numbers.
4. Keep PR diffs clean: avoid mixing unrelated formatting changes or package lock churn into feature PRs.

Thank you for helping make StudyShare better for students everywhere!
