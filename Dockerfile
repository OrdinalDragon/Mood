# ============================================================
# Dockerfile - Backend FastAPI
# ============================================================

FROM python:3.9-slim

WORKDIR /app

# Install curl for healthcheck and build tools for pymongo
RUN apt-get update && apt-get install -y curl build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Create uploads directory
RUN mkdir -p /app/uploads

# Copy application code
COPY app ./app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
