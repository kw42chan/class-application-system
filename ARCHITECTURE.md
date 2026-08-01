# Architecture Guide

## Overview

The Appointment System is a Next.js 16 full-stack application for managing class registrations. Students discover classes, apply with their WhatsApp number, and get either a confirmed seat or a waitlist position. Administrators manage classes, view applicants, and promote students from the waitlist. All state is persisted in SQLite (local) or Turso (production).

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                          │
│  Student Pages (/) | Admin Pages (/admin/*)                 │
└──────────────┬──────────────────────────────────────────────┘
               │ HTTP / fetch
┌──────────────▼──────────────────────────────────────────────┐
│         Next.js 16 (App Router, Turbopack)                  │
├──────────────────────────────────────────────────────────────┤
│  Pages (app/**/page.tsx)                                     │
│  • /                   Student dashboard (class list)        │
│  • /classes/[id]       Class detail + apply form             │
│  • /withdraw/[token]   Student withdrawal page               │
│  • /admin/login        Sign in                               │
│  • /admin              Class list (admin)                    │
│  • /admin/classes/[id] Manage class & applicants             │
│  • /admin/team         Admin accounts                        │
│  • /admin/activity     Audit log                             │
├──────────────────────────────────────────────────────────────┤
│  Server Actions (app/actions/*.ts)                           │
│  • apply.ts      Student apply → applyToClass()             │
│  • withdraw.ts   Student withdraw → withdrawByToken()       │
│  • admin.ts      Class/applicant mutations, admin ops       │
├──────────────────────────────────────────────────────────────┤
│  Components (components/*.tsx)                               │
│  • ClassForm, SeatMeter, StatusPill (class UI)              │
│  • Pagination, ShareTools (admin UI)                        │
│  • ConfirmSubmitButton, WhatsAppButton (forms)              │
└──────────────┬──────────────────────────────────────────────┘
               │ libSQL API
┌──────────────▼──────────────────────────────────────────────┐
│         Database (libSQL client + SQLite)                   │
│  Local: file:./data/app.db (dev)                            │
│  Remote: libsql://xyz.turso.io (production)                 │
├──────────────────────────────────────────────────────────────┤
│  Tables                                                      │
│  • classes             (title, capacity, is_open, etc.)     │
│  • applications        (student applications)               │
│  • admins              (administrator accounts)             │
│  • audit_log           (who-did-what events)                │
└──────────────────────────────────────────────────────────────┘
```

## Core Modules

### `lib/db.ts` — Database Connection & Migrations

- **Connection**: Creates libSQL client from `DATABASE_URL`
- **Migrations**: Versioned schema changes tracked in `user_version`
  - v1: Initial (classes, applications, indexes)
  - v2: Waitlist (admin_accounts, audit_log, withdraw tokens)
- **Write Lock**: In-process queue (`withWriteLock()`) serializes writes to avoid SQLite busy timeouts
- **ready()**: Promise that runs migrations once on first call

**Key functions:**
- `ready()` — Ensures migrations applied, caches promise
- `withWriteLock(fn)` — Serializes write transactions

### `lib/classes.ts` — Class & Application Queries

- **Seat Management**: Transactional checks (count confirmed + availability) before inserting
- **Waitlist Logic**: 
  - If full and waitlistEnabled: insert as "waitlisted", return position
  - If full and no waitlist: reject
  - Otherwise: insert as "confirmed"
- **Withdrawal**: Lookup by token, cancel application, revalidate paths
- **Promotion**: Move from "waitlisted" → "confirmed" only if seat is free

**Key functions:**
- `applyToClass()` — Apply with race-condition protection
- `confirmApplication()` — Promote from waitlist
- `withdrawByToken()` — Student self-withdrawal
- `listApplications()` — Paginated list (25 per page)
- `countApplications()` — Seats, waitlist, cancelled counts

### `lib/admins.ts` — Administrator Accounts

- **Seeding**: On first sign-in, create admin from `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (env)
- **Lookup**: Case-insensitive by username
- **Password**: Hashed with bcrypt (12 rounds), never stored plain
- **Deletion**: Refuses if count ≤ 1 (prevent lockout)

**Key functions:**
- `findAdminByUsername()` — Lookup for login
- `createAdmin()` — Add new admin, audit logged
- `setAdminPassword()` — Change password
- `listAdmins()` — Current admins

### `lib/audit.ts` — Who-Did-What Log

Immutable append-only table. Records each mutation with actor, action, entity type/id, summary.

**Key functions:**
- `recordAudit()` — Called by server actions after mutations
- `listAudit()` — Paginated log (50 per page)

### `lib/backup.ts` — Pre-Delete Snapshots

Before `deleteClass()` or `deleteApplication()`, takes a `VACUUM INTO` snapshot to `data/backups/app-TIMESTAMP-reason.db`. Keeps last 10. No-op on remote Turso.

**Key functions:**
- `backupBeforeDestructiveChange()` — Snapshot database

### `lib/phone.ts` — Phone Number Validation & WhatsApp Links

Uses libphonenumber-js per-country rules. Strips leading zeros, rejects fixed-line, validates format.

**Key functions:**
- `parsePhone(country, localNumber)` — Returns `{e164, display}` or `{error}`
- `whatsappLink(e164, message?)` — Builds `wa.me/` link

**Supported countries**: MY, SG, HK, TW, CN, ID, TH, PH, VN, BN, IN, JP, KR, AU, NZ, GB, US, CA, AE

### `lib/auth.ts` & `lib/session.ts` — Authentication

- **Session**: Encrypted cookie, signed with `SESSION_SECRET`
- **Login**: Throttled to 8 attempts / 15 min per IP
- **Verification**: bcrypt.compare() on dummy hash even if user not found (timing attack prevention)

**Key functions:**
- `verifyCredentials()` — Check username + password
- `createSession()` — Issue session cookie
- `requireAdmin()` — Middleware for /admin pages

## Data Flow

### Student Applies to Class

```
1. GET /classes/[id]              ← Load class detail page
2. POST /apply (server action)    ← applyToClass()
   - Check class exists & open
   - Check duplicate (same phone + class)
   - BEGIN TRANSACTION
     a. SELECT COUNT confirmed
     b. IF count < capacity: INSERT as "confirmed"
     c. ELSE IF waitlist enabled: INSERT as "waitlisted"
     d. ELSE: ROLLBACK, return error
   - COMMIT
   - Generate withdraw_token
3. POST /revalidatePath           ← Refresh /classes/[id]
4. Redirect to success page       ← Show seat or waitlist position + withdrawal link
```

### Admin Promotes Student

```
1. GET /admin/classes/[id]        ← View applicant table
2. POST confirmApplicationAction  ← confirmApplication()
   - BEGIN TRANSACTION
     a. SELECT application, class capacity, confirmed count
     b. IF count < capacity: UPDATE status='confirmed'
     c. ELSE: ROLLBACK, return error
   - COMMIT
   - recordAudit('promoted from waitlist')
3. POST /revalidatePath           ← Refresh page
```

### Student Withdraws (Self-Service)

```
1. GET /withdraw/[token]          ← Withdrawal confirmation page
2. POST submitWithdrawal          ← withdrawByToken(token)
   - SELECT application by withdraw_token
   - UPDATE status='cancelled'
   - Invalidate withdrawal link (token no longer works)
   - recordAudit('student withdrawal')
3. Redirect to success page
```

## Key Design Decisions

### Why Transactional Writes?

SQLite's isolation level is SERIALIZABLE by default. A race condition exists if two students submit simultaneously:

```
Thread A: SELECT COUNT(*) → 1 (seat free)
Thread B: SELECT COUNT(*) → 1 (seat free)
Thread A: INSERT → success (count now 2)
Thread B: INSERT → success (count now 3) ← over capacity!
```

Solution: **Single TRANSACTION for read + write**, with **in-process write lock** to serialize commits.

### Why Write Lock Instead of Database Lock?

SQLite doesn't queue writers; overlapping writes fail with `SQLITE_BUSY`. The write lock (`withWriteLock()`) serializes them in the Node.js event loop. Harmless on Turso (remote database) which handles concurrency itself.

### Why Append-Only Migrations?

Deploying to Vercel can spin up multiple edge regions. A migration that runs twice would break (`CREATE TABLE IF NOT EXISTS` is safe, but `ALTER TABLE` is risky). Solution: immutable MIGRATIONS array, track applied version in `user_version`, never re-run.

### Why Versioned Admin Accounts?

Legacy deploy might have credentials in env vars only. New deploy wants accounts in DB. Solution: `ensureSeedAdmin()` copies env→DB on first login, then DB is authoritative. Can delete or change env after that.

### Why Withdrawal Tokens?

Students shouldn't need our UI to cancel. Token acts as a capability: it grants exactly one action (withdraw from one class) without authentication. Tokens are 24-byte random base64url strings (unguessable). Page is marked `noindex`.

## Deployment Architecture

### Development (Local)

```
npm run dev
  ↓
Next.js on http://localhost:3000
  ↓
SQLite file: ./data/app.db
  ↓
.env.local (generated by npm run setup)
```

### Production (Vercel + Turso)

```
Vercel (Next.js serverless functions)
  ↓
libSQL HTTP client
  ↓
Turso (SQLite remote)
  ↓
DATABASE_URL=libsql://xyz.turso.io
DATABASE_AUTH_TOKEN=<token>
```

**Key differences:**
- No file system, so backups are skipped
- HTTP API instead of local file I/O (slower, but simpler)
- Database enforces concurrency (no need for write lock, but doesn't hurt)

## Component Hierarchy

```
app/
├── layout.tsx (RootLayout)
│   ├── page.tsx (/ - Student dashboard)
│   │   └── ClassCard
│   │       └── Link to /classes/[id]
│   ├── classes/[id]/page.tsx
│   │   ├── ApplyForm
│   │   │   └── Form inputs + country selector
│   │   ├── SeatMeter
│   │   └── StatusPill
│   ├── withdraw/[token]/page.tsx
│   │   └── WithdrawForm
│   │       └── Confirm + withdrawal flow
│   └── admin/(protected)/layout.tsx
│       ├── page.tsx (Admin dashboard)
│       │   └── ClassCard with counts
│       ├── classes/[id]/page.tsx
│       │   ├── ClassForm
│       │   ├── ShareTools
│       │   │   └── QR code + copy link
│       │   ├── Pagination
│       │   └── ApplicantTable
│       │       └── WhatsAppButton
│       ├── team/page.tsx
│       │   ├── AddAdminForm
│       │   └── ChangePasswordForm
│       └── activity/page.tsx
│           └── AuditLog table
```

## State Management

- **Server State**: SQLite database (single source of truth)
- **Session State**: Encrypted cookie (admin login)
- **Form State**: React `useActionState()` hook + server actions
- **Cache**: Next.js `revalidatePath()` for data mutations

No Redux, Context, or Zustand—server actions with revalidation are sufficient.

## Error Handling

- **Pages**: `error.tsx` catches server-side errors, shows user-friendly message
- **Global**: `global-error.tsx` is the last resort (replaces the whole document)
- **Not Found**: `not-found.tsx` for 404s (class ID doesn't exist)
- **Loading**: `loading.tsx` shows skeleton while page data loads

## Security Model

- **Authentication**: Username + password (bcrypt), session cookie
- **Authorization**: Middleware checks for `/admin` pages
- **Rate Limiting**: 8 failed logins per 15 min per IP
- **CSRF**: Built into Next.js (not explicit)
- **XSS**: React escapes output by default
- **SQL Injection**: Parameterized queries (libSQL)
- **Tokens**: 24-byte random withdrawal tokens (unguessable)

## See Also

- [DATABASE.md](DATABASE.md) — Schema & migrations
- [API_REFERENCE.md](API_REFERENCE.md) — Function signatures
- [TESTING.md](TESTING.md) — Test patterns
- [SECURITY.md](SECURITY.md) — Constraints & security details
