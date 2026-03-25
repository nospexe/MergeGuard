<<<<<<< HEAD
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
=======
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
>>>>>>> 03f0d6388f049a12bd00d71a66aa6f3f9ff4eeb9
