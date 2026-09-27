# StudyShare — Environment Variables & Configuration

This guide details all configuration variables supported across StudyShare's backend, frontend, database, and container orchestration layers.

---

## 1. Quick Reference Table

| Variable | Target Service | Default (Dev) | Type | Required in Prod | Description |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `POSTGRES_USER` | Database, Backend | `studyshare` | String | No | PostgreSQL database username. |
| `POSTGRES_PASSWORD` | Database, Backend | `studyshare_dev` | String | **Yes** | PostgreSQL password. Must be changed in production! |
| `POSTGRES_DB` | Database, Backend | `studyshare_db` | String | No | Name of the PostgreSQL database instance. |
| `POSTGRES_HOST_PORT` | Docker / Host | `5433` | Integer | No | Host port mapped to PostgreSQL container (`5432`). |
| `ENVIRONMENT` | Backend | `development` | String | **Yes** | Runtime environment: `development` or `production`. |
| `DEBUG` | Backend | `True` | Boolean | **Yes** | Enables `/docs` Swagger UI and verbose error stack traces. Set `False` in prod. |
| `BACKEND_PORT` | Backend | `8000` | Integer | No | Internal port for the Uvicorn ASGI server. |
| `DATABASE_URL` | Backend | `postgresql+asyncpg://...` | String | **Yes** | Full async SQLAlchemy connection string with `asyncpg` driver. |
| `CORS_ORIGINS` | Backend | `http://localhost:5173,...` | CSV String | **Yes** | Comma-separated allowed origins for cross-origin browser requests. |
| `JWT_SECRET_KEY` | Backend | `studyshare_jwt_secret...` | String | **Yes** | Cryptographic secret for signing tokens. Must be high-entropy in production. |
| `JWT_ALGORITHM` | Backend | `HS256` | String | No | Algorithm for JWT signature verification. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | `30` | Integer | No | Access token time-to-live before requiring a refresh. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Backend | `7` | Integer | No | Inactive session expiration duration. |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | Backend | `5` | Integer | No | Maximum failed password attempts before IP lockout. |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Backend | `300` | Integer | No | Lockout duration window in seconds (300s = 5m). |
| `UPLOAD_DIR` | Backend | `/app/uploads` | String | No | Filesystem location for uploaded course materials. |
| `MAX_UPLOAD_SIZE_BYTES` | Backend | `52428800` (50MB) | Integer | No | Maximum allowable file upload payload size in bytes. |
| `FRONTEND_PORT` | Frontend | `5173` (Dev) / `80` (Prod) | Integer | No | Public host port mapped to the web interface. |
| `VITE_API_URL` | Frontend | `http://localhost:8000` | String | No | Base API URL queried by client-side browser fetches. |

---

## 2. Production Security Requirements

### A. Generating a High-Entropy JWT Secret Key
In production, never use the development default key. Generate a 256-bit cryptographic hex key:

```bash
# Using openssl
openssl rand -hex 32

# Or using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Add this key to your production `.env` file:
```env
JWT_SECRET_KEY=e4f9b8c2d1e0a7f5c6b3a2e1d0f8c7b6a5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0
```

### B. Securing CORS Origins
Never leave `CORS_ORIGINS=*` in production. Always restrict CORS to the exact HTTPS domain hosting your frontend SPA:

```env
CORS_ORIGINS=https://studyshare.univ.edu,https://notes.univ.edu
```

### C. Database Connection String Formatting
SQLAlchemy 2.0 requires the asyncpg driver prefix:

```text
postgresql+asyncpg://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE_NAME>
```

When connecting between Docker containers on the same bridge network (e.g. `studyshare_prod_net`), `<HOST>` is the container name (e.g., `postgres` or `studyshare-postgres-prod`), and `<PORT>` is the internal port `5432`.
