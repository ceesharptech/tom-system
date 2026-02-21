# DDITS - Digital Driver Identification and Traffic Offence Penalty System

Web-based enforcement and driver identification platform with facial recognition and strike-based penalty management.

## Project structure

- **frontend/** – React 18 + Vite (port 5173)
- **backend/** – Express.js API (port 5000)
- **face-service/** – Python FastAPI facial recognition microservice (port 8000)

## Prerequisites

- **Node.js** v18+
- **Python** 3.9+
- **npm** (comes with Node.js)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase and JWT secrets (optional for Phase 0)
npm run dev
```

Backend runs at http://localhost:5000. Health check: `GET http://localhost:5000/api/health`

### 2. Face service

```bash
cd face-service
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Optional: edit .env for PORT, model, etc.
python main.py
# Or: uvicorn main:app --reload --port 8000
```

Face service runs at http://localhost:8000. Health check: `GET http://localhost:8000/health`

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# .env has VITE_API_URL=http://localhost:5000/api by default
npm run dev
```

Frontend runs at http://localhost:5173.

## Running all three services

Open three terminals and run one of the above in each, or use a process manager. Ensure ports 5173, 5000, and 8000 are free.

## Health checks

| Service       | URL                        |
|---------------|----------------------------|
| Backend       | http://localhost:5000/api/health |
| Face service  | http://localhost:8000/health     |
| Frontend      | http://localhost:5173 (dev server) |

Example (PowerShell):

```powershell
Invoke-WebRequest -Uri http://localhost:5000/api/health -UseBasicParsing | Select-Object -ExpandProperty Content
Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing | Select-Object -ExpandProperty Content
```

Example (bash / curl):

```bash
curl http://localhost:5000/api/health
curl http://localhost:8000/health
```

Expected: JSON with `"success": true` and `"status": "ok"` for both.

## Database (Phase 1)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migration: **supabase/migrations/001_initial_schema.sql** (creates tables, indexes, RLS, and seed data).
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to **backend/.env** (from Project Settings → API).
4. Verify using **docs/phase1-verification.md**.

## Documentation

- **docs/AGENT_CONTEXT.md** – Project context and tech stack
- **docs/development-plan.md** – Phase-by-phase build plan
- **docs/database-schema.md** – Database schema
- **docs/api-endpoints.md** – API specification
- **docs/phase1-verification.md** – Phase 1 migration verification
