# EduSphere — Auth API Documentation

> **Base URL:** `http://localhost:8000/api/auth`  
> **Content-Type:** `application/json`

---

## 1. Register Student

Sends a 6-digit OTP to the provided email. The user must verify their email in the next step to complete registration.

```
POST /api/auth/register
```

### Request Body

| Field      | Type   | Required | Rules |
|------------|--------|----------|-------|
| `name`     | string | Yes      | 3–10 characters |
| `email`    | string | Yes      | Valid email |
| `password` | string | Yes      | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special character |

### Demo Input

```json
{
  "name": "Masad",
  "email": "masad@example.com",
  "password": "Pass@1234"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent to email. Please verify to complete registration.",
  "data": null
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 409 | `"User with this email already exists"` |
| 400 | Validation error (invalid body shape) |

---

## 2. Verify Email (Complete Registration)

Verifies the OTP sent during registration. On success, creates the user account and returns JWT tokens.

```
POST /api/auth/verify-email
```

### Request Body

| Field   | Type   | Required | Rules |
|---------|--------|----------|-------|
| `email` | string | Yes | Valid email |
| `otp`   | string | Yes | Exactly 6 characters |

### Demo Input

```json
{
  "email": "masad@example.com",
  "otp": "482910"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Student registered successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "clxyz123...",
      "name": "Masad",
      "email": "masad@example.com",
      "role": "STUDENT",
      "status": "ACTIVE",
      "emailVerified": true,
      "authProvider": "CREDENTIAL",
      "createdAt": "2026-09-15T10:00:00.000Z",
      "updatedAt": "2026-09-15T10:00:00.000Z"
    },
    "studentProfile": null
  }
}
```

> Tokens are also set as `httpOnly` cookies: `accessToken` (24h) and `refreshToken` (7d).

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"Invalid OTP"` |
| 400 | `"OTP Does Not Match"` |
| 403 | `"User is Blocked"` |
| 403 | `"User is Deleted"` |
| 409 | `"Email Already Verified"` |
| 404 | `"Registration Data Not Found"` |

---

## 3. Login

Authenticates a user with email and password. Returns JWT tokens.

```
POST /api/auth/login
```

### Request Body

| Field      | Type   | Required | Rules |
|------------|--------|----------|-------|
| `email`    | string | Yes | Valid email |
| `password` | string | Yes | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special character |

### Demo Input

```json
{
  "email": "masad@example.com",
  "password": "Pass@1234"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

> Tokens are also set as `httpOnly` cookies: `accessToken` (24h) and `refreshToken` (7d).

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"User Not Found"` |
| 401 | `"Invalid credentials"` |
| 403 | `"User is blocked"` / `"User is deleted"` |
| 400 | `"User Already Has Account Registered With Google. Try To Login With Google."` |

---

## 4. Get Profile (Me)

Returns the authenticated user's profile. Requires a valid access token.

```
GET /api/auth/me
```

### Auth

Required. Pass via:
- Cookie: `accessToken` (set automatically after login/register)
- Header: `Authorization: Bearer <accessToken>`

### Roles Allowed

`ADMIN` · `INSTRUCTOR` · `STUDENT` · `SUPER_ADMIN`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile fetched successfully",
  "data": {
    "id": "clxyz123...",
    "name": "Masad",
    "email": "masad@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "emailVerified": true,
    "studentProfile": {
      "id": "...",
      "departmentId": "...",
      "programId": "..."
    },
    "instructorProfile": null
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 401 | `"You are not logged in. Please log in to access this resource."` |
| 403 | `"Forbidden. You don't have permission to access this resource."` |
| 404 | `"User not found"` |

---

## 5. Refresh Token

Issues new `accessToken` and `refreshToken` using the existing `refreshToken` cookie.

```
POST /api/auth/refresh-token
```

### Auth

Required via cookie: `refreshToken`

### Request Body

No body required. The refresh token is read from cookies.

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "New tokens generated successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 401 | `"Refresh token is missing"` |
| 401 | `"Invalid refresh token"` |
| 401 | `"User is inactive or not found"` |

---

## 6. Google Login

Authenticates or registers a user via Google OAuth. Pass a Google ID token.

```
POST /api/auth/google-login
```

### Request Body

| Field    | Type   | Required |
|----------|--------|----------|
| `idToken` | string | Yes |

### Demo Input

```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in with Google successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

> For new Google users, a welcome email is also sent automatically.

### Error Responses

| Status | Message |
|--------|---------|
| 401 | `"Invalid Or Expired Google Id Token"` |
| 400 | `"Google Email Not Found"` / `"Google Email User Name Not Found"` |
| 403 | `"Email Not Verified"` / `"User Is Blocked"` / `"User Is Deleted"` |

---

## 7. Forgot Password

Sends a 6-digit OTP to the user's email for password reset.

```
POST /api/auth/forgot-password
```

### Request Body

| Field   | Type   | Required |
|---------|--------|----------|
| `email` | string | Yes |

### Demo Input

```json
{
  "email": "masad@example.com"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset OTP sent to email",
  "data": null
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"User Does Not Exist!"` |
| 403 | `"User is Blocked"` / `"User Not Verified"` / `"User is Deleted"` |
| 400 | `"User Has Account With Google"` |

---

## 8. Reset Password

Resets the user's password using the OTP received from the forgot-password step.

```
POST /api/auth/reset-password
```

### Request Body

| Field        | Type   | Required | Rules |
|--------------|--------|----------|-------|
| `email`      | string | Yes | Valid email |
| `otp`        | string | Yes | Exactly 6 characters |
| `newPassword` | string | Yes | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special character |

### Demo Input

```json
{
  "email": "masad@example.com",
  "otp": "654321",
  "newPassword": "NewPass@5678"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": null
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"User Does Not Exist!"` |
| 400 | `"Invalid OTP"` / `"OTP Does Not Match"` |
| 403 | `"User is Blocked"` / `"User Not Verified"` / `"User is Deleted"` |
| 400 | `"User Has Account With Google"` |

---

## Response Format

All endpoints return responses in this shape:

```json
{
  "success": boolean,
  "statusCode": number,
  "message": string,
  "data": any,
  "meta": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  } | null
}
```

---

## Cookies

| Cookie | Lifetime | HttpOnly | SameSite | Path |
|--------|----------|----------|----------|------|
| `accessToken` | 24 hours | Yes | none | `/` |
| `refreshToken` | 7 days | Yes | none | `/` |
