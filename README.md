# StudyShare

Academic resource sharing platform for college students to browse, upload, and rate study materials (lecture notes, past question papers, lab records, syllabus references) organized by **Subject → Unit → Topic**.

## Architecture & Monorepo Structure

```text
StudyShare/
├── frontend/     # React 19, TypeScript, Vite, Lucide Icons
├── backend/      # FastAPI, Python 3.11+, SQLAlchemy 2.0 (async), Alembic
├── infra/        # Docker Compose (PostgreSQL 16 + Backend + Frontend)
├── DESIGN.md     # Design system and visual specification
└── style-tile.html # Visual design preview
```

## Quick Start (Docker Compose)

Run the entire stack with local PostgreSQL, FastAPI backend, and React frontend:

```bash
docker compose -f infra/docker-compose.yml up --build
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## Local Development Without Docker

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Migrations (Alembic)

```bash
cd backend
alembic revision -m "add_table_name"
alembic upgrade head
```

### 4. Code Quality & Formatting

```bash
# Backend linting & formatting (Ruff)
cd backend
ruff check --fix .
ruff format .

# Frontend linting & formatting (ESLint + Prettier)
cd frontend
npm run lint
npm run format
```
