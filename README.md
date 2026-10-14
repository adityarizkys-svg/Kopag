# Kopag

## Setup Backend

### Requirements
- Node.js and npm
- PostgreSQL
- `psql` available in your terminal to apply the migration

### 1. Install dependencies
```powershell
cd server
npm install
cd ..
```

### 2. Configure environment
From the repository root, copy the example file and update its values:
```powershell
Copy-Item server/.env.example server/.env
```

Set `DATABASE_URL` to your PostgreSQL connection string and replace `JWT_SECRET` with a long, random secret. Keep `.env` private and do not commit it.

### 3. Create the database schema
Create a PostgreSQL database, then run the initial migration from the repository root:
```powershell
psql "postgresql://username:password@localhost:5432/database_name" -f server/migrations/001_initial_schema.sql
```

### 4. Start the backend
```powershell
cd server
npm run dev
```

The API listens on `http://localhost:5000` by default. Check it at `GET /api/v1/health`.

### Run tests
```powershell
cd server
npm test -- --runInBand
```

See [docs/api_specification.md](docs/api_specification.md) for the available endpoints.
