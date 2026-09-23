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

## 9. Change Password

Changes the password of the currently authenticated user. Available to every role (`STUDENT`, `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN`). Accounts created via Google (no password set) cannot use this flow.

```
PATCH /api/auth/change-password
```

### Auth & Roles

Any authenticated user. Requires a valid `accessToken` (cookie or `Authorization: Bearer <token>`).

### Request Body

| Field             | Type   | Required | Rules |
|-------------------|--------|----------|-------|
| `currentPassword` | string | Yes      | Current password (non-empty) |
| `newPassword`     | string | Yes      | Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special character |

### Demo Input

```json
{
  "currentPassword": "Pass@1234",
  "newPassword": "NewPass@5678"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password changed successfully",
  "data": null
}
```

On success the user's `passwordChangedAt` is updated and `needPasswordChange` is set to `false`. An email notification is sent.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"User Not Found!"` |
| 403 | `"Your account has no password set. Please use the forgot password flow instead."` |
| 401 | `"Current password is incorrect"` |
| 401 | `"Your account is blocked. Please contact the administration."` (blocked account) |
| 400 | Validation error (invalid body shape) |

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

---

# EduSphere — Student Module API Documentation

> **Base URL:** `http://localhost:8000/api/student`  
> **Content-Type:** `application/json` (except avatar upload — `multipart/form-data`)  
> **Auth:** Every route requires a valid `accessToken` (cookie or `Authorization: Bearer <token>`). Route-level role guards are listed per endpoint.

---

## 1. Apply for Enrollment

Submits a student enrollment application for admin review. `departmentName` and `programName` are resolved to IDs by the server. Only possible before a `StudentProfile` exists.

```
POST /api/student/apply
```

### Auth & Roles

`STUDENT`

### Request Body

`fullName` is taken from the authenticated user's `User.name` (via `req.user`) and is not part of the request body.

| Field             | Type        | Required | Rules |
|-------------------|-------------|----------|-------|
| `phone`           | string      | No       | —
| `departmentName`  | string      | Yes      | Must exist in DB |
| `programName`     | string      | Yes      | Must exist in chosen department |
| `enrollmentYear`  | number      | Yes      | Integer, 2000 – currentYear+1 |

### Demo Input

```json
{
  "phone": "+8801712345678",
  "departmentName": "Computer Science",
  "programName": "B.Sc in Computer Science",
  "enrollmentYear": 2026
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Enrollment application submitted successfully. Pending admin approval.",
  "data": {
    "id": "a1f2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "fullName": "Masad Rayan",
    "phone": "+8801712345678",
    "avatarUrl": null,
    "avatarPublicId": null,
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "programId": "66666666-7777-8888-9999-000000000000",
    "enrollmentYear": 2026,
    "status": "PENDING",
    "reviewedById": null,
    "reviewNote": null,
    "reviewedAt": null,
    "createdAt": "2026-09-18T10:30:00.000Z",
    "updatedAt": "2026-09-18T10:30:00.000Z",
    "department": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE",
      "isDeleted": false,
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-01T09:00:00.000Z"
    },
    "program": {
      "id": "66666666-7777-8888-9999-000000000000",
      "name": "B.Sc in Computer Science",
      "degreeType": "Bachelor's",
      "totalCredits": 140,
      "departmentId": "11111111-2222-3333-4444-555555555555",
      "isDeleted": false,
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-01T09:00:00.000Z"
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 409 | `"You are already enrolled"` |
| 409 | `"Application already submitted. You can update and resubmit it."` |
| 404 | `"Department not found"` |
| 404 | `"Program not found for this department"` |
| 400 | Validation error (invalid body shape) |

---

## 2. Update / Resubmit Application

Edits an existing `PENDING` or `REJECTED` application and resets it to `PENDING` for a new review. Cannot update an `APPROVED` application.

```
PUT /api/student/apply
```

### Auth & Roles

`STUDENT`

### Request Body

Same shape as `POST /api/student/apply`.

### Demo Input

```json
{
  "phone": "+8801712345678",
  "departmentName": "Computer Science",
  "programName": "B.Sc in Software Engineering",
  "enrollmentYear": 2026
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Enrollment application updated and resubmitted successfully",
  "data": {
    "id": "a1f2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "fullName": "Masad Hasan Rayan",
    "phone": "+8801712345678",
    "avatarUrl": null,
    "avatarPublicId": null,
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "programId": "66666666-7777-8888-9999-000000000000",
    "enrollmentYear": 2026,
    "status": "PENDING",
    "reviewedById": null,
    "reviewNote": null,
    "reviewedAt": null,
    "createdAt": "2026-09-18T10:30:00.000Z",
    "updatedAt": "2026-09-18T11:02:00.000Z",
    "department": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE"
    },
    "program": {
      "id": "66666666-7777-8888-9999-000000000000",
      "name": "B.Sc in Software Engineering",
      "degreeType": "Bachelor's",
      "totalCredits": 141,
      "departmentId": "11111111-2222-3333-4444-555555555555"
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Application not found"` |
| 409 | `"Application already approved"` |
| 404 | `"Department not found"` / `"Program not found for this department"` |

---

## 3. Get My Application

Returns the current user's enrollment application (or `null` if none exists).

```
GET /api/student/application
```

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application fetched successfully",
  "data": {
    "id": "a1f2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "fullName": "Masad Rayan",
    "phone": "+8801712345678",
    "avatarUrl": null,
    "avatarPublicId": null,
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "programId": "66666666-7777-8888-9999-000000000000",
    "enrollmentYear": 2026,
    "status": "PENDING",
    "reviewedById": null,
    "reviewNote": null,
    "reviewedAt": null,
    "createdAt": "2026-09-18T10:30:00.000Z",
    "updatedAt": "2026-09-18T10:30:00.000Z",
    "department": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE"
    },
    "program": {
      "id": "66666666-7777-8888-9999-000000000000",
      "name": "B.Sc in Computer Science",
      "degreeType": "Bachelor's",
      "totalCredits": 140,
      "departmentId": "11111111-2222-3333-4444-555555555555"
    }
  }
}
```

> If no application exists, `data` returns `null`.

---

## 4. Get My Info

Returns the full user profile: the `User` row, linked `StudentProfile` (with department/program) and `StudentApplication` (with department/program), if they exist.

```
GET /api/student/me
```

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile fetched successfully",
  "data": {
    "id": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "name": "Masad Rayan",
    "email": "masad@example.com",
    "password": null,
    "emailVerified": true,
    "role": "STUDENT",
    "status": "ACTIVE",
    "needPasswordChange": false,
    "isDeleted": false,
    "deletedAt": null,
    "authProvider": "CREDENTIAL",
    "googleId": null,
    "imagePublicId": "",
    "imageURL": "",
    "passwordChangedAt": null,
    "resetPasswordToken": null,
    "resetPasswordExpiresAt": null,
    "createdAt": "2026-09-18T09:00:00.000Z",
    "updatedAt": "2026-09-18T12:00:00.000Z",
    "studentProfile": {
      "id": "c7d8e9f0-1111-2222-3333-444455556666",
      "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
      "studentId": "CS-2026-0001",
      "fullName": "Masad Rayan",
      "phone": "+8801712345678",
      "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v1700000000/avatars/abc123.jpg",
      "avatarPublicId": "avatars/abc123",
      "departmentId": "11111111-2222-3333-4444-555555555555",
      "programId": "66666666-7777-8888-9999-000000000000",
      "currentSemesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
      "enrollmentYear": 2026,
      "cgpa": 3.75,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-09-18T12:00:00.000Z",
      "updatedAt": "2026-09-18T12:05:00.000Z",
      "department": {
        "id": "11111111-2222-3333-4444-555555555555",
        "name": "Computer Science",
        "code": "CSE"
      },
      "program": {
        "id": "66666666-7777-8888-9999-000000000000",
        "name": "B.Sc in Computer Science",
        "degreeType": "Bachelor's",
        "totalCredits": 140,
        "departmentId": "11111111-2222-3333-4444-555555555555"
      },
      "currentSemester": {
        "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
        "name": "Fall",
        "year": 2026,
        "startDate": "2026-09-01T00:00:00.000Z",
        "endDate": "2026-12-31T00:00:00.000Z",
        "isActive": true
      }
    },
    "studentApplication": {
      "id": "a1f2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
      "fullName": "Masad Rayan",
      "phone": "+8801712345678",
      "avatarUrl": null,
      "avatarPublicId": null,
      "departmentId": "11111111-2222-3333-4444-555555555555",
      "programId": "66666666-7777-8888-9999-000000000000",
      "enrollmentYear": 2026,
      "status": "APPROVED",
      "reviewedById": "77778888-9999-0000-1111-222233334444",
      "reviewNote": "Welcome aboard!",
      "reviewedAt": "2026-09-18T12:00:00.000Z",
      "createdAt": "2026-09-18T10:30:00.000Z",
      "updatedAt": "2026-09-18T12:00:00.000Z",
      "department": {
        "id": "11111111-2222-3333-4444-555555555555",
        "name": "Computer Science",
        "code": "CSE"
      },
      "program": {
        "id": "66666666-7777-8888-9999-000000000000",
        "name": "B.Sc in Computer Science",
        "degreeType": "Bachelor's",
        "totalCredits": 140,
        "departmentId": "11111111-2222-3333-4444-555555555555"
      }
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"User not found"` |

---

## 5. Update My Profile

Updates `fullName` and/or `phone` on the student's `StudentProfile`. If `fullName` changes, the `User.name` is synced too.

```
PATCH /api/student/profile
```

### Auth & Roles

`STUDENT` (requires an approved/enrolled student profile)

### Request Body

| Field      | Type   | Required | Rules |
|------------|--------|----------|-------|
| `fullName` | string | No       | 3–60 characters |
| `phone`    | string | No       | — |

### Demo Input

```json
{
  "fullName": "Masad Hasan Rayan",
  "phone": "+8801987654321"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "id": "c7d8e9f0-1111-2222-3333-444455556666",
    "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "studentId": "CS-2026-0001",
    "fullName": "Masad Hasan Rayan",
    "phone": "+8801987654321",
    "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v1700000000/avatars/abc123.jpg",
    "avatarPublicId": "avatars/abc123",
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "programId": "66666666-7777-8888-9999-000000000000",
    "enrollmentYear": 2026,
    "cgpa": 3.75,
    "department": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE"
    },
    "program": {
      "id": "66666666-7777-8888-9999-000000000000",
      "name": "B.Sc in Computer Science",
      "degreeType": "Bachelor's",
      "totalCredits": 140,
      "departmentId": "11111111-2222-3333-4444-555555555555"
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 403 | `"Student profile not found. Please complete your enrollment application first."` |

---

## 6. Upload Profile Image

Uploads a profile picture to Cloudinary. Works in two states:
- **No `StudentProfile` yet** → writes the image to the `PENDING`/`REJECTED` application (carried over on approval).
- **Enrolled** → writes to the `StudentProfile`. The previous Cloudinary image is destroyed.

```
PATCH /api/student/avatar
```

### Auth & Roles

`STUDENT`

### Request Body

`multipart/form-data` — field name `avatar`

| Field    | Type      | Required | Rules |
|----------|-----------|----------|-------|
| `avatar` | file      | Yes      | `jpeg`, `png`, `webp`, `gif`; max 5 MB |

### Demo Request (curl)

```bash
curl -X PATCH http://localhost:8000/api/student/avatar \
  -H "Authorization: Bearer <accessToken>" \
  -F "avatar=@/path/to/profile.jpg"
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile image updated successfully",
  "data": {
    "id": "c7d8e9f0-1111-2222-3333-444455556666",
    "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "studentId": "CS-2026-0001",
    "fullName": "Masad Rayan",
    "phone": "+8801712345678",
    "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v1700000000/avatars/newImg987.jpg",
    "avatarPublicId": "avatars/newImg987",
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "programId": "66666666-7777-8888-9999-000000000000",
    "enrollmentYear": 2026,
    "cgpa": 3.75,
    "department": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE"
    },
    "program": {
      "id": "66666666-7777-8888-9999-000000000000",
      "name": "B.Sc in Computer Science",
      "degreeType": "Bachelor's",
      "totalCredits": 140,
      "departmentId": "11111111-2222-3333-4444-555555555555"
    }
  }
}
```

> 🟡 Before enrollment, `data` is the updated `StudentApplication` object instead.

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"No image uploaded"` / `"Only image files are allowed"` / Multer size error |
| 403 | `"Apply for enrollment before uploading a profile image"` |
| 409 | `"Profile image cannot be updated right now"` |

---

## 7. List Registered Courses

Returns the current student's `ENROLLED` and `COMPLETED` course registrations with section, course, semester, and instructor info.

```
GET /api/student/registered-courses
```

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Registered courses fetched successfully",
  "data": [
    {
      "id": "r1e2d3c4-b5a6-7980-1a2b-3c4d5e6f7890",
      "studentId": "c7d8e9f0-1111-2222-3333-444455556666",
      "sectionId": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
      "status": "ENROLLED",
      "registeredAt": "2026-08-20T09:00:00.000Z",
      "isDeleted": false,
      "deletedAt": null,
      "section": {
        "id": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
        "sectionCode": "A",
        "courseId": "cc1d2e3f-4a5b-6c7d-8e9f-000000000000",
        "semesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
        "instructorId": "ip1d2e3f-4a5b-6c7d-8e9f-222222222222",
        "capacity": 40,
        "schedule": "Sun/Tue 10:00-11:30",
        "isDeleted": false,
        "deletedAt": null,
        "createdAt": "2026-07-01T08:00:00.000Z",
        "updatedAt": "2026-07-01T08:00:00.000Z",
        "course": {
          "id": "cc1d2e3f-4a5b-6c7d-8e9f-000000000000",
          "code": "CSE-2100",
          "title": "Data Structures",
          "creditHours": 3,
          "departmentId": "11111111-2222-3333-4444-555555555555",
          "isDeleted": false,
          "deletedAt": null,
          "createdAt": "2026-01-01T09:00:00.000Z",
          "updatedAt": "2026-01-01T09:00:00.000Z"
        },
        "semester": {
          "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
          "name": "Fall",
          "year": 2026,
          "startDate": "2026-08-01T00:00:00.000Z",
          "endDate": "2026-12-15T00:00:00.000Z",
          "isActive": true,
          "createdAt": "2026-06-01T08:00:00.000Z",
          "updatedAt": "2026-06-01T08:00:00.000Z"
        },
        "instructor": {
          "id": "ip1d2e3f-4a5b-6c7d-8e9f-222222222222",
          "userId": "u9a8b7c6-5d4e-3f2a-1b0c-9d8e7f6a5b4c",
          "fullName": "Dr. Nusrat Jahan",
          "phone": null,
          "avatarUrl": null,
          "designation": "Associate Professor",
          "departmentId": "11111111-2222-3333-4444-555555555555",
          "user": {
            "name": "Dr. Nusrat Jahan",
            "email": "nusrat@edusphere.edu"
          }
        }
      }
    }
  ]
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 403 | `"Student profile not found. Please complete your enrollment application first."` |

---

## 8. Registered Course Details

Returns a single registration (any status) with the full section detail, per-exam results, and the student's attendance records for that section.

```
GET /api/student/registered-courses/:id
```

### Path Parameters

`id` — the `CourseRegistration` id (uuid)

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Registered course details fetched successfully",
  "data": {
    "id": "r1e2d3c4-b5a6-7980-1a2b-3c4d5e6f7890",
    "studentId": "c7d8e9f0-1111-2222-3333-444455556666",
    "sectionId": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
    "status": "ENROLLED",
    "registeredAt": "2026-08-20T09:00:00.000Z",
    "isDeleted": false,
    "deletedAt": null,
    "section": {
      "id": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
      "sectionCode": "A",
      "courseId": "cc1d2e3f-4a5b-6c7d-8e9f-000000000000",
      "semesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
      "instructorId": "ip1d2e3f-4a5b-6c7d-8e9f-222222222222",
      "capacity": 40,
      "schedule": "Sun/Tue 10:00-11:30",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-07-01T08:00:00.000Z",
      "updatedAt": "2026-07-01T08:00:00.000Z",
      "course": {
        "id": "cc1d2e3f-4a5b-6c7d-8e9f-000000000000",
        "code": "CSE-2100",
        "title": "Data Structures",
        "creditHours": 3,
        "departmentId": "11111111-2222-3333-4444-555555555555"
      },
      "semester": {
        "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
        "name": "Fall",
        "year": 2026,
        "startDate": "2026-08-01T00:00:00.000Z",
        "endDate": "2026-12-15T00:00:00.000Z",
        "isActive": true
      },
      "instructor": {
        "id": "ip1d2e3f-4a5b-6c7d-8e9f-222222222222",
        "userId": "u9a8b7c6-5d4e-3f2a-1b0c-9d8e7f6a5b4c",
        "fullName": "Dr. Nusrat Jahan",
        "phone": null,
        "avatarUrl": null,
        "designation": "Associate Professor",
        "departmentId": "11111111-2222-3333-4444-555555555555",
        "user": {
          "name": "Dr. Nusrat Jahan",
          "email": "nusrat@edusphere.edu"
        }
      },
      "exams": [
        {
          "id": "e1f2a3b4-c5d6-e7f8-9a0b-1c2d3e4f5a6b",
          "sectionId": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
          "type": "QUIZ",
          "date": "2026-09-10T09:00:00.000Z",
          "totalMarks": 20,
          "createdAt": "2026-09-01T08:00:00.000Z",
          "updatedAt": "2026-09-01T08:00:00.000Z",
          "results": [
            {
              "id": "rl1a2b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
              "examId": "e1f2a3b4-c5d6-e7f8-9a0b-1c2d3e4f5a6b",
              "studentId": "c7d8e9f0-1111-2222-3333-444455556666",
              "marksObtained": 17,
              "grade": "A-",
              "gradePoint": 3.7,
              "createdAt": "2026-09-15T08:00:00.000Z",
              "updatedAt": "2026-09-15T08:00:00.000Z"
            }
          ]
        },
        {
          "id": "e2f3b4c5-d6e7-f8a9-0b1c-2d3e4f5a6b7c",
          "sectionId": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
          "type": "MIDTERM",
          "date": "2026-10-01T09:00:00.000Z",
          "totalMarks": 50,
          "createdAt": "2026-09-20T08:00:00.000Z",
          "updatedAt": "2026-09-20T08:00:00.000Z",
          "results": []
        }
      ],
      "attendances": [
        {
          "id": "at1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
          "studentId": "c7d8e9f0-1111-2222-3333-444455556666",
          "sectionId": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
          "date": "2026-09-05T00:00:00.000Z",
          "status": "PRESENT",
          "createdAt": "2026-09-05T10:00:00.000Z",
          "updatedAt": "2026-09-05T10:00:00.000Z"
        },
        {
          "id": "at2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e",
          "studentId": "c7d8e9f0-1111-2222-3333-444455556666",
          "sectionId": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
          "date": "2026-09-10T00:00:00.000Z",
          "status": "PRESENT",
          "createdAt": "2026-09-10T10:00:00.000Z",
          "updatedAt": "2026-09-10T10:00:00.000Z"
        }
      ]
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Registration not found"` |
| 403 | `"Student profile not found. Please complete your enrollment application first."` |

---

## 9. Attendance Details

Returns the student's attendance grouped by section, with per-status counts and percentage. `attended = PRESENT + LATE + EXCUSED`.

```
GET /api/student/attendance
```

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Attendance details fetched successfully",
  "data": [
    {
      "sectionId": "s1a2b3c4-d5e6-f7a8-9b0c-1d2e3f4a5b6c",
      "sectionCode": "A",
      "course": {
        "code": "CSE-2100",
        "title": "Data Structures",
        "creditHours": 3
      },
      "semester": "Fall 2026",
      "total": 10,
      "present": 8,
      "absent": 1,
      "late": 1,
      "excused": 0,
      "percentage": 90,
      "records": [
        {
          "date": "2026-09-05T00:00:00.000Z",
          "status": "PRESENT"
        },
        {
          "date": "2026-09-10T00:00:00.000Z",
          "status": "PRESENT"
        },
        {
          "date": "2026-09-12T00:00:00.000Z",
          "status": "LATE"
        },
        {
          "date": "2026-09-17T00:00:00.000Z",
          "status": "ABSENT"
        }
      ]
    }
  ]
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 403 | `"Student profile not found. Please complete your enrollment application first."` |

---

## 10. Get My Grades

Returns the student's exam results grouped by course (section), including the computed average grade point per course.

```
GET /api/student/grades
```

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Grades fetched successfully",
  "data": [
    {
      "course": {
        "code": "CSE-2100",
        "title": "Data Structures",
        "creditHours": 3
      },
      "semester": "Fall 2026",
      "sectionCode": "A",
      "exams": [
        {
          "type": "QUIZ",
          "date": "2026-09-10T09:00:00.000Z",
          "totalMarks": 20,
          "marksObtained": 17,
          "grade": "A-",
          "gradePoint": 3.7
        },
        {
          "type": "MIDTERM",
          "date": "2026-10-01T09:00:00.000Z",
          "totalMarks": 50,
          "marksObtained": 41,
          "grade": "A",
          "gradePoint": 4.0
        }
      ],
      "totalMarks": 70,
      "marksObtained": 58,
      "averageGradePoint": 3.85
    }
  ]
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 403 | `"Student profile not found. Please complete your enrollment application first."` |

---

## 11. Get Grade Details for a Registration

Returns detailed grade + attendance info for one course registration: per-exam results, attendance summary, and the course's average grade point.

```
GET /api/student/grades/:id
```

### Path Parameters

`id` — the `CourseRegistration` id (uuid)

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Grade details fetched successfully",
  "data": {
    "registrationId": "r1e2d3c4-b5a6-7980-1a2b-3c4d5e6f7890",
    "status": "ENROLLED",
    "course": {
      "id": "cc1d2e3f-4a5b-6c7d-8e9f-000000000000",
      "code": "CSE-2100",
      "title": "Data Structures",
      "creditHours": 3,
      "departmentId": "11111111-2222-3333-4444-555555555555"
    },
    "semester": {
      "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
      "name": "Fall",
      "year": 2026,
      "startDate": "2026-08-01T00:00:00.000Z",
      "endDate": "2026-12-15T00:00:00.000Z",
      "isActive": true
    },
    "sectionCode": "A",
    "attendance": {
      "totalClasses": 10,
      "attendedClasses": 9,
      "percentage": 90
    },
    "exams": [
      {
        "examId": "e1f2a3b4-c5d6-e7f8-9a0b-1c2d3e4f5a6b",
        "type": "QUIZ",
        "date": "2026-09-10T09:00:00.000Z",
        "totalMarks": 20,
        "marksObtained": 17,
        "grade": "A-",
        "gradePoint": 3.7
      },
      {
        "examId": "e2f3b4c5-d6e7-f8a9-0b1c-2d3e4f5a6b7c",
        "type": "MIDTERM",
        "date": "2026-10-01T09:00:00.000Z",
        "totalMarks": 50,
        "marksObtained": 41,
        "grade": "A",
        "gradePoint": 4.0
      }
    ],
    "averageGradePoint": 3.85
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Registration not found"` |
| 403 | `"Student profile not found. Please complete your enrollment application first."` |

---

## 12. Get My CGPA

Computes and returns the student's CGPA (weighted by credit hours) from results of `COMPLETED` course registrations. Also persists the value to `StudentProfile.cgpa`.

```
GET /api/student/cgpa
```

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "CGPA fetched successfully",
  "data": {
    "cgpa": 3.75,
    "totalCredits": 45,
    "courseCount": 15
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 403 | `"Student profile not found. Please complete your enrollment application first."` |

---

## 13. List All Applications (Admin)

Returns all student applications, optionally filtered by `status`. Only users with `ADMIN` or `SUPER_ADMIN` role can access.

```
GET /api/student/applications?status=PENDING
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN`

### Query Parameters

| Parameter | Type   | Required | Values |
|-----------|--------|----------|--------|
| `status`  | string | No       | `PENDING`, `APPROVED`, `REJECTED` |

### Demo Request

```
GET /api/student/applications?status=PENDING
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Applications fetched successfully",
  "data": [
    {
      "id": "a1f2c3d4-e5f6-7890-abcd-ef1234567890",
      "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
      "fullName": "Masad Rayan",
      "phone": "+8801712345678",
      "avatarUrl": null,
      "avatarPublicId": null,
      "departmentId": "11111111-2222-3333-4444-555555555555",
      "programId": "66666666-7777-8888-9999-000000000000",
      "enrollmentYear": 2026,
      "status": "PENDING",
      "reviewedById": null,
      "reviewNote": null,
      "reviewedAt": null,
      "createdAt": "2026-09-18T10:30:00.000Z",
      "updatedAt": "2026-09-18T10:30:00.000Z",
      "user": {
        "id": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
        "name": "Masad",
        "email": "masad@example.com",
        "imageURL": ""
      },
      "department": {
        "id": "11111111-2222-3333-4444-555555555555",
        "name": "Computer Science",
        "code": "CSE"
      },
      "program": {
        "id": "66666666-7777-8888-9999-000000000000",
        "name": "B.Sc in Computer Science",
        "degreeType": "Bachelor's",
        "totalCredits": 140,
        "departmentId": "11111111-2222-3333-4444-555555555555"
      }
    }
  ]
}
```

---

## 14. Approve Application (Admin)

Approves a `PENDING` application. Creates the `StudentProfile` (fields taken from the application, `studentId` provided by the admin) with `studentStatus: ACTIVE`, marks the application `APPROVED`, creates a `Notification`, and sends the welcome email.

- If `currentSemesterId` is **not** provided, it is auto-filled with the currently **active** semester (`isActive: true`).
- If `sectionId` is provided, the student's **fixed academic section** is set. The section must match the student's program and enrollment year, and must have available seats.

```
PATCH /api/student/applications/:id/approve
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN`

### Path Parameters

`id` — the `StudentApplication` id (uuid)

### Request Body

| Field               | Type   | Required | Rules |
|---------------------|--------|----------|-------|
| `studentId`         | string | Yes      | University roll/registration number (must be unique) |
| `reviewNote`        | string | No       | — |
| `currentSemesterId` | string | No       | Existing semester id; defaults to the active semester when omitted |
| `sectionId`         | string | No       | Existing `StudentSection` id matching the student's program + year with free seats |

### Demo Input

```json
{
  "studentId": "CS-2026-0001",
  "reviewNote": "Welcome aboard!",
  "currentSemesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
  "sectionId": "b1a2c3d4-5e6f-7890-abcd-ef1234567890"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application approved and student enrolled successfully",
  "data": {
    "id": "c7d8e9f0-1111-2222-3333-444455556666",
    "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "studentId": "CS-2026-0001",
    "fullName": "Masad Rayan",
    "phone": "+8801712345678",
    "avatarUrl": null,
    "avatarPublicId": null,
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "programId": "66666666-7777-8888-9999-000000000000",
    "studentStatus": "ACTIVE",
    "sectionId": "b1a2c3d4-5e6f-7890-abcd-ef1234567890",
    "currentSemesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
    "enrollmentYear": 2026,
    "cgpa": 0,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-09-18T12:00:00.000Z",
    "updatedAt": "2026-09-18T12:00:00.000Z",
    "department": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE"
    },
    "program": {
      "id": "66666666-7777-8888-9999-000000000000",
      "name": "B.Sc in Computer Science",
      "degreeType": "Bachelor's",
      "totalCredits": 140,
      "departmentId": "11111111-2222-3333-4444-555555555555"
    },
    "currentSemester": {
      "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
      "name": "Fall",
      "year": 2026,
      "startDate": "2026-09-01T00:00:00.000Z",
      "endDate": "2026-12-31T00:00:00.000Z",
      "isActive": true
    },
    "section": {
      "id": "b1a2c3d4-5e6f-7890-abcd-ef1234567890",
      "sectionCode": "A",
      "programId": "66666666-7777-8888-9999-000000000000",
      "enrollmentYear": 2026,
      "capacity": 40
    }
  }
}
```

> Automatic side effects: `Notification` row created + welcome email sent (`student-welcome-email.ejs`).

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"Student section does not match the student's program and enrollment year"` |
| 404 | `"Application not found"` / `"Semester not found"` / `"Student section not found"` |
| 409 | `"Application already reviewed"` |
| 409 | `"Student ID already in use"` |
| 409 | `"Student section is at full capacity"` |

---

## 15. Reject Application (Admin)

Rejects a `PENDING` application with an optional note. Creates a `Notification` and sends the rejection email (`student-application-rejected.ejs`). The student can later edit and resubmit.

```
PATCH /api/student/applications/:id/reject
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN`

### Path Parameters

`id` — the `StudentApplication` id (uuid)

### Request Body

| Field        | Type   | Required |
|--------------|--------|----------|
| `reviewNote` | string | No       |

### Demo Input

```json
{
  "reviewNote": "We could not verify your submitted enrollment information. Please update and resubmit."
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Application rejected successfully",
  "data": {
    "id": "a1f2c3d4-e5f6-7890-abcd-ef1234567890",
    "userId": "9b8c7d6e-5f4a-3b2c-1d0e-9a8b7c6d5e4f",
    "fullName": "Masad Rayan",
    "phone": "+8801712345678",
    "avatarUrl": null,
    "avatarPublicId": null,
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "programId": "66666666-7777-8888-9999-000000000000",
    "enrollmentYear": 2026,
    "status": "REJECTED",
    "reviewedById": "77778888-9999-0000-1111-222233334444",
    "reviewNote": "We could not verify your submitted enrollment information. Please update and resubmit.",
    "reviewedAt": "2026-09-18T12:10:00.000Z",
    "createdAt": "2026-09-18T10:30:00.000Z",
    "updatedAt": "2026-09-18T12:10:00.000Z"
  }
}
```

> Automatic side effects: `Notification` row created + rejection email sent (`student-application-rejected.ejs`).

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Application not found"` |
| 409 | `"Application already reviewed"` |

---

## 16. Update Student Current Semester (Admin)

Sets or clears the `currentSemester` on a student profile. Send `null` to clear it.

```
PATCH /api/student/:id/current-semester
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN`

### Path Parameters

`id` — the `StudentProfile` id (uuid)

### Request Body

| Field               | Type           | Required | Rules |
|---------------------|----------------|----------|-------|
| `currentSemesterId` | string \| null | Yes      | Existing semester id, or `null` to clear |

### Demo Input

```json
{
  "currentSemesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111"
}
```

### Response (200 OK)

Returns the updated `StudentProfile` with `department`, `program`, `currentSemester`, and `section`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Student profile not found"` / `"Semester not found"` |

---

## 17. Update Student Section (Admin)

Assigns or clears the student's **fixed academic section**. Send `null` to unassign. The section must match the student's program and enrollment year and must have a free seat (the student's own seat is not counted twice).

```
PATCH /api/student/:id/section
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN`

### Path Parameters

`id` — the `StudentProfile` id (uuid)

### Request Body

| Field       | Type           | Required | Rules |
|-------------|----------------|----------|-------|
| `sectionId` | string \| null | Yes      | Existing `StudentSection` id, or `null` to clear |

### Demo Input

```json
{
  "sectionId": "b1a2c3d4-5e6f-7890-abcd-ef1234567890"
}
```

### Response (200 OK)

Returns the updated `StudentProfile` with `department`, `program`, `currentSemester`, and `section`.

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"Student section does not match the student's program and enrollment year"` |
| 404 | `"Student profile not found"` / `"Student section not found"` |
| 409 | `"Student section is at full capacity"` |

---

## 18. Update Student Status (Admin)

Changes a student's `studentStatus` (`PENDING`, `ACTIVE`, `INACTIVE`, `GRADUATED`, `DROPPED_OUT`). Useful to activate previously approved students whose profile was created before automatic activation.

```
PATCH /api/student/:id/status
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN`

### Path Parameters

`id` — the `StudentProfile` id (uuid)

### Request Body

| Field    | Type    | Required | Rules |
|----------|---------|----------|-------|
| `status` | string  | Yes      | One of `PENDING`, `ACTIVE`, `INACTIVE`, `GRADUATED`, `DROPPED_OUT` |

### Demo Input

```json
{
  "status": "ACTIVE"
}
```

### Response (200 OK)

Returns the updated `StudentProfile` with `department`, `program`, `currentSemester`, and `section`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Student profile not found"` |

---

## 19. Get Transcript (PDF)

Generates a PDF academic transcript for the current student. By default it includes all semesters; pass `semesterId` to limit it to one semester. Courses are grouped by semester; grade point is the average of the per-exam `gradePoint` values. Only `COMPLETED` registrations are included.

```
GET /api/student/transcript?semesterId=
```

### Auth & Roles

`STUDENT`

### Query Parameters

| Field        | Type   | Required | Rules |
|--------------|--------|----------|-------|
| `semesterId` | string | No       | Existing semester id; omit for full transcript |

### Demo Request

```
GET /api/student/transcript?semesterId=sm1d2e3f-4a5b-6c7d-8e9f-111111111111
```

### Response (200 OK)

Not JSON. Returns the PDF file bytes directly:

- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="transcript-<studentId>.pdf"`

The PDF contains the student name, `studentId`, department, program, section, enrollment year, a per-semester breakdown (course code/title, credit hours, grade, grade point, GPA) and a final summary with total credits attempted, credits earned, and CGPA.

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Student profile not found"` |
| 404 | `"Semester not found"` |
| 400 | Validation error (invalid query) |

---

## Student Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/student/apply` | STUDENT | Submit enrollment application |
| 2 | PUT | `/api/student/apply` | STUDENT | Update/resubmit application |
| 3 | GET | `/api/student/application` | STUDENT | Get my application |
| 4 | GET | `/api/student/me` | STUDENT | Get full user/profile info |
| 5 | PATCH | `/api/student/profile` | STUDENT | Update fullName/phone |
| 6 | PATCH | `/api/student/avatar` | STUDENT | Upload profile image (multipart) |
| 7 | GET | `/api/student/registered-courses` | STUDENT | List registered courses |
| 8 | GET | `/api/student/registered-courses/:id` | STUDENT | Registered course details |
| 9 | GET | `/api/student/attendance` | STUDENT | Attendance summary by course |
| 10 | GET | `/api/student/grades` | STUDENT | Grades grouped by course |
| 11 | GET | `/api/student/grades/:id` | STUDENT | Grade details for a registration |
| 12 | GET | `/api/student/cgpa` | STUDENT | Compute and return CGPA |
| 13 | GET | `/api/student/applications` | ADMIN, SUPER_ADMIN | List all applications |
| 14 | PATCH | `/api/student/applications/:id/approve` | ADMIN, SUPER_ADMIN | Approve application (status ACTIVE, auto semester, optional section) |
| 15 | PATCH | `/api/student/applications/:id/reject` | ADMIN, SUPER_ADMIN | Reject application |
| 16 | PATCH | `/api/student/:id/current-semester` | ADMIN, SUPER_ADMIN | Set/clear a student's current semester |
| 17 | PATCH | `/api/student/:id/section` | ADMIN, SUPER_ADMIN | Assign/clear a student's fixed section |
| 18 | PATCH | `/api/student/:id/status` | ADMIN, SUPER_ADMIN | Update student status (e.g. ACTIVE) |
| 19 | GET | `/api/student/transcript` | STUDENT | Download academic transcript as PDF |

---

# EduSphere — Department Module API Documentation

Departments are the top level of the academic hierarchy (`Department → Program → Course`). All routes require an `ADMIN` or `SUPER_ADMIN` token. Deletes are **hard deletes** with `ON DELETE CASCADE`: deleting a department permanently removes all of its programs, courses, sections, registrations, attendance, exams, results, student profiles, instructor profiles, and applications.

Both `name` and `code` are globally unique.

## 1. Create Department

```
POST /api/departments
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field  | Type   | Required | Rules |
|--------|--------|----------|-------|
| `name` | string | Yes      | 2–100 characters, unique |
| `code` | string | Yes      | 2–20 characters, unique |

### Demo Input

```json
{
  "name": "Computer Science",
  "code": "CSE"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Department created successfully",
  "data": {
    "id": "11111111-2222-3333-4444-555555555555",
    "name": "Computer Science",
    "code": "CSE",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-01-01T09:00:00.000Z",
    "updatedAt": "2026-01-01T09:00:00.000Z"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 409 | `"Department with this name already exists"` |
| 409 | `"Department with this code already exists"` |
| 400 | Validation error (invalid body shape) |

---

## 2. List Departments

```
GET /api/departments?searchTerm=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Query Parameters

| Param        | Type   | Required | Default | Rules |
|--------------|--------|----------|---------|-------|
| `searchTerm` | string | No       | —       | Case-insensitive match on `name` or `code` |
| `page`       | number | No       | `1`     | ≥ 1 |
| `limit`      | number | No       | `10`    | 1–100 |

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Departments fetched successfully",
  "data": [
    {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-01T09:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 3. Get Department by ID

```
GET /api/departments/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Same shape as the create response `data`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Department not found"` |

---

## 4. Update Department

```
PATCH /api/departments/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

At least one field. Same rules as create.

| Field  | Type   | Required |
|--------|--------|----------|
| `name` | string | No       |
| `code` | string | No       |

### Demo Input

```json
{
  "name": "Computer Science & Engineering"
}
```

### Response (200 OK)

Same shape as the create response `data`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Department not found"` |
| 409 | `"Department with this name already exists"` / `"Department with this code already exists"` |

---

## 5. Delete Department (hard, cascading)

```
DELETE /api/departments/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Permanently deletes the department and, via `ON DELETE CASCADE`, every dependent record (programs, courses, sections, registrations, attendance, exams, results, student profiles, instructor profiles, and applications). Returns the deleted department row.

> **Warning:** This is destructive and irreversible. Prefer deleting empty departments or reassigning members first.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Department not found"` |

---

## Department Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/departments` | ADMIN, SUPER_ADMIN | Create a department |
| 2 | GET | `/api/departments` | ADMIN, SUPER_ADMIN | List departments (search + pagination) |
| 3 | GET | `/api/departments/:id` | ADMIN, SUPER_ADMIN | Get a department |
| 4 | PATCH | `/api/departments/:id` | ADMIN, SUPER_ADMIN | Update a department |
| 5 | DELETE | `/api/departments/:id` | ADMIN, SUPER_ADMIN | Hard-delete a department (cascades) |

---

# EduSphere — Program Module API Documentation

Programs belong to a department (`Program.departmentId`). All routes require an `ADMIN` or `SUPER_ADMIN` token. Deletes are **hard deletes** with `ON DELETE CASCADE`: deleting a program permanently removes its student profiles and student applications.

`(name, departmentId)` is unique.

## 1. Create Program

```
POST /api/programs
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field          | Type   | Required | Rules |
|----------------|--------|----------|-------|
| `name`         | string | Yes      | 2–100 characters, unique within the department |
| `degreeType`   | string | Yes      | 2–50 characters (e.g. `"Bachelor's"`) |
| `totalCredits` | number | Yes      | Integer, > 0 |
| `departmentId` | string | Yes      | Must reference an existing, non-deleted department |

### Demo Input

```json
{
  "name": "B.Sc in Computer Science",
  "degreeType": "Bachelor's",
  "totalCredits": 140,
  "departmentId": "11111111-2222-3333-4444-555555555555"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Program created successfully",
  "data": {
    "id": "66666666-7777-8888-9999-000000000000",
    "name": "B.Sc in Computer Science",
    "degreeType": "Bachelor's",
    "totalCredits": 140,
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-01-01T09:00:00.000Z",
    "updatedAt": "2026-01-01T09:00:00.000Z",
    "department": {
      "id": "11111111-2222-3333-4444-555555555555",
      "name": "Computer Science",
      "code": "CSE",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-01T09:00:00.000Z"
    }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Department not found"` |
| 409 | `"Program with this name already exists in this department"` |
| 400 | Validation error (invalid body shape) |

---

## 2. List Programs

```
GET /api/programs?departmentId=&searchTerm=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Query Parameters

| Param          | Type   | Required | Default | Rules |
|----------------|--------|----------|---------|-------|
| `departmentId` | string | No       | —       | Filter by department |
| `searchTerm`   | string | No       | —       | Case-insensitive match on `name` or `degreeType` |
| `page`         | number | No       | `1`     | ≥ 1 |
| `limit`        | number | No       | `10`    | 1–100 |

### Response (200 OK)

`data` is an array of programs (each includes `department`); `meta` matches the Department list shape.

---

## 3. Get Program by ID

```
GET /api/programs/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Same shape as the create response `data`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Program not found"` |

---

## 4. Update Program

```
PATCH /api/programs/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

Any subset of the create fields, same rules.

### Demo Input

```json
{
  "totalCredits": 144
}
```

### Response (200 OK)

Same shape as the create response `data`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Program not found"` / `"Department not found"` |
| 409 | `"Program with this name already exists in this department"` |

---

## 5. Delete Program (hard, cascading)

```
DELETE /api/programs/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Permanently deletes the program and, via `ON DELETE CASCADE`, its student profiles and student applications. Returns the deleted program row (with its department).

> **Warning:** This is destructive and irreversible.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Program not found"` |

---

## Program Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/programs` | ADMIN, SUPER_ADMIN | Create a program |
| 2 | GET | `/api/programs` | ADMIN, SUPER_ADMIN | List programs (filter + search + pagination) |
| 3 | GET | `/api/programs/:id` | ADMIN, SUPER_ADMIN | Get a program |
| 4 | PATCH | `/api/programs/:id` | ADMIN, SUPER_ADMIN | Update a program |
| 5 | DELETE | `/api/programs/:id` | ADMIN, SUPER_ADMIN | Hard-delete a program (cascades) |

---

# EduSphere — Course Module API Documentation

Courses belong to a department (`Course.departmentId`) and may declare other courses as prerequisites (`CoursePrerequisite`). `code` is globally unique. Reads are open to any authenticated role; writes require `ADMIN` or `SUPER_ADMIN`.

## 1. Create Course

```
POST /api/courses
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field             | Type     | Required | Rules |
|-------------------|----------|----------|-------|
| `code`            | string   | Yes      | 2–20 characters, globally unique |
| `title`           | string   | Yes      | 2–200 characters |
| `creditHours`     | number   | Yes      | Positive integer |
| `departmentId`    | string   | Yes      | Must reference an existing department |
| `prerequisiteIds` | string[] | No       | Existing course ids; no duplicates, not self |

### Demo Input

```json
{
  "code": "CSE201",
  "title": "Data Structures",
  "creditHours": 3,
  "departmentId": "11111111-2222-3333-4444-555555555555",
  "prerequisiteIds": ["22222222-3333-4444-5555-666666666666"]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Course created successfully",
  "data": {
    "id": "33333333-4444-5555-6666-777777777777",
    "code": "CSE201",
    "title": "Data Structures",
    "creditHours": 3,
    "departmentId": "11111111-2222-3333-4444-555555555555",
    "isDeleted": false,
    "deletedAt": null,
    "department": { "id": "11111111-2222-3333-4444-555555555555", "name": "Computer Science", "code": "CSE" },
    "prerequisites": [
      { "id": "…", "courseId": "33333333-…", "prerequisiteId": "22222222-…", "prerequisite": { "code": "CSE101", "title": "Introduction to Programming" } }
    ]
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"One or more prerequisite courses were not found"` / `"Duplicate prerequisite course ids are not allowed"` / `"A course cannot be a prerequisite of itself"` |
| 404 | `"Department not found"` |
| 409 | `"Course with this code already exists"` |

## 2. List Courses

```
GET /api/courses?departmentId=&searchTerm=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Query Parameters

| Field          | Type   | Required | Notes |
|----------------|--------|----------|-------|
| `departmentId` | string | No       | Filter by department |
| `searchTerm`   | string | No       | Matches `code` or `title` (case-insensitive) |
| `page`         | number | No       | Default `1` |
| `limit`        | number | No       | Default `10`, max `100` |

### Response (200 OK)

Paginated `data` array plus `meta: { page, limit, total, totalPages }`. Each item includes `department` and `prerequisites`.

## 3. Get Course by ID

```
GET /api/courses/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course not found"` |

## 4. Update Course

```
PATCH /api/courses/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

Any of `code`, `title`, `creditHours`, `departmentId`, `prerequisiteIds` (all optional). When `prerequisiteIds` is provided it **replaces** the current prerequisite set (send `[]` to clear).

### Error Responses

| Status | Message |
|--------|---------|
| 400 | Prerequisite validation errors |
| 404 | `"Course not found"` / `"Department not found"` |
| 409 | `"Course with this code already exists"` |

## 5. Delete Course (hard, cascading)

```
DELETE /api/courses/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Permanently deletes the course; `ON DELETE CASCADE` removes its sections (and their registrations/attendance/exams/results) and prerequisite links. Returns the deleted course row.

> **Warning:** This is destructive and irreversible.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course not found"` |

## Course Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/courses` | ADMIN, SUPER_ADMIN | Create a course (with prerequisites) |
| 2 | GET | `/api/courses` | all roles | List courses (filter + search + pagination) |
| 3 | GET | `/api/courses/:id` | all roles | Get a course |
| 4 | PATCH | `/api/courses/:id` | ADMIN, SUPER_ADMIN | Update a course / replace prerequisites |
| 5 | DELETE | `/api/courses/:id` | ADMIN, SUPER_ADMIN | Hard-delete a course (cascades) |

---

# EduSphere — Semester Module API Documentation

Semesters (`name`, `year`, `startDate`, `endDate`, `registrationDeadline`, `isActive`) are the "when" of the academic calendar and are referenced by `Section`. `(name, year)` is unique. Only one semester is active at a time. `registrationDeadline` (optional) closes course enrollment: students can enroll only while `now <= registrationDeadline`; when unset it falls back to `startDate`. Reads are open to any authenticated role; writes require `ADMIN` or `SUPER_ADMIN`.

## 1. Create Semester

```
POST /api/semesters
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field                | Type    | Required | Rules |
|----------------------|---------|----------|-------|
| `name`               | string  | Yes      | 2–50 characters, unique with `year` |
| `year`               | number  | Yes      | 2000–2100 |
| `startDate`          | date    | Yes      | ISO date string |
| `endDate`            | date    | Yes      | Must be after `startDate` |
| `registrationDeadline` | date  | No       | On or before `endDate`; closes course enrollment |
| `isActive`           | boolean | No       | Default `false`; setting `true` deactivates all others |

### Demo Input

```json
{
  "name": "Fall",
  "year": 2026,
  "startDate": "2026-09-01",
  "endDate": "2026-12-31",
  "registrationDeadline": "2026-10-15",
  "isActive": true
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Semester created successfully",
  "data": {
    "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
    "name": "Fall",
    "year": 2026,
    "startDate": "2026-09-01T00:00:00.000Z",
    "endDate": "2026-12-31T00:00:00.000Z",
    "registrationDeadline": "2026-10-15T00:00:00.000Z",
    "isActive": true,
    "_count": { "sections": 0, "students": 0 }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"startDate must be before endDate"` |
| 409 | `"Semester with this name and year already exists"` |

## 2. List Semesters

```
GET /api/semesters?year=&isActive=&searchTerm=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Query Parameters

| Field        | Type    | Required | Notes |
|--------------|---------|----------|-------|
| `year`       | number  | No       | Filter by year |
| `isActive`   | boolean | No       | `true` / `false` |
| `searchTerm` | string  | No       | Matches `name` (case-insensitive) |
| `page`       | number  | No       | Default `1` |
| `limit`      | number  | No       | Default `10`, max `100` |

### Response (200 OK)

Paginated `data` plus `meta`. Each item includes `_count.sections` and `_count.students`.

## 3. Get Semester by ID

```
GET /api/semesters/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Semester not found"` |

## 4. Update Semester

```
PATCH /api/semesters/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

Any of `name`, `year`, `startDate`, `endDate`, `registrationDeadline`, `isActive` (all optional). Setting `isActive: true` deactivates all other semesters.

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"startDate must be before endDate"` |
| 400 | `"registrationDeadline must be on or before endDate"` |
| 404 | `"Semester not found"` |
| 409 | `"Semester with this name and year already exists"` |

## 5. Delete Semester

```
DELETE /api/semesters/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Deletes the semester. Blocked while any `Section` references it, to protect academic records.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Semester not found"` |
| 409 | `"Semester has sections; delete or move them first"` |

## Semester Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/semesters` | ADMIN, SUPER_ADMIN | Create a semester (single-active enforced) |
| 2 | GET | `/api/semesters` | all roles | List semesters (filter + search + pagination) |
| 3 | GET | `/api/semesters/:id` | all roles | Get a semester |
| 4 | PATCH | `/api/semesters/:id` | ADMIN, SUPER_ADMIN | Update a semester |
| 5 | DELETE | `/api/semesters/:id` | ADMIN, SUPER_ADMIN | Delete (blocked if sections exist) |

---

# EduSphere — Course Section Module API Documentation

A `CourseSection` is one offering of a course in a semester, optionally taught by an instructor (`Course × Semester × Section`). `(courseId, semesterId, sectionCode)` is unique. `courseId` and `semesterId` are immutable after creation. Reads are open to any authenticated role; writes require `ADMIN` or `SUPER_ADMIN`.

## 1. Create Course Section

```
POST /api/course-sections
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field          | Type    | Required | Rules |
|----------------|---------|----------|-------|
| `courseId`     | string  | Yes      | Existing course |
| `semesterId`   | string  | Yes      | Existing semester |
| `sectionCode`  | string  | Yes      | 1–10 characters; unique per course + semester |
| `instructorId` | string  | No       | Existing instructor profile; omit/`null` = unassigned |
| `capacity`     | number  | Yes      | Positive integer |
| `schedule`     | string  | No       | e.g. `"Sun/Tue 10:00-11:30"` |

### Demo Input

```json
{
  "courseId": "33333333-4444-5555-6666-777777777777",
  "semesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
  "sectionCode": "A",
  "instructorId": "99999999-8888-7777-6666-555555555555",
  "capacity": 40,
  "schedule": "Sun/Tue 10:00-11:30"
}
```

### Response (201 Created)

Returns the created course section including `course`, `semester`, and `instructor` (with the instructor's `user.name`/`user.email`).

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course not found"` / `"Semester not found"` / `"Instructor not found"` |
| 409 | `"Course section with this code already exists for this course and semester"` |

## 2. List Course Sections

```
GET /api/course-sections?courseId=&semesterId=&instructorId=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Query Parameters

| Field          | Type   | Required | Notes |
|----------------|--------|----------|-------|
| `courseId`     | string | No       | Filter by course |
| `semesterId`   | string | No       | Filter by semester |
| `instructorId` | string | No       | Filter by instructor |
| `page`         | number | No       | Default `1` |
| `limit`        | number | No       | Default `10`, max `100` |

### Response (200 OK)

Paginated `data` plus `meta`. Each item includes `course`, `semester`, and `instructor`.

## 3. Get Course Section by ID

```
GET /api/course-sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course section not found"` |

## 4. Update Course Section

```
PATCH /api/course-sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

Any of `sectionCode`, `instructorId`, `capacity`, `schedule` (all optional). `courseId` and `semesterId` cannot be changed. Send `instructorId: null` to unassign.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course section not found"` / `"Instructor not found"` |
| 409 | `"Course section with this code already exists for this course and semester"` |

## 5. Assign Instructor

```
PATCH /api/course-sections/:id/assign-instructor
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field          | Type   | Required | Rules |
|----------------|--------|----------|-------|
| `instructorId` | string | Yes      | Existing instructor profile |

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course section not found"` / `"Instructor not found"` |

## 6. Delete Course Section (hard, cascading)

```
DELETE /api/course-sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Permanently deletes the course section; `ON DELETE CASCADE` removes its registrations, attendance, exams, and results. Returns the deleted section row.

> **Warning:** This is destructive and irreversible.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course section not found"` |

## Course Section Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/course-sections` | ADMIN, SUPER_ADMIN | Create a course section |
| 2 | GET | `/api/course-sections` | all roles | List course sections (filter + pagination) |
| 3 | GET | `/api/course-sections/:id` | all roles | Get a course section |
| 4 | PATCH | `/api/course-sections/:id` | ADMIN, SUPER_ADMIN | Update a course section |
| 5 | PATCH | `/api/course-sections/:id/assign-instructor` | ADMIN, SUPER_ADMIN | Assign an instructor |
| 6 | DELETE | `/api/course-sections/:id` | ADMIN, SUPER_ADMIN | Hard-delete a course section (cascades) |

---

# EduSphere — Student Section Module API Documentation

A `StudentSection` is the student's **fixed academic section** (batch) for their entire university life. It is keyed by `(programId, enrollmentYear, sectionCode)` — e.g. "B.Sc in Computer Science · 2026 · Section A" — and has a `capacity` (seats).

Unlike a course `CourseSection` model (a single course offering in a semester), a `StudentSection` is permanent: a student admitted to Section A stays in Section A until they leave. Seat availability is **computed on the fly**:

```
enrolledCount = count of non-deleted StudentProfiles in the section
seatsAvailable = capacity - enrolledCount
```

Enrolling a student (assigning `sectionId` on approval or via admin) reduces available seats; hard-deleting a student profile frees one automatically. Reads are open to any authenticated role; writes require `ADMIN` or `SUPER_ADMIN`.

## 1. Create Student Section

```
POST /api/student-sections
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field            | Type   | Required | Rules |
|------------------|--------|----------|-------|
| `sectionCode`    | string | Yes      | 1–10 characters, unique per program + year |
| `programId`      | string | Yes      | Existing program |
| `enrollmentYear` | number | Yes      | 2000 – current year + 1 |
| `capacity`       | number | Yes      | Positive integer |

### Demo Input

```json
{
  "sectionCode": "A",
  "programId": "66666666-7777-8888-9999-000000000000",
  "enrollmentYear": 2026,
  "capacity": 40
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Student section created successfully",
  "data": {
    "id": "b1a2c3d4-5e6f-7890-abcd-ef1234567890",
    "sectionCode": "A",
    "programId": "66666666-7777-8888-9999-000000000000",
    "enrollmentYear": 2026,
    "capacity": 40,
    "enrolledCount": 0,
    "seatsAvailable": 40,
    "program": { "id": "66666666-7777-8888-9999-000000000000", "name": "B.Sc in Computer Science" }
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Program not found"` |
| 409 | `"Section with this code already exists for this program and year"` |

## 2. List Student Sections

```
GET /api/student-sections?programId=&enrollmentYear=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Query Parameters

| Field            | Type   | Required | Notes |
|------------------|--------|----------|-------|
| `programId`      | string | No       | Filter by program |
| `enrollmentYear` | number | No       | Filter by year |
| `page`           | number | No       | Default `1` |
| `limit`          | number | No       | Default `10`, max `100` |

### Response (200 OK)

Paginated `data` plus `meta`. Each item includes `program`, `enrolledCount`, and `seatsAvailable`.

## 3. Get Student Section by ID

```
GET /api/student-sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Student section not found"` |

## 4. Update Student Section

```
PATCH /api/student-sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

Any of `sectionCode`, `capacity` (all optional). `programId` and `enrollmentYear` are immutable. Capacity cannot be lowered below `enrolledCount`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Student section not found"` |
| 409 | `"Section with this code already exists for this program and year"` |
| 409 | `"Capacity cannot be lower than the current number of enrolled students"` |

## 5. Delete Student Section (hard)

```
DELETE /api/student-sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Permanently deletes the section. Blocked while any student is assigned (their `sectionId` would become `NULL` on delete).

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Student section not found"` |
| 409 | `"Student section has enrolled students; reassign them first"` |

## Student Section Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/student-sections` | ADMIN, SUPER_ADMIN | Create a student section (program + year + code) |
| 2 | GET | `/api/student-sections` | all roles | List student sections (with seat counts) |
| 3 | GET | `/api/student-sections/:id` | all roles | Get a student section |
| 4 | PATCH | `/api/student-sections/:id` | ADMIN, SUPER_ADMIN | Update code/capacity |
| 5 | DELETE | `/api/student-sections/:id` | ADMIN, SUPER_ADMIN | Hard-delete (blocked if students assigned) |

---

# Instructor Module

Instructors register with the `INSTRUCTOR` role (see **Register Student**, which now accepts an optional `role: "INSTRUCTOR"`), submit an application, and an admin/superadmin approves or rejects it. Approval creates the `InstructorProfile` (**assignment**: department + designation) and auto-generates a unique staff code (`INS-{year}-{seq:04d}`). Assigning course sections to teach is handled separately via `PATCH /api/course-sections/:id/assign-instructor`.

## 0. Register Instructor

```
POST /api/auth/register
```

Same flow as student registration; body gains an optional `role`.

### Demo Input

```json
{
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "password": "Pass@1234",
  "role": "INSTRUCTOR"
}
```

After verifying the OTP (`POST /api/auth/verify-email`) the account is created with role `INSTRUCTOR`.

## 1. Apply as Instructor

```
POST /api/instructor/apply
```

### Auth & Roles

`INSTRUCTOR`

### Request Body

| Field            | Type   | Required | Notes |
|------------------|--------|----------|-------|
| `departmentName` | string | Yes      | Existing department name |
| `phone`          | string | No       | Contact phone |
| `designation`    | string | No       | e.g. `"Lecturer"` |
| `coverNote`      | string | No       | Short message to reviewers |

`name`/`email` are taken from the authenticated user. One application per user.

### Error Responses

| Status | Message |
|--------|---------|
| 409 | `"Application already submitted. You can update and resubmit it."` |
| 409 | `"You are already an approved instructor"` |
| 404 | `"Department not found"` |

## 2. Update / Resubmit Application

```
PUT /api/instructor/apply
```

Same schema as apply. Allowed while the application is `PENDING` or `REJECTED`; resets it to `PENDING`. Blocked when already `APPROVED`.

## 3. Get My Application

```
GET /api/instructor/application
```

Returns the authenticated instructor's application with department + user. `data` is `null` if none exists.

## 4. Upload Resume

```
POST /api/instructor/resume
```

Multipart field `resume` (PDF / DOC / DOCX / image, ≤ 5 MB). Uploaded to Cloudinary and stored as `resumeUrl`. Blocked once the application is `APPROVED`. File size 5 MB max.

## 5. Get My Info

```
GET /api/instructor/me
```

Returns the user with `instructorProfile` (department + assigned course sections) and `instructorApplication`.

## 6. Update My Profile

```
PATCH /api/instructor/profile
```

Body: `fullName?`, `phone?`. Updating `fullName` also updates the user's name.

## 7. Upload Profile Image

```
PATCH /api/instructor/avatar
```

Multipart field `avatar` (image ≤ 5 MB). Pre-approval the image is stored on the application; after approval it goes on the `InstructorProfile`.

## 8. List All Applications (Admin)

```
GET /api/instructor/applications?status=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

`status` optional: `PENDING` | `APPROVED` | `REJECTED`.

## 9. Approve Application (Admin) — Assignment

```
PATCH /api/instructor/applications/:id/approve
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field          | Type   | Required | Notes |
|----------------|--------|----------|-------|
| `reviewNote`   | string | No       | Recorded note |
| `designation`  | string | No       | Overrides the application designation |
| `departmentId` | string | No       | Overrides the application department |

Creates the `InstructorProfile` (generates `instructorId` like `INS-2026-0001`, assigns department + designation), marks the application `APPROVED` with the reviewer, and emails a welcome message. Only `PENDING` applications can be approved.

## 10. Reject Application (Admin)

```
PATCH /api/instructor/applications/:id/reject
```

Body: `reviewNote?`. Marks the application `REJECTED` and emails the applicant. Only `PENDING` applications can be rejected.

## 11. List Instructors (Admin)

```
GET /api/instructor?page=&limit=&searchTerm=&departmentId=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`

Paginated. `searchTerm` matches name / INS code / user email; `departmentId` filters by department. Each row includes `_count.courseSections`.

## 12. Get Instructor by ID

```
GET /api/instructor/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`

Includes the instructor's department and assigned course sections.

## 13. Update Instructor (Admin)

```
PATCH /api/instructor/:id
```

Body: any of `fullName?`, `phone?`, `designation?`, `departmentId?`. Updating `fullName` syncs the user's name.

## 14. Delete Instructor (Admin)

```
DELETE /api/instructor/:id
```

Soft-deletes the instructor (`isDeleted`, `deletedAt`) and unassigns their course sections (`instructorId` → `NULL`).

## Instructor Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/auth/register` | public | Register with optional `role: "INSTRUCTOR"` |
| 2 | POST | `/api/instructor/apply` | INSTRUCTOR | Submit instructor application |
| 3 | PUT | `/api/instructor/apply` | INSTRUCTOR | Update/resubmit application |
| 4 | GET | `/api/instructor/application` | INSTRUCTOR | Get my application |
| 5 | POST | `/api/instructor/resume` | INSTRUCTOR | Upload resume (PDF/doc/image) |
| 6 | GET | `/api/instructor/me` | INSTRUCTOR | Get my info + sections |
| 7 | PATCH | `/api/instructor/profile` | INSTRUCTOR | Update my profile |
| 8 | PATCH | `/api/instructor/avatar` | INSTRUCTOR | Upload profile image |
| 9 | GET | `/api/instructor/applications` | ADMIN, SUPER_ADMIN | List applications |
| 10 | PATCH | `/api/instructor/applications/:id/approve` | ADMIN, SUPER_ADMIN | Approve + assign instructor |
| 11 | PATCH | `/api/instructor/applications/:id/reject` | ADMIN, SUPER_ADMIN | Reject application |
| 12 | GET | `/api/instructor` | ADMIN, SUPER_ADMIN, INSTRUCTOR | List instructors |
| 13 | GET | `/api/instructor/:id` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Get instructor by ID |
| 14 | PATCH | `/api/instructor/:id` | ADMIN, SUPER_ADMIN | Update instructor |
| 15 | DELETE | `/api/instructor/:id` | ADMIN, SUPER_ADMIN | Soft-delete instructor |

---

# EduSphere — Course Registration Module API Documentation

> **Base URL:** `http://localhost:8000/api/course-registrations`  
> **Content-Type:** `application/json`

The course registration flow enrolls a student into courses for their current (or active) semester, creates a bKash payment, and — once paid — marks the enrollment and registrations as `ENROLLED`. A student can only register for one set of courses per semester.

## 1. Enroll in a Semester

```
POST /api/course-registrations/enroll
```

### Auth & Roles

`STUDENT`

### Request Body

| Field       | Type     | Required | Rules |
|-------------|----------|----------|-------|
| `courseIds` | string[] | Yes      | 1–20 course ids, no duplicates |

### Demo Input

```json
{
  "courseIds": [
    "cccc1111-2222-3333-4444-555555555555",
    "cccc2222-2222-3333-4444-555555555555"
  ]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Enrollment initiated for the semester. Please complete payment via bKash.",
  "data": {
    "paymentUrl": "https://sandbox.bka.sh/tokenized/checkout/pay?token=XXXX",
    "paymentID": "TR0011223344556677",
    "merchantInvoiceNumber": "ENR-ABC12345",
    "enrollmentId": "clm1abc2defg3456789000000",
    "totalCredits": 6,
    "totalFee": 24000,
    "sections": [
      {
        "courseId": "cccc1111-2222-3333-4444-555555555555",
        "courseCode": "CSE-101",
        "sectionId": "sec11111-2222-3333-4444-555555555555",
        "sectionCode": "A"
      }
    ]
  }
}
```

Selection logic: the student's `currentSemesterId` is used, falling back to the active semester. Open sections are auto-assigned in creation order (respecting capacity and preventing re-enrollment into a completed course).

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Student profile not found. Please complete your student profile first."` |
| 400 | `"No current semester is set for your profile. Please contact the registrar office."` |
| 404 | `"Current semester not found"` |
| 400 | `"Enrollment for this semester has already closed"` |
| 400 | `"One or more courses were not found"` |
| 400 | `"Total credits (N) exceed the maximum of N per semester"` |
| 409 | `"You already have an enrollment for this semester"` |
| 400 | `"Prerequisites not completed for the selected courses. Missing prerequisites - <details>. Please complete them before enrolling."` |
| 404 | `"No course section exists for <CODE> in the current semester. Contact the registrar office."` |
| 409 | `"You have already completed <CODE>. Retaking a completed course is not allowed."` |
| 409 | `"No open seat is available in any section of <CODE> in the current semester"` |

## 2. bKash Payment Callback

```
GET /api/course-registrations/bkash/callback?paymentID=&status=
```

Public route (no auth) invoked by bKash after a payment attempt. Executes the payment when `status=success`, otherwise marks the payment `FAILED` and cancels the enrollment/registrations. On success the student's enrollments become `ENROLLED` and an invoice email is sent.

This endpoint does **not** return JSON — it redirects the browser:

| Outcome | Redirect |
|---------|----------|
| Success | `<frontend>?payment=success&trxId=<trx>&enrollmentId=<id>` |
| Failure | `<frontend>?payment=failed&status=<status>` |

## 3. Get My Enrollments

```
GET /api/course-registrations/my?status=&semesterId=&page=&limit=
```

### Auth & Roles

`STUDENT`

### Query Parameters

| Field        | Type   | Required | Rules |
|--------------|--------|----------|-------|
| `status`     | string | No       | `PENDING`, `ENROLLED`, `CANCELLED` |
| `semesterId` | string | No       | Filter by semester |
| `page`       | number | No       | Default 1 |
| `limit`      | number | No       | Default 10, max 100 |

### Response (200 OK)

Paginated list. Each row includes `payment`, the `semester`, and `registrations` (each with `courseSection` → `course` + `semester`).

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Student profile not found. Please complete your student profile first."` |

## 4. List All Enrollments (Admin)

```
GET /api/course-registrations?status=&semesterId=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

Same query parameters and shape as **Get My Enrollments**, but each row additionally includes the `student` (with `user`).

## 5. Get Enrollment by ID

```
GET /api/course-registrations/:id
```

### Auth & Roles

`STUDENT` · `ADMIN` · `SUPER_ADMIN`

Students can only view their own enrollments.

| Status | Message |
|--------|---------|
| 404 | `"Enrollment not found"` |
| 403 | `"You are not allowed to view this enrollment"` |

## 6. Cancel Enrollment

```
PATCH /api/course-registrations/:id/cancel
```

### Auth & Roles

`STUDENT` · `ADMIN` · `SUPER_ADMIN`

Students can only cancel their own enrollments. Only `ENROLLED` (paid) enrollments can be cancelled, and only before the semester `startDate` (this is the refund window). If the payment succeeded, a bKash refund is issued (`REFUNDED`); the enrollment and its registrations are set to `CANCELLED`.

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Enrollment cancelled. Refund processed.",
  "data": {
    "id": "clm1abc2defg3456789000000",
    "studentId": "st1abc2defg345678900000000",
    "semesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
    "totalCredits": 6,
    "totalFee": 24000,
    "status": "CANCELLED",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-01-05T10:00:00.000Z",
    "updatedAt": "2026-01-10T10:00:00.000Z"
  }
}
```

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Enrollment not found"` |
| 403 | `"You are not allowed to cancel this enrollment"` |
| 400 | `"Only confirmed (enrolled) enrollments can be cancelled"` |
| 400 | `"Refund is only allowed before the semester starts"` |

## 7. Update Registration Status (Admin)

Manually overrides a single course registration's status — e.g. to mark a course `COMPLETED` when it cannot be auto-completed.

```
PATCH /api/course-registrations/:id/status
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Path Parameters

`:id` — the `CourseRegistration` id (not the enrollment id).

### Request Body

| Field    | Type   | Required | Rules |
|----------|--------|----------|-------|
| `status` | string | Yes      | `ENROLLED`, `COMPLETED`, `CANCELLED` |

### Demo Input

```json
{
  "status": "COMPLETED"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Course registration status updated successfully",
  "data": {
    "id": "reg12345-6789-abcd-ef01-234567890123",
    "studentId": "st1abc2defg345678900000000",
    "courseSectionId": "sec11111-2222-3333-4444-555555555555",
    "status": "COMPLETED",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-01-05T10:00:00.000Z",
    "updatedAt": "2026-01-20T10:00:00.000Z",
    "courseSection": {
      "id": "sec11111-2222-3333-4444-555555555555",
      "course": { "id": "cccc1111-2222-3333-4444-555555555555", "code": "CSE-101", "title": "Computer Fundamentals", "creditHours": 3 },
      "semester": { "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111", "name": "Fall", "year": 2026 }
    }
  }
}
```

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Course registration not found"` |
| 400 | Validation error (invalid status) |

## Course Registration Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/course-registrations/enroll` | STUDENT | Start enrollment + bKash payment |
| 2 | GET | `/api/course-registrations/bkash/callback` | public | bKash payment callback (redirect) |
| 3 | GET | `/api/course-registrations/my` | STUDENT | List my semester enrollments |
| 4 | GET | `/api/course-registrations` | ADMIN, SUPER_ADMIN | List all enrollments |
| 5 | GET | `/api/course-registrations/:id` | STUDENT, ADMIN, SUPER_ADMIN | Get one enrollment |
| 6 | PATCH | `/api/course-registrations/:id/cancel` | STUDENT, ADMIN, SUPER_ADMIN | Cancel enrollment + refund |
| 7 | PATCH | `/api/course-registrations/:id/status` | ADMIN, SUPER_ADMIN | Override registration status |

---

# EduSphere — Payment Module API Documentation

> **Base URL:** `http://localhost:8000/api/payments`  
> **Content-Type:** `application/json`

Payments are created by the course registration flow (purpose `REGISTRATION_FEE`); this module provides read-only access for students and admins.

## 1. List All Payments (Admin)

```
GET /api/payments?status=&purpose=&semesterId=&studentId=&startDate=&endDate=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Query Parameters

| Field        | Type   | Required | Rules |
|--------------|--------|----------|-------|
| `status`     | string | No       | `PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED` |
| `purpose`    | string | No       | `TUITION`, `EXAM_FEE`, `REGISTRATION_FEE`, `OTHER` |
| `semesterId` | string | No       | Filter by semester |
| `studentId`  | string | No       | Filter by `StudentProfile` id |
| `startDate`  | string | No       | `createdAt >=` (ISO date) |
| `endDate`    | string | No       | `createdAt <=` (ISO date) |
| `page`       | number | No       | Default 1 |
| `limit`      | number | No       | Default 10, max 100 |

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payments retrieved successfully",
  "data": [
    {
      "id": "pay1234-5678-abcd-ef01-234567890123",
      "userId": "usr12345-6789-abcd-ef01-234567890123",
      "semesterEnrollmentId": "clm1abc2defg3456789000000",
      "amount": 24000,
      "currency": "BDT",
      "status": "SUCCEEDED",
      "purpose": "REGISTRATION_FEE",
      "bkashPaymentId": "TR0011223344556677",
      "merchantInvoiceNumber": "ENR-ABC12345",
      "bkashStatus": "0011",
      "bkashTrxId": "12ABC34DEF56",
      "refundTrxId": null,
      "refundedAt": null,
      "bkashGatewayResponse": {},
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-01-05T10:30:00.000Z",
      "updatedAt": "2026-01-05T10:30:00.000Z",
      "user": { "id": "usr12345-6789-abcd-ef01-234567890123", "name": "Masad", "email": "masad@example.com", "role": "STUDENT" },
      "semesterEnrollment": {
        "id": "clm1abc2defg3456789000000",
        "semesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111",
        "totalCredits": 6,
        "totalFee": 24000
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "summary": {
      "revenue": 24000,
      "refunded": 0
    }
  }
}
```

`meta.summary.revenue` sums `SUCCEEDED` amounts and `meta.summary.refunded` sums `REFUNDED` amounts for the current filters.

### Errors

| Status | Message |
|--------|---------|
| 400 | Validation error (invalid query) |

## 2. Get My Payments

```
GET /api/payments/my?status=&purpose=&semesterId=&startDate=&endDate=&page=&limit=
```

### Auth & Roles

`STUDENT`

Same query parameters as the admin list, but **no** `studentId` — passing it returns a 403. Results are scoped to the authenticated student and each payment includes `user` and `semesterEnrollment`.

## 3. Get Payment by ID

```
GET /api/payments/:id
```

### Auth & Roles

`STUDENT` · `ADMIN` · `SUPER_ADMIN`

Returns the payment with `user` and `semesterEnrollment` included.

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Payment not found"` |
| 403 | `"You are not allowed to view this payment"` |

## Payment Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/payments` | ADMIN, SUPER_ADMIN | List all payments + revenue summary |
| 2 | GET | `/api/payments/my` | STUDENT | List my payments |
| 3 | GET | `/api/payments/:id` | STUDENT, ADMIN, SUPER_ADMIN | Get payment by ID |

---

# EduSphere — Exam Module API Documentation

> **Base URL:** `http://localhost:8000/api/exams`  
> **Content-Type:** `application/json`

An `Exam` belongs to a `CourseSection`. `ADMIN`, `SUPER_ADMIN` and `INSTRUCTOR` can manage exams; instructors are automatically scoped to their own sections.

## 1. Create Exam

```
POST /api/exams
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Request Body

| Field            | Type   | Required | Rules |
|------------------|--------|----------|-------|
| `courseSectionId`| string | Yes      | Existing course section |
| `type`           | string | Yes      | `MIDTERM`, `FINAL`, `QUIZ`, `ASSIGNMENT` |
| `date`           | string | Yes      | ISO date (`YYYY-MM-DDTHH:mm:ss.sssZ`) |
| `totalMarks`     | number | Yes      | Positive integer |

### Demo Input

```json
{
  "courseSectionId": "sec11111-2222-3333-4444-555555555555",
  "type": "MIDTERM",
  "date": "2026-04-15T10:00:00.000Z",
  "totalMarks": 30
}
```

### Response (201 Created)

Returns the created exam including `courseSection` (→ `course`, `semester`, `instructor.user`).

### Errors

| Status | Message |
|--------|---------|
| 403 | `"You are not assigned to this course section"` (instructor, wrong section) |
| 404 | `"Course section not found"` |
| 400 | Validation error |

## 2. List Exams

```
GET /api/exams?courseSectionId=&page=&limit=
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Query Parameters

| Field            | Type   | Required | Rules |
|------------------|--------|----------|-------|
| `courseSectionId`| string | No       | Filter by section |
| `page`           | number | No       | Default 1 |
| `limit`          | number | No       | Default 10, max 100 |

Instructors see only exams of their own sections unless a `courseSectionId` they are assigned to is given. Exams are ordered by `date` descending.

## 3. Get Exam by ID

```
GET /api/exams/:id
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Exam not found"` |
| 403 | `"You are not assigned to this course section"` |

## 4. Update Exam

```
PATCH /api/exams/:id
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Request Body

At least one of:

| Field        | Type   | Required | Rules |
|--------------|--------|----------|-------|
| `type`       | string | No       | `MIDTERM`, `FINAL`, `QUIZ`, `ASSIGNMENT` |
| `date`       | string | No       | ISO date |
| `totalMarks` | number | No       | Positive integer |

### Demo Input

```json
{
  "totalMarks": 40,
  "date": "2026-04-16T10:00:00.000Z"
}
```

Returns the updated exam (200 OK).

## 5. Delete Exam

```
DELETE /api/exams/:id
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

Permanently deletes the exam and its results (cascade). Message: `"Exam deleted successfully"`.

## 6. Get Exam Results

```
GET /api/exams/:id/results
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

Returns all `Result` rows for the exam, ordered by `marksObtained` descending. Each row includes the `student` with `studentId`, `user.name`, `user.email`, `user.imageURL`, plus `marksObtained`, `grade`, `gradePoint`.

## Exam Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/exams` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Create exam |
| 2 | GET | `/api/exams` | ADMIN, SUPER_ADMIN, INSTRUCTOR | List exams |
| 3 | GET | `/api/exams/:id` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Get exam by ID |
| 4 | PATCH | `/api/exams/:id` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Update exam |
| 5 | DELETE | `/api/exams/:id` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Delete exam |
| 6 | GET | `/api/exams/:id/results` | ADMIN, SUPER_ADMIN, INSTRUCTOR | List results for an exam |

---

# EduSphere — Attendance Module API Documentation

> **Base URL:** `http://localhost:8000/api/attendance`  
> **Content-Type:** `application/json`

## 1. Mark Attendance

```
POST /api/attendance
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Request Body

| Field            | Type   | Required | Rules |
|------------------|--------|----------|-------|
| `courseSectionId`| string | Yes      | Existing course section |
| `date`           | string | Yes      | ISO date |
| `records`        | array  | Yes      | At least 1 record |

Each `records` item:

| Field       | Type   | Required | Rules |
|-------------|--------|----------|-------|
| `studentId` | string | Yes      | Must be enrolled in the section |
| `status`    | string | Yes      | `PRESENT`, `ABSENT`, `LATE`, `EXCUSED` |

### Demo Input

```json
{
  "courseSectionId": "sec11111-2222-3333-4444-555555555555",
  "date": "2026-03-01T00:00:00.000Z",
  "records": [
    { "studentId": "st1abc2defg345678900000000", "status": "PRESENT" },
    { "studentId": "st2abc2defg345678900000000", "status": "ABSENT" }
  ]
}
```

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Attendance marked successfully",
  "data": {
    "count": 2,
    "date": "2026-03-01T00:00:00.000Z"
  }
}
```

Records are upserted per `(studentId, courseSectionId, date)` — re-posting overwrites the status.

### Errors

| Status | Message |
|--------|---------|
| 400 | `"Attendance can only be marked for students enrolled in this section. Invalid: <ids>"` |
| 403 | Instructor not assigned to the section |
| 400 | Validation error |

## 2. Get Attendance

```
GET /api/attendance?courseSectionId=&date=
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Query Parameters

| Field            | Type   | Required | Rules |
|------------------|--------|----------|-------|
| `courseSectionId`| string | Yes      | Existing course section |
| `date`           | string | No       | `YYYY-MM-DD`; omit for all dates |

### Response (200 OK)

Array of attendance records ordered by `date` ascending. Each record includes the `student` (`studentId`, `user.name`, `user.email`, `user.imageURL`) and `courseSection` (→ `course`, `semester`).

## Attendance Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/attendance` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Mark/update attendance |
| 2 | GET | `/api/attendance` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Fetch attendance records |

---

# EduSphere — Result Module API Documentation

> **Base URL:** `http://localhost:8000/api/results`  
> **Content-Type:** `application/json`

Marks are converted to a grade letter + grade point automatically (see the grade scale in **Get My Grades**). When a student has a result for **every** exam in a section, their registration is auto-completed (`ENROLLED` → `COMPLETED`) and a system notification is sent.

## 1. Enter Results

```
POST /api/results
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Request Body

| Field    | Type   | Required | Rules |
|----------|--------|----------|-------|
| `examId` | string | Yes      | Existing exam |
| `records`| array  | Yes      | At least 1 record |

Each `records` item:

| Field          | Type   | Required | Rules |
|----------------|--------|----------|-------|
| `studentId`    | string | Yes      | Must be enrolled in the exam's section |
| `marksObtained`| number | Yes      | `0 <= marksObtained <= exam.totalMarks` |

### Demo Input

```json
{
  "examId": "exm12345-6789-abcd-ef01-234567890123",
  "records": [
    { "studentId": "st1abc2defg345678900000000", "marksObtained": 27 },
    { "studentId": "st2abc2defg345678900000000", "marksObtained": 23 }
  ]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Results entered successfully",
  "data": [
    {
      "id": "res12345-6789-abcd-ef01-234567890123",
      "examId": "exm12345-6789-abcd-ef01-234567890123",
      "studentId": "st1abc2defg345678900000000",
      "marksObtained": 27,
      "grade": "A",
      "gradePoint": 4.0,
      "createdAt": "2026-04-17T10:00:00.000Z",
      "updatedAt": "2026-04-17T10:00:00.000Z",
      "student": {
        "studentId": "STU-2023-0001",
        "user": { "name": "Masad", "email": "masad@example.com", "imageURL": null }
      }
    }
  ]
}
```

Results are upserted per `(examId, studentId)` — re-posting recalculates the grade.

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Exam not found"` |
| 400 | `"Marks cannot exceed the exam total of N"` |
| 400 | `"Results can only be entered for students enrolled in this section. Invalid: <ids>"` |
| 403 | Instructor not assigned to the section |

## 2. Update a Result

```
PATCH /api/results/:resultId
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Request Body

| Field          | Type   | Required | Rules |
|----------------|--------|----------|-------|
| `marksObtained`| number | Yes      | `0 <= marksObtained <= exam.totalMarks` |

Grade and grade point are recomputed. Response: `"Result updated successfully"`.

### Errors

| Status | Message |
|--------|---------|
| 404 | `"Result not found"` |
| 400 | `"Marks cannot exceed the exam total of N"` |
| 403 | Instructor not assigned to the section |

## 3. Get Results

```
GET /api/results?examId=&courseSectionId=&studentId=&page=&limit=
```

### Auth & Roles

`ADMIN` · `SUPER_ADMIN` · `INSTRUCTOR`

### Query Parameters

At least one of `examId`, `courseSectionId`, or `studentId` is required.

| Field            | Type   | Required | Rules |
|------------------|--------|----------|-------|
| `examId`         | string | No       | Filter by exam |
| `courseSectionId`| string | No       | Filter by section |
| `studentId`      | string | No       | Filter by student |
| `page`           | number | No       | Default 1 |
| `limit`          | number | No       | Default 10, max 100 |

Instructors must scope by `examId` or `courseSectionId` when filtering by `studentId`. Each row includes `student` and `exam` (→ `courseSection` → `course`, `semester`). Ordered by `marksObtained` descending.

### Errors

| Status | Message |
|--------|---------|
| 400 | `"Provide examId, courseSectionId, or studentId to filter results"` |
| 403 | `"Instructors must scope student results by examId or courseSectionId"` |

## Result Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/results` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Enter/upsert results |
| 2 | PATCH | `/api/results/:resultId` | ADMIN, SUPER_ADMIN, INSTRUCTOR | Update a result |
| 3 | GET | `/api/results` | ADMIN, SUPER_ADMIN, INSTRUCTOR | List results with filters |

---

# EduSphere — Analytics Module API Documentation

> **Base URL:** `http://localhost:8000/api/analytics`  
> **Content-Type:** `application/json`

Dashboard aggregates per role. All three share the same optional query parameters.

### Query Parameters

| Field        | Type   | Required | Rules |
|--------------|--------|----------|-------|
| `semesterId` | string | No       | Scope to a semester |
| `startDate`  | string | No       | ISO date (inclusive, `gte`) |
| `endDate`    | string | No       | ISO date (inclusive, `lte`); must be after `startDate` |

## 1. Admin Analytics

```
GET /api/analytics/admin?semesterId=&startDate=&endDate=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin analytics fetched successfully",
  "data": {
    "users": { "totalStudents": 120, "totalInstructors": 15 },
    "applications": {
      "student": { "total": 130, "pending": 5, "approved": 120, "rejected": 5 },
      "instructor": { "total": 17, "pending": 2, "approved": 15, "rejected": 0 }
    },
    "academics": {
      "departments": 4,
      "programs": 8,
      "courses": 32,
      "semesters": 6,
      "activeSemesters": 1
    },
    "enrollments": {
      "courseSections": 40,
      "semesterEnrollments": 118,
      "enrolledEnrollments": 115,
      "courseRegistrations": 340,
      "enrolledRegistrations": 330,
      "completedRegistrations": 10
    },
    "assessment": {
      "exams": 150,
      "results": 1400,
      "attendanceRecords": 3000,
      "presentRecords": 2550,
      "attendanceRate": 85
    },
    "finance": { "totalRevenue": 2800000, "totalRefunded": 12000, "netRevenue": 2788000 }
  }
}
```

## 2. Student Analytics

```
GET /api/analytics/student?semesterId=&startDate=&endDate=
```

### Auth & Roles

`STUDENT`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Student analytics fetched successfully",
  "data": {
    "academic": {
      "cgpa": 3.75,
      "totalCreditsCompleted": 60,
      "completedCourses": 20,
      "coursesInProgress": 4,
      "inProgressCredits": 12,
      "totalExamsTaken": 58,
      "totalExamsAvailable": 60,
      "completionRate": 97
    },
    "attendance": { "totalClasses": 120, "attendedClasses": 108, "attendancePercentage": 90 },
    "grades": { "gradeBreakdown": { "A": 12, "A-": 4, "B+": 2, "B": 2 } },
    "finance": { "totalAmountSpent": 120000, "totalRefunded": 0 }
  }
}
```

## 3. Instructor Analytics

```
GET /api/analytics/instructor?semesterId=&startDate=&endDate=
```

### Auth & Roles

`INSTRUCTOR`

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Instructor analytics fetched successfully",
  "data": {
    "sections": { "totalSections": 3, "totalCoursesTaught": 2, "totalCapacity": 120, "seatsFilled": 108, "fillRate": 90 },
    "students": { "totalStudentsEnrolled": 90 },
    "exams": { "totalExams": 12, "upcomingExams": 2, "pendingGrading": 3 },
    "attendance": { "totalRecords": 900, "presentRecords": 765, "attendanceRate": 85 },
    "grading": { "totalGradeEntries": 900 }
  }
}
```

## Analytics Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/analytics/admin` | ADMIN, SUPER_ADMIN | Institutional dashboard aggregates |
| 2 | GET | `/api/analytics/student` | STUDENT | Student dashboard aggregates |
| 3 | GET | `/api/analytics/instructor` | INSTRUCTOR | Instructor dashboard aggregates |

---

# EduSphere — User Management Module API Documentation

> **Base URL:** `http://localhost:8000/api/users`  
> **Content-Type:** `application/json`

Administrative CRUD over `User` accounts. User responses never include `password`, `resetPasswordToken`, `resetPasswordExpiresAt`, or `passwordChangedAt`.

## 1. List Users

```
GET /api/users?role=&status=&searchTerm=&page=&limit=
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Query Parameters

| Field        | Type   | Required | Rules |
|--------------|--------|----------|-------|
| `role`       | string | No       | `STUDENT`, `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN` |
| `status`     | string | No       | `ACTIVE`, `BLOCKED`, `DELETED` |
| `searchTerm` | string | No       | Case-insensitive match on name/email |
| `page`       | number | No       | Default 1 |
| `limit`      | number | No       | Default 10, max 100 |

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "usr12345-6789-abcd-ef01-234567890123",
      "name": "Masad",
      "email": "masad@example.com",
      "role": "STUDENT",
      "status": "ACTIVE",
      "emailVerified": true,
      "authProvider": "CREDENTIAL",
      "needPasswordChange": false,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-01-01T09:00:00.000Z",
      "updatedAt": "2026-01-01T09:00:00.000Z",
      "studentProfile": {
        "id": "st1abc2defg345678900000000",
        "studentId": "STU-2023-0001",
        "cgpa": 3.75,
        "currentSemester": { "id": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111", "name": "Fall", "year": 2026 }
      },
      "instructorProfile": null,
      "studentApplication": { "id": "app1...", "status": "APPROVED" },
      "instructorApplication": null
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

## 2. Get User by ID

```
GET /api/users/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

Same shape as a list row (including the profile sub-resources).

| Status | Message |
|--------|---------|
| 404 | `"User not found"` |

## 3. Update User Role (Super Admin)

```
PATCH /api/users/:id/role
```

### Auth & Roles

`SUPER_ADMIN` only

### Request Body

| Field  | Type   | Required | Rules |
|--------|--------|----------|-------|
| `role` | string | Yes      | `STUDENT`, `INSTRUCTOR`, `ADMIN`, `SUPER_ADMIN` |

### Demo Input

```json
{
  "role": "INSTRUCTOR"
}
```

### Response (200 OK)

Updated user (sensitive fields omitted). Message: `"User role updated successfully"`.

### Errors

| Status | Message |
|--------|---------|
| 404 | `"User not found"` |
| 403 | `"You cannot change your own role"` |
| 409 | `"Cannot demote the last SUPER_ADMIN"` |

## 4. Update User Status

```
PATCH /api/users/:id/status
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

Sets the account status. Blocking a user logs them out immediately via `checkAuth` (login and requests are rejected with `"Your account is blocked. Please contact the administration."`).

### Request Body

| Field    | Type   | Required | Rules |
|----------|--------|----------|-------|
| `status` | string | Yes      | `ACTIVE`, `BLOCKED`, `DELETED` |

### Demo Input

```json
{
  "status": "BLOCKED"
}
```

### Response (200 OK)

Updated user (sensitive fields omitted). Message: `"User status updated successfully"`.

### Errors

| Status | Message |
|--------|---------|
| 404 | `"User not found"` |
| 403 | `"You cannot block or unblock yourself"` |

## 5. Delete User (Soft Delete)

```
DELETE /api/users/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

Soft-deletes the user: sets `isDeleted: true` and `status: DELETED`. Only a `SUPER_ADMIN` can delete another `SUPER_ADMIN`.

### Response (200 OK)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "User deleted successfully",
  "data": {
    "id": "usr12345-6789-abcd-ef01-234567890123",
    "name": "Masad",
    "email": "masad@example.com",
    "role": "STUDENT",
    "status": "DELETED",
    "isDeleted": true,
    "deletedAt": "2026-05-01T10:00:00.000Z"
  }
}
```

### Errors

| Status | Message |
|--------|---------|
| 404 | `"User not found"` |
| 403 | `"You cannot delete yourself"` |
| 403 | `"Only a SUPER_ADMIN can delete another SUPER_ADMIN"` |

## User Management Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | GET | `/api/users` | ADMIN, SUPER_ADMIN | List/filter users |
| 2 | GET | `/api/users/:id` | ADMIN, SUPER_ADMIN | Get user by ID |
| 3 | PATCH | `/api/users/:id/role` | SUPER_ADMIN | Change a user's role |
| 4 | PATCH | `/api/users/:id/status` | ADMIN, SUPER_ADMIN | Block/unblock/delete a user |
| 5 | DELETE | `/api/users/:id` | ADMIN, SUPER_ADMIN | Soft-delete a user |

---

# Appendix — Global Error Responses

All endpoints that go through the `auth` middleware can return the following when no valid session is provided:

| Status | Message |
|--------|---------|
| 500 | `"You are not logged in. Please log in to access this resource."` |
| 500 | `"Forbidden. You don't have permission to access this resource."` |
| 500 | `"Your account is blocked. Please contact the administration."` |
| 500 | `"User is deleted. Please contact support."` |
| 500 | `"User credentials mismatch. Please log in again."` |

> These middleware failures are thrown as generic `Error`s, so the global handler reports them as **500 Internal Server Error** and only exposes the exact message in development mode. A `GET /` root route returns `{ success: true, message: "Welcome to EduSphere Backend" }`.
