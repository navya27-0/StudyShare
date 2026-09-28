import sys
from collections.abc import AsyncGenerator
from pathlib import Path

# Ensure backend root directory is in sys.path for robust test discovery
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.database import get_db_session
from app.main import app

settings = get_settings()
# NullPool avoids connection sharing across multiple event loops in pytest
test_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    echo=False,
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db_session] = override_get_db_session


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    """Obtain auth headers for test student."""
    login_res = await client.post(
        "/api/auth/login",
        json={"email": "arvind.raman@student.univ.edu", "password": "StudyShare2024!"},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def other_auth_headers(client: AsyncClient):
    """Obtain auth headers for another student to test authorization boundaries."""
    login_res = await client.post(
        "/api/auth/login",
        json={"email": "sneha.rao@student.univ.edu", "password": "StudyShare2024!"},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_auth_headers(client: AsyncClient):
    """Obtain auth headers for administrator (Prof. Sharma)."""
    login_res = await client.post(
        "/api/auth/login",
        json={"email": "prof.sharma@university.edu", "password": "StudyShare2024!"},
    )
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    token = login_res.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}
