# Security & Constraints

## Overview

This document outlines security measures, validation constraints, and safety guarantees built into the system.

---

## Authentication & Authorization

### Admin Login

**Mechanism:**
- Username + password (plaintext username, bcrypt password hash)
- Session stored in encrypted, HTTP-only cookie
- Session signed with `SESSION_SECRET` (32+ random bytes)

**Constraints:**
- Username: 3-32 characters, alphanumeric + `._-`
- Password: ≥ 8 characters (checked in form + server)
- Password hash: bcrypt with 12 rounds (CPU cost factor)

**Rate Limiting:**
- 8 failed login attempts per 15 minutes per IP
- Tracked in-process (resets per server restart)
- Dummy hash used on failed username lookup (constant-time, prevents timing attacks)

**Code:** `lib/auth.ts`

**Example Attack Defended:**
```
Attacker tries username enumeration by measuring login time:
- Valid user → check hash → 100ms
- Invalid user → no hash → 1ms

Defense: Always run bcrypt.compare() even if user not found
- Valid user → 100ms
- Invalid user → 100ms (dummy hash takes same time)
```

---

### Admin Session

**Mechanism:**
- Next.js cookies with `SessionSecretSchema` encryption
- Cookie is HTTP-only (not accessible to JavaScript)
- Signed with SESSION_SECRET (rotation invalidates all sessions)

**Duration:**
- Default 30 days (Next.js default, not explicitly configured)

**Expiration Handling:**
- Expired session redirects to `/admin/login`
- No automatic session refresh

**Code:** `lib/session.ts`, `middleware.ts`

---

### Authorization (Protected Routes)

**All `/admin/*` pages require authentication:**

```typescript
export async function requireAdmin() {
  const session = await getSession();
  if (!session) notFound(); // 404, not 401
  return session;
}
```

**Admin-only actions:**
- Create, update, delete classes
- View applicant list, promote from waitlist
- Manage administrator accounts
- View audit log

**Student pages (unauthenticated):**
- `/` — Browse classes
- `/classes/[id]` — View class & apply
- `/withdraw/[token]` — Self-withdrawal (capability-based, not auth-based)

---

## Data Validation

### Phone Number Validation

**Library:** `libphonenumber-js` (Google's phone parsing)

**Supported Countries:** 19 (MY, SG, HK, TW, CN, ID, TH, PH, VN, BN, IN, JP, KR, AU, NZ, GB, US, CA, AE)

**Validation Rules (per-country):**

| Country | Type | Example Valid | Example Invalid |
|---------|------|----------------|-----------------|
| Malaysia (MY) | Mobile | 012-345 6789 | 03-8123 4567 (fixed-line) |
| Singapore (SG) | Mobile | 8123 4567 | 6801 0000 (fixed-line) |
| Hong Kong (HK) | Any | 6470 7233 | 3000 0000 (invalid range) |
| USA (US) | Mobile | 415-555-0199 | 212-555-0199 (invalid area) |

**Rejects:**
- Fixed-line numbers (call landlines via WhatsApp not common)
- Invalid digit counts per country
- Invalid digit ranges per country

**Accepts:**
- Leading `0` (stripped for Malaysia, etc.)
- Spaces, dashes, brackets (removed)
- Explicit `+CC` prefix (overrides form country selector)

**Code:** `lib/phone.ts`, `parsePhone()`

**Example Safe Number:**
```
Input: "012-345 6789" + country "MY"
→ Parsed as +60-12-345-6789
→ Stored: e164="60123456789", display="+60 12 345 6789"
→ Safe for wa.me link: https://wa.me/60123456789
```

---

### Application Uniqueness

**Constraint:** Same phone number cannot hold two active places in one class.

**Enforcement:**
```sql
SELECT id FROM applications
WHERE class_id = ? AND phone_e164 = ? AND status IN ('confirmed', 'waitlisted');
```

**Behavior:**
- Apply with active application → rejected ("already applied")
- Apply after withdrawal → allowed (old application cancelled)
- Apply to different class → allowed

**Transactions:** Check + insert in single transaction to prevent race conditions.

---

### Class Capacity

**Constraint:** Never seat more students than `capacity`.

**Enforcement:**
```typescript
// In applyToClass transaction:
const confirmedCount = await tx.execute("SELECT COUNT(*) FROM applications ...");
if (confirmedCount < capacity) {
  INSERT as "confirmed"
} else if (waitlistEnabled) {
  INSERT as "waitlisted"
} else {
  ROLLBACK
  return error
}
```

**Race Condition Defense:**
- Both writes happen in ONE transaction
- Writes serialized by `withWriteLock()` (prevents `SQLITE_BUSY`)
- Vitest concurrency test proves 12 racing requests can't exceed limit

**Code:** `lib/classes.ts`, `applyToClassLocked()`

---

## Withdrawal Tokens

**Purpose:** Allow students to cancel their own application without authentication.

**Token Generation:**
```typescript
const withdrawToken = randomBytes(24).toString("base64url");
```
- 24 bytes of cryptographic randomness = 192 bits
- Unguessable (2^192 possibilities)
- Stored in database, indexed

**Token Usage:**
- Valid once per application
- Links to `/withdraw/[token]`
- Page marked `noindex` (not searchable)

**Token Expiration:**
- No explicit expiration (live as long as application exists)
- Invalidated when student withdraws (status → "cancelled")
- Never transmitted outside database + URL bar

**Security Model:**
- Token IS the capability (like a URL shortener)
- No login required (form-based, no session)
- Revocation is automatic (status update)

**Code:** `lib/classes.ts`, `withdrawByToken()`

---

## Password Hashing

**Library:** `bcryptjs` (pure JavaScript implementation, safe for Node.js)

**Configuration:**
- Rounds: 12 (2^12 = 4096 iterations, ~100ms per hash on modern CPU)
- Algorithm: bcrypt (salted, per-password)

**Storage:**
- Hash only (plaintext never stored or logged)
- Escaped in .env.local ($ → \$ because Next.js expands $NAME)

**Example:**
```
Password: "workshop2026"
Hash: $2b$12$Hs4a9bvnLl9ZvM6zy.NLOuJPi1.pO7QQ...
Stored in DB: password_hash column
Never exposed in logs or error messages
```

**Code:** `lib/admins.ts`, `scripts/setup-env.mjs`

---

## Database Integrity

### Foreign Keys

**Enabled:** `PRAGMA foreign_keys = ON`

**Cascade Delete:**
```sql
DELETE FROM classes WHERE id = ?;
-- Automatically deletes all applications with class_id = ?
```

**Prevents:**
- Orphaned applicant records (no associated class)
- Dangling references

---

### Transaction Isolation

**Level:** SERIALIZABLE (SQLite default)

**Guarantees:**
- Dirty reads: No (isolation between uncommitted writes)
- Phantom reads: No (transaction sees consistent snapshot)
- Lost updates: No (serialized order)

**Implementation:**
- Seat allocation + insert in one transaction
- Read + update (promotion) in one transaction

---

### Backup Before Delete

**Feature:** Before `deleteClass()` or `deleteApplication()`, snapshot database.

**Mechanism:**
```typescript
VACUUM INTO 'data/backups/app-2026-08-01T13-46-00-delete-class-3.db'
```

**Guarantees:**
- Full transactionally-consistent copy
- Timestamp in filename
- Last 10 kept (rolling window)
- Never throws (continues if backup fails)

**Limitations:**
- Only on local SQLite (Turso/remote: skipped)
- No automatic restore UI (manual recovery)

**Code:** `lib/backup.ts`

---

## Audit Logging

**What's Logged:**
- Every class create/update/delete
- Every applicant promotion, restoration, cancellation, deletion
- Every admin account addition/removal
- Every password change
- Actor (username) always recorded

**What's NOT Logged:**
- Student applications (privacy, high volume)
- Failed login attempts (rate limiting is separate)
- Session creation (would double-log logins)

**Immutability:**
- Append-only table (no UPDATE/DELETE)
- Used for compliance & troubleshooting, not enforcement

**Code:** `lib/audit.ts`, `app/actions/admin.ts`

---

## Input Validation

### Forms

**Student Application Form:**
- Name: 1+ characters, required
- Phone: Validated by `parsePhone()` (per-country rules)
- Country: Dropdown (enum, no free text)

**Admin Forms:**
- Username: Regex check `[a-zA-Z0-9._-]{3,32}`
- Password: Length ≥ 8
- Class title: Required, no length limit
- Capacity: Integer ≥ 1

**Framework:** NextJS form validation + server-side re-check

### Query Parameters

**Pagination:** `?page=2` → parsed as integer, bounded by page count

**No SQL Injection:**
- libSQL uses parameterized queries
- User input never interpolated into SQL strings

**Code:** All `lib/*.ts` use `.execute({sql: "...", args: [...]})`

---

## XSS Prevention

**React Escaping:**
- By default, React escapes text content
- `<SeatMeter cls={cls} />` is safe (cls is object, not HTML)

**User Input Display:**
```typescript
// Safe: React escapes text
<span>{applicant.name}</span>

// Safe: React escapes attributes
<a href={`/withdraw/${token}`}>Withdraw</a>

// Dangerous (not in this app):
<div dangerouslySetInnerHTML={{__html: userInput}} />
```

**Code Review:**
- No `dangerouslySetInnerHTML` usage
- No raw HTML templates
- All user input (names, phone) displayed as text, not HTML

---

## CSRF Protection

**Mechanism:** Next.js provides automatic CSRF tokens in forms.

**How it works:**
- Form submission includes `__proto__` (implicit token)
- Server validates token matches session
- GET requests are safe (no state change)
- POST/PUT/DELETE checked automatically

**Code:**
- Server actions (`"use server"`) inherit protection
- No explicit token management needed

---

## Rate Limiting

### Login Attempts

**Rule:** 8 failed attempts per 15 minutes per IP

**Implementation:**
```typescript
const loginAttempts = new Map<string, {count, resetAt}>();

// On failed attempt:
attempts.count += 1;
if (attempts.count >= 8) {
  return error("Too many login attempts");
}
```

**Scope:** Per IP address (from `x-forwarded-for` or socket address)

**Reset:** 15-minute sliding window

**Limitations:**
- In-process only (resets on server restart)
- Not shared across multiple servers (each has own counter)

**Code:** `lib/auth.ts`, `throttleLoginAttempt()`

### Application Submissions

**No explicit rate limit** (could add if spam becomes issue)

---

## Compliance & Audit

### Data Storage

- Phone numbers stored (WhatsApp contact is the purpose)
- Names stored (identifying applicants)
- Admin usernames & password hashes (authentication)
- Audit log (who-did-what for 90+ days)

### Data Deletion

- Student can withdraw (application → cancelled)
- Admin can delete application (permanently removed)
- Backup taken before deletion (recovery possible)

### Privacy

- No tracking / analytics
- No third-party integrations
- No email/SMS (WhatsApp only)
- Withdrawal links not searchable (`noindex`)

---

## Common Threats & Mitigations

| Threat | Mitigation | Status |
|--------|-----------|--------|
| Brute force login | Rate limit (8/15min) | ✓ Implemented |
| SQL injection | Parameterized queries | ✓ Implemented |
| XSS | React escaping, no innerHTML | ✓ Implemented |
| CSRF | Next.js auto tokens | ✓ Implemented |
| Seat overselling | Transactional + write lock | ✓ Tested |
| Duplicate application | Unique constraint + transaction check | ✓ Implemented |
| Unauthorized promotion | Admin-only action + session check | ✓ Implemented |
| Session hijacking | HTTP-only cookie, HTTPS in prod | ✓ Implemented |
| Withdrawal link guessing | 24-byte random token (2^192 attempts) | ✓ Implemented |
| Data loss | Pre-delete backups (last 10) | ✓ Implemented |

---

## Security Checklist for Deployment

Before deploying to production:

- [ ] `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` set in production env
- [ ] `SESSION_SECRET` is 32+ random bytes (not hardcoded, not shared)
- [ ] `DATABASE_URL` and `DATABASE_AUTH_TOKEN` (Turso) in production env
- [ ] HTTPS enabled (Next.js on Vercel: automatic)
- [ ] Cookies have `Secure` flag (HTTPS only)
- [ ] Cookies have `HttpOnly` flag (no JavaScript access)
- [ ] CORS not needed (same-origin only)
- [ ] No debug logging of passwords/tokens
- [ ] Rate limiting monitored (adjust if needed)

---

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [API_REFERENCE.md](API_REFERENCE.md) — Function details
- [DATABASE.md](DATABASE.md) — Constraint enforcement
- [TESTING.md](TESTING.md) — Concurrency test proof
- `lib/auth.ts` — Authentication code
- `lib/phone.ts` — Phone validation code
