# REST API Specification

**Base URL:** `http://localhost:5000/api/v1`

All request bodies use JSON. Error responses use `{ "success": false, "message": "..." }`.

## Health Check
`GET /health` requires no authentication.

## Authentication
- `POST /auth/register` – register an EMPLOYEE account; body: `email`, `password`, `fullName`.
- `POST /auth/login` – authenticate and return user, access token, and refresh token.
- `POST /auth/refresh` – exchange a valid stored refresh token for a new access token.
- `POST /auth/logout` – revoke the supplied refresh token.
- `GET /auth/me` – return the current authenticated user; requires Bearer access token.

A successful login response has the following structure:
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": { "id": 1, "email": "owner@example.com", "fullName": "Owner", "role": "OWNER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

## Reports

Both report endpoints require an access token and the `OWNER` role.

### Dashboard
`GET /reports/dashboard`

Returns:
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

### Stock history
`GET /reports/stock-history`

Optional query parameters:
- `page`: positive integer; default 1.
- `limit`: integer 1–100; default 10.
- `type`: `IN` or `OUT`.
- `productId`: positive integer.
- `from`, `to`: valid `YYYY-MM-DD` dates; both ends are inclusive.

Example:
`GET /reports/stock-history?page=1&limit=10&type=IN&from=2026-11-01&to=2026-11-04`

Response data contains `items` and `pagination` (`page`, `limit`, `total`, `totalPages`).

## Authorization
Roles are `OWNER` and `EMPLOYEE`. Product and stock permissions must also be enforced by their respective routes when those modules are implemented.
