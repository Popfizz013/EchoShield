# Docker Deployment Guide for EchoShield

This guide explains how to run the entire EchoShield application using Docker Compose.

## Architecture

The application consists of three services:

1. **Backend** (Python) - Runs on port 8000
   - Provides prompt analysis and classification
   - Located in `./backend`

2. **Middleware** (Node.js) - Runs on port 3001
   - Express server that forwards requests from frontend to backend
   - Located in `./eachoshield-node`

3. **Frontend** (React/Vite) - Runs on port 3000
   - User interface for prompt analysis
   - Located in `./frontend`

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (included with Docker Desktop)

## Quick Start

### 1. Start All Services

From the project root directory, run:

```bash
docker-compose up
```

To run in detached mode (background):

```bash
docker-compose up -d
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Middleware API**: http://localhost:3001
- **Backend API**: http://localhost:8000

### 3. Stop All Services

```bash
docker-compose down
```

## Development Workflow

### Rebuild Services After Code Changes

If you modify the Dockerfile or need to rebuild:

```bash
docker-compose up --build
```

### View Logs

View logs for all services:

```bash
docker-compose logs -f
```

View logs for a specific service:

```bash
docker-compose logs -f frontend
docker-compose logs -f middleware
docker-compose logs -f backend
```

### Restart a Specific Service

```bash
docker-compose restart frontend
docker-compose restart middleware
docker-compose restart backend
```

### Stop and Remove Containers, Networks, and Volumes

```bash
docker-compose down -v
```

## Service Details

### Backend Service
- **Port**: 8000
- **Endpoints**:
  - `GET /health` - Health check
  - `POST /analyze` - Analyze a prompt
  - `POST /search` - EchoGram search

### Middleware Service
- **Port**: 3001
- **Endpoints**:
  - `GET /ping` - Health check
  - `POST /api/check` - Forward analysis request to backend
  - `POST /api/echogram` - Forward search request to backend

### Frontend Service
- **Port**: 3000
- React application with Vite dev server

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error, either:
1. Stop the process using that port
2. Modify the port mapping in `docker-compose.yml`

### Services Not Communicating

The services communicate through a Docker network called `echoshield-network`. Ensure all services are running:

```bash
docker-compose ps
```

### Fresh Start

To completely reset and rebuild:

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Environment Variables

You can modify environment variables in `docker-compose.yml`:

- `PYTHON_URL` - Backend URL for middleware (default: http://backend:8000)
- `NODE_ENV` - Node environment (default: development)
- `VITE_API_URL` - API URL for frontend (default: http://localhost:3001)

## Production Notes

For production deployment:
1. Remove volume mounts to prevent code changes in running containers
2. Set `NODE_ENV=production`
3. Build optimized frontend: `npm run build`
4. Consider using a reverse proxy (nginx) for routing
5. Add SSL/TLS certificates
6. Set proper environment variables and secrets

## Network Architecture

```
User Browser (localhost:3000)
    ↓
Frontend Container (React/Vite)
    ↓
Middleware Container (Node.js/Express) :3001
    ↓
Backend Container (Python) :8000
```

All containers communicate via the `echoshield-network` bridge network.
