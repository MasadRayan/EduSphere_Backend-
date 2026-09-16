# University Management System — Project Planning

## 1. Overview

A backend-focused University Management System that manages the full academic lifecycle: University → Department → Program → Course → Semester → Course Registration → Attendance → Exam → Result → Transcript/GPA.

- **Category:** Education / Administration
- **Frontend:** Not required — Postman/Swagger used for demonstration
- **Deployment target:** Vercel (Serverless) or Render

---

## 2. Tech Stack

| Category | Technology |
|---|---|
| Runtime & Framework | Node.js, TypeScript, Express.js |
| Database & ORM | PostgreSQL + Prisma |
| Validation | Zod |
| Linting & Formatting | ESLint + Prettier |
| Caching & State | Redis (rate limiting, caching frequently-read data e.g. course lists) |
| Authentication | Custom (JWT) + Google OAuth (GCP Social Login) |
| Email | Resend / Nodemailer (registration confirmation, payment receipts) |
| File Storage | Multer + Cloudinary (profile photos, documents) |
| Payments | Stripe |
| Documentation | Postman Collection / Swagger (OpenAPI) |
| Deployment | Vercel or Render |

---

## 3. Roles (3 Fixed Roles)

### Student
- Register/enroll in courses (prerequisite + capacity checks enforced)
- View own attendance, exam schedule, results, transcript, GPA
- Make payments (tuition/fees) via Stripe
- View/update own profile

### Instructor
- View assigned courses/sections
- Mark and update attendance for their sections
- Enter/update exam results and grades
- View list of enrolled students per course

### Admin
*(consolidates Department Admin, Registrar, Finance/Admin, Super Admin)*
- Manage departments, programs, courses, semesters, sections
- Assign instructors to courses
- Manage users (create/update/deactivate students & instructors)
- Approve or override course registrations
- View payment status, audit logs, dashboard statistics
- Full CRUD on all core academic resources

---

## 4. Core Entities (Prisma Models — high level)

- **User** (base: id, email, password hash, role, googleId, isDeleted, timestamps)
- **StudentProfile** (userId, studentId, departmentId, programId, enrollmentYear, cgpa)
- **InstructorProfile** (userId, departmentId, designation)
- **Department** (id, name, code)
- **Program** (id, name, departmentId, degreeType, totalCredits)
- **Course** (id, code, title, creditHours, departmentId, prerequisites[])
- **Semester** (id, name, year, startDate, endDate, isActive)
- **Section** (id, courseId, semesterId, instructorId, capacity, schedule)
- **CourseRegistration** (id, studentId, sectionId, status, registeredAt, deletedAt)
- **Attendance** (id, sectionId, studentId, date, status)
- **Exam** (id, sectionId, type, date, totalMarks)
- **Result** (id, examId, studentId, marksObtained, grade)
- **Transcript** (derived/computed — GPA per semester + cumulative)
- **Payment** (id, studentId, amount, purpose, stripePaymentId, status, timestamps)
- **AuditLog** (id, userId, action, entity, entityId, metadata, timestamp)

**Relationships:** University 1—N Department 1—N Program 1—N Course; Semester 1—N Section; Course 1—N Section; Section N—N Student (via CourseRegistration); Section 1—N Attendance/Exam; Exam 1—N Result.

---

## 5. Backend Challenges & Solutions

| Challenge | Approach |
|---|---|
| Course prerequisite validation | Check completed courses (passed results) against `Course.prerequisites` before allowing registration |
| Enrollment constraints (seat capacity) | Prisma transaction: lock section row, count active registrations, reject if full |
| Race conditions (double-booking) | Wrap registration in `prisma.$transaction()` with row-level checks |
| GPA calculation | Weighted average of grade points × credit hours per semester, then cumulative across semesters |
| Role/permission management | Middleware reading JWT role claim, route-level `requireRole([...])` guards |
| Academic history / transcript | Aggregate all passed Results grouped by semester, computed on read (or cached in Redis) |

---

## 6. API Modules (20+ endpoints, versioned `/api/v1`)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google` (GCP social login)
- `POST /auth/refresh-token`
- `POST /auth/logout`

### User / Profile
- `GET /users/me`
- `PATCH /users/me`

### Departments / Programs / Courses (Admin-managed)
- `POST /departments` | `GET /departments` | `PATCH /departments/:id` | `DELETE /departments/:id` (soft delete)
- `POST /courses` | `GET /courses?page=&limit=&departmentId=` | `GET /courses/:id` | `PATCH /courses/:id` | `DELETE /courses/:id`
- `GET /courses/search?q=`

### Semesters & Sections
- `POST /semesters` | `GET /semesters`
- `POST /sections` | `GET /sections?semesterId=&courseId=`
- `PATCH /sections/:id/assign-instructor`

### Course Registration
- `POST /registrations` (transaction-safe, prerequisite + capacity check)
- `GET /registrations/my` (student's own)
- `PATCH /registrations/:id/cancel`
- `GET /registrations?sectionId=&status=` (Admin/Instructor view)

### Attendance
- `POST /attendance` (Instructor marks)
- `GET /attendance/section/:sectionId`
- `GET /attendance/my` (Student view)

### Exams & Results
- `POST /exams`
- `POST /results` (Instructor enters)
- `GET /results/my` (Student)
- `GET /results/section/:sectionId` (Instructor/Admin)

### Transcript / GPA
- `GET /transcript/my`
- `GET /transcript/:studentId` (Admin)

### Payments (Stripe)
- `POST /payments/initiate`
- `POST /payments/webhook`
- `GET /payments/:id`
- `GET /payments/my`

### Admin
- `GET /admin/users?page=&role=`
- `PATCH /admin/users/:id/role`
- `GET /admin/dashboard-stats`
- `GET /admin/audit-logs`

**Total: ~35 endpoints**, exceeding the 20 minimum.

---

## 7. Response Format (applied everywhere)

```json
// Success
{ "success": true, "message": "Operation successful", "data": {} }

// Error
{ "success": false, "message": "Something went wrong", "errors": [] }
```

---

## 8. Security & Performance Checklist

- [ ] Bcrypt/argon2 password hashing
- [ ] JWT access + refresh token flow
- [ ] `helmet` for security headers
- [ ] CORS configured for allowed origins only
- [ ] `express-rate-limit` on auth & payment routes
- [ ] Zod validation on all mutating endpoints
- [ ] Prisma `select` to avoid over-fetching
- [ ] Indexes on foreign keys + frequently filtered fields (studentId, sectionId, semesterId)
- [ ] Redis caching for course/department listings
- [ ] Soft deletes via `deletedAt` on all core resources
- [ ] Audit logs on role changes, registration overrides, payment status changes

---

## 9. Milestones

1. **Setup** — repo, TS/Express boilerplate, Prisma schema, PostgreSQL connection, ESLint/Prettier
2. **Auth module** — register, login, Google OAuth, JWT, role middleware
3. **Core academic resources** — departments, programs, courses, semesters, sections (CRUD + pagination/filtering)
4. **Registration engine** — prerequisite validation, transaction-safe enrollment
5. **Attendance & Exams** — instructor-facing endpoints
6. **Results & GPA/Transcript** — computation logic
7. **Payments** — Stripe integration (initiate, webhook, status)
8. **Admin module** — user management, audit logs, dashboard stats
9. **Hardening** — rate limiting, helmet, caching, indexing, tests
10. **Docs & deployment** — Postman/Swagger, deploy to Vercel/Render, demo admin account, video walkthrough

---

## 10. Open Items / To Decide

- Confirm final role split (Student / Instructor / Admin) — currently assumed locked
- Decide Redis usage scope (optional per requirements)
- Decide GCP OAuth provider setup (client ID/secret, redirect URIs)
- Confirm Stripe test vs. live mode for demo