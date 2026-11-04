# Progress 8 – Backend Reports

Project: Expired Stock Management System  
Backend contributor: MHS 2 – Aditya Rizky (NPM 0112)

## Scope
This progress implements the report stage in the backend work sequence:
1. Dashboard summary.
2. Stock transaction history.
3. Authentication and OWNER-only report access.
4. Required inventory tables and project role values.
5. Automated API tests and API documentation.

## Endpoints

### GET /api/v1/reports/dashboard
Requires `Authorization: Bearer <accessToken>` and role `OWNER`.

Example response:
```json
{
  "success": true,
  "message": "Laporan dashboard berhasil diambil",
  "data": {
    "totalProducts": 12,
    "totalStock": 250,
    "layakJual": 8,
    "mendekatiExpired": 3,
    "expired": 1
  }
}
```

### GET /api/v1/reports/stock-history
Requires OWNER. Query parameters:
- `page`: positive integer, default 1.
- `limit`: integer 1–100, default 10.
- `type`: `IN` or `OUT`.
- `productId`: positive product ID.
- `from` and `to`: date in `YYYY-MM-DD`; inclusive date range.

Example: `/api/v1/reports/stock-history?page=1&limit=10&type=IN&from=2026-11-01&to=2026-11-04`

The response contains `items` and `pagination` metadata. Results are ordered newest first.

## Database migration
Run migrations in order from the repository root:
```bash
psql "$DATABASE_URL" -f server/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f server/migrations/002_inventory_and_roles.sql
```

Migration 002 converts existing `admin` users to `OWNER`, other existing users to `EMPLOYEE`, and creates categories, products, stock_transactions, and expired_logs.

## Test
From the server directory:
```bash
npm test -- --runInBand
```

The report tests cover missing authentication, role restrictions, dashboard metrics, pagination validation, date validation, and filtered stock history.

## Notes
This branch continues the repository's existing Express + PostgreSQL + JWT implementation. The lecturer's supplied backend guide describes Supabase, Supabase Auth, and RLS. The team must confirm whether the instructor approved the Express/JWT alternative before presenting it as the final project architecture.
