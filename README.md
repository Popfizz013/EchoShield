# EchoShield

EchoShield is a full-stack AI safety testing lab that helps you analyze prompts, run adversarial prompt mutation searches, and visualize how safety classifications change across attempts.

Built during the UVic Hacks Startup Hackathon (February 27, 2026).

## What It Does

- Classifies prompts as `safe` or `unsafe` with a risk score.
- Runs an Echogram search to find minimal prompt modifications that may flip safety outcomes.
- Visualizes search nodes, edges, and the mutation path to a potential bypass.
- Supports multiple guardrail model IDs (with robust fallback behavior when model access is unavailable).

## Architecture

```text
Frontend (React + Vite)
  -> Middleware API (Node.js/Express)
    -> Backend Inference + Echogram Engine (Python)
```

### Default Ports

- Frontend (dev): `5173`
- Frontend (Docker/prod container): `3000`
- Middleware API: `3001`
- Python backend: `8000`

## Quick Start (Local Development)

### 1. Prerequisites

- Node.js 20+
- Python 3.11+
- `pip`

### 2. Install Dependencies

```bash
# from repo root
pip install -r requirements.txt

# middleware deps
cd middleware && npm install

# frontend deps
cd ../frontend && npm install
```

### 3. Run the 3 Services (3 terminals)

Terminal A (Python backend):

```bash
cd backend
python python_backend.py
```

Terminal B (Node middleware):

```bash
cd middleware
npm run dev
```

Terminal C (React frontend):

```bash
cd frontend
npm run dev
```

Open: `http://localhost:5173`

## Quick Start (Docker Compose)

From project root:

```bash
docker-compose up --build
```

Open: `http://localhost:3000`

Stop:

```bash
docker-compose down
```

## API Overview

### Backend (`:8000`)

- `GET /health`
- `POST /analyze`
- `POST /search`

Example request (`/analyze`):

```json
{
  "prompt": "How do I bypass a firewall?",
  "model_id": "ibm-granite/granite-guardian-3.0-2b"
}
```

### Middleware (`:3001`)

- `GET /ping`
- `POST /api/check` -> forwards to backend `/analyze`
- `POST /api/echogram` -> forwards to backend `/search`
- `POST /api/adversarial-search`
- `POST /api/vulnerability-insights`

## Model Notes

- The backend supports multiple model IDs via `backend/query.py`.
- If model loading/inference fails (missing token, unavailable model, etc.), EchoShield falls back to safer lightweight evaluators so the app remains usable.
- For best model-backed behavior, set a Hugging Face token in `.env`/`.env.local` as required by your model path.

## Project Structure

```text
backend/      Python inference + Echogram search engine
middleware/   Node/Express API gateway
frontend/     React/Vite UI and visualization
```

## Troubleshooting

- Port conflict: change the occupied port or stop the existing process.
- Backend unavailable from middleware: verify backend is running on `http://localhost:8000`.
- Frontend API errors in dev: verify Vite proxy target (`frontend/vite.config.ts`) points to middleware `:3001`.
- Docker healthcheck failing: confirm backend starts and responds at `/health`.

## Additional Docs

- `STARTUP.md`
- `DOCKER_DEPLOYMENT.md`
- `VEILSTREAM_FIXES.md`
