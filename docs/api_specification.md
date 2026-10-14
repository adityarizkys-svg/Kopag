# REST API Specification

**Base URL:** `http://localhost:5000/api/v1`

All request bodies use JSON. Error responses have the shape `{ "success": false, "message": "..." }`.

## Health Check

`GET /health` requires no authentication.

**200**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-10-14T12:00:00.000Z"
}
```

## Register

`POST /auth/register`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

**201** returns the created user in `data`, including `id`, `email`, `full_name`, `role`, and `created_at`.

- **400** A required field is missing, the email format is invalid, or the password has fewer than 8 characters.
- **409** The email is already registered.

## Login

`POST /auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**200**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "user"
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

- **400** Email or password is missing.
- **401** Email or password is incorrect.

## Refresh Token

`POST /auth/refresh` accepts a refresh token that is present in the database and has not expired.

```json
{ "refreshToken": "eyJ..." }
```

- **200** `{ "success": true, "data": { "accessToken": "eyJ..." } }`
- **400** Refresh token is missing.
- **401** Refresh token is invalid, expired, or not found.

## Logout

`POST /auth/logout` deletes the supplied refresh token. The endpoint succeeds if the token is omitted.

```json
{ "refreshToken": "eyJ..." }
```

**200** `{ "success": true, "message": "Logout berhasil" }`

## Current User

`GET /auth/me` requires an access token in the `Authorization` header:

```text
Authorization: Bearer <accessToken>
```

- **200** `{ "success": true, "data": { "id": 1, "email": "user@example.com", "role": "user" } }`
- **401** The token is missing, invalid, or expired.