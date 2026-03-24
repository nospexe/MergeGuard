# MergeGuard Backend Dockerfile
FROM python:3.11-slim

# Install system dependencies for Git and association mining
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the entire backend folder
COPY backend/ ./backend/
COPY .env .

# Set PYTHONPATH
ENV PYTHONPATH=/app/backend

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI using uvicorn
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
