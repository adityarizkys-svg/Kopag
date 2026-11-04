# Kopag – Expired Stock Management System

Backend progress is developed in the `server/` directory using the repository's current Express + PostgreSQL + JWT implementation.

## Setup Backend

### Requirements
- Node.js and npm
- PostgreSQL
- `psql` available in terminal

### 1. Install dependencies
```powershell
cd server
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` inside the `server` directory and set:
- `DATABASE_URL`
- `JWT_SECRET` (use a long, random value)
- `CORS_ORIGIN` (frontend origin)

Never commit `.env`.

### 3. Create database schema
Run both migrations from the repository root, in this order:
```powershell
psql "postgresql://username:password@localhost:5432/database_name" -f server/migrations/001_initial_schema.sql
psql "postgresql://username:password@localhost:5432/database_name" -f server/migrations/002_inventory_and_roles.sql
```

### 4. Start the backend
```powershell
cd server
npm run dev
```

Health check: `GET http://localhost:5000/api/v1/health`

### 5. Run tests
```powershell
npm test -- --runInBand
```

## Progress 8 – Reports
- `GET /api/v1/reports/dashboard` – OWNER-only dashboard counts.
- `GET /api/v1/reports/stock-history` – OWNER-only paginated stock history with optional filters.

See [Progress 8 report documentation](docs/progress-8-reports.md) and [API specification](docs/api_specification.md).

## Architecture note
The lecturer-provided guide supplied with this project describes Supabase, Supabase Auth, and RLS. The checked-in backend is currently Express + PostgreSQL + JWT. The team should confirm this architecture choice with the lecturer before claiming it fully matches the guide.
