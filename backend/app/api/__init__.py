from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.resources import router as resources_router
from app.api.users import router as users_router

__all__ = ["health_router", "auth_router", "resources_router", "users_router"]
