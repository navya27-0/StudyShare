# Production-ready Dockerfile for FastAPI Backend
FROM python:3.11-slim AS runtime

WORKDIR /app

# Ensure unbuffered logs and prevent bytecode caching
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install minimal OS runtime dependencies (curl for container healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies in a cached layer
COPY requirements.txt .
RUN pip install -r requirements.txt

# Create a non-root dedicated application user for least-privilege security
RUN groupadd -g 1000 studyshare && \
    useradd -u 1000 -g studyshare -s /bin/bash -m studyshare && \
    mkdir -p /app/uploads && \
    chown -R studyshare:studyshare /app

# Copy application source code and migrations
COPY . .
RUN chown -R studyshare:studyshare /app

USER studyshare

EXPOSE 8000

# Container healthcheck testing API health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Production server command with multiple workers and proxy headers support
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
