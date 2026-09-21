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

Approves a `PENDING` application. Creates the `StudentProfile` (fields taken from the application, `studentId` provided by the admin), marks the application `APPROVED`, creates a `Notification`, and sends the welcome email.

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
| `currentSemesterId` | string | No       | Must reference an existing semester |

### Demo Input

```json
{
  "studentId": "CS-2026-0001",
  "reviewNote": "Welcome aboard!",
  "currentSemesterId": "sm1d2e3f-4a5b-6c7d-8e9f-111111111111"
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
    }
  }
}
```

> Automatic side effects: `Notification` row created + welcome email sent (`student-welcome-email.ejs`).

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Application not found"` / `"Semester not found"` |
| 409 | `"Application already reviewed"` |
| 409 | `"Student ID already in use"` |

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

Returns the updated `StudentProfile` with `department`, `program`, and `currentSemester`.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Student profile not found"` / `"Semester not found"` |

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
| 14 | PATCH | `/api/student/applications/:id/approve` | ADMIN, SUPER_ADMIN | Approve application |
| 15 | PATCH | `/api/student/applications/:id/reject` | ADMIN, SUPER_ADMIN | Reject application |
| 16 | PATCH | `/api/student/:id/current-semester` | ADMIN, SUPER_ADMIN | Set/clear a student's current semester |

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

Semesters (`name`, `year`, `startDate`, `endDate`, `isActive`) are the "when" of the academic calendar and are referenced by `Section`. `(name, year)` is unique. Only one semester is active at a time. Reads are open to any authenticated role; writes require `ADMIN` or `SUPER_ADMIN`.

## 1. Create Semester

```
POST /api/semesters
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

| Field       | Type    | Required | Rules |
|-------------|---------|----------|-------|
| `name`      | string  | Yes      | 2–50 characters, unique with `year` |
| `year`      | number  | Yes      | 2000–2100 |
| `startDate` | date    | Yes      | ISO date string |
| `endDate`   | date    | Yes      | Must be after `startDate` |
| `isActive`  | boolean | No       | Default `false`; setting `true` deactivates all others |

### Demo Input

```json
{
  "name": "Fall",
  "year": 2026,
  "startDate": "2026-09-01",
  "endDate": "2026-12-31",
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

Any of `name`, `year`, `startDate`, `endDate`, `isActive` (all optional). Setting `isActive: true` deactivates all other semesters.

### Error Responses

| Status | Message |
|--------|---------|
| 400 | `"startDate must be before endDate"` |
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

# EduSphere — Section Module API Documentation

A `Section` is one offering of a course in a semester, optionally taught by an instructor (`Course × Semester × Section`). `(courseId, semesterId, sectionCode)` is unique. `courseId` and `semesterId` are immutable after creation. Reads are open to any authenticated role; writes require `ADMIN` or `SUPER_ADMIN`.

## 1. Create Section

```
POST /api/sections
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

Returns the created section including `course`, `semester`, and `instructor` (with the instructor's `user.name`/`user.email`).

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Course not found"` / `"Semester not found"` / `"Instructor not found"` |
| 409 | `"Section with this code already exists for this course and semester"` |

## 2. List Sections

```
GET /api/sections?courseId=&semesterId=&instructorId=&page=&limit=
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

## 3. Get Section by ID

```
GET /api/sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`, `INSTRUCTOR`, `STUDENT`

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Section not found"` |

## 4. Update Section

```
PATCH /api/sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Request Body

Any of `sectionCode`, `instructorId`, `capacity`, `schedule` (all optional). `courseId` and `semesterId` cannot be changed. Send `instructorId: null` to unassign.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Section not found"` / `"Instructor not found"` |
| 409 | `"Section with this code already exists for this course and semester"` |

## 5. Assign Instructor

```
PATCH /api/sections/:id/assign-instructor
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
| 404 | `"Section not found"` / `"Instructor not found"` |

## 6. Delete Section (hard, cascading)

```
DELETE /api/sections/:id
```

### Auth & Roles

`ADMIN`, `SUPER_ADMIN`

### Response (200 OK)

Permanently deletes the section; `ON DELETE CASCADE` removes its registrations, attendance, exams, and results. Returns the deleted section row.

> **Warning:** This is destructive and irreversible.

### Error Responses

| Status | Message |
|--------|---------|
| 404 | `"Section not found"` |

## Section Module — Route Summary

| # | Method | Route | Auth | Description |
|---|--------|-------|------|-------------|
| 1 | POST | `/api/sections` | ADMIN, SUPER_ADMIN | Create a section |
| 2 | GET | `/api/sections` | all roles | List sections (filter + pagination) |
| 3 | GET | `/api/sections/:id` | all roles | Get a section |
| 4 | PATCH | `/api/sections/:id` | ADMIN, SUPER_ADMIN | Update a section |
| 5 | PATCH | `/api/sections/:id/assign-instructor` | ADMIN, SUPER_ADMIN | Assign an instructor |
| 6 | DELETE | `/api/sections/:id` | ADMIN, SUPER_ADMIN | Hard-delete a section (cascades) |
