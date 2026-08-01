# Database Schema & Migrations

## Overview

The database uses SQLite (local) or Turso (production). Schema changes are versioned via `user_version` pragma—migrations are immutable and applied sequentially on startup. This enables safe multi-region deployments.

## Schema Versions

### Version 1: Initial Schema

Applied automatically for existing databases (detected via `baselineVersion()`).

#### Table: `classes`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, autoincrement | Unique class ID |
| `title` | TEXT | NOT NULL | Class name |
| `description` | TEXT | | Long description |
| `instructor` | TEXT | | Instructor name |
| `location` | TEXT | | Where it's held |
| `schedule` | TEXT | | When (date/time) |
| `capacity` | INTEGER | NOT NULL | Max seated students |
| `is_open` | INTEGER | NOT NULL, default 1 | Accept applications? (0/1) |
| `created_at` | TEXT | NOT NULL, default CURRENT_TIMESTAMP | Creation time (UTC) |

**Indexes:**
- None (PK only)

#### Table: `applications`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, autoincrement | Unique application ID |
| `class_id` | INTEGER | NOT NULL, FK classes(id) | Which class |
| `name` | TEXT | NOT NULL | Student name |
| `phone_e164` | TEXT | NOT NULL | Digits only (+60123456789) for wa.me |
| `phone_display` | TEXT | NOT NULL | Readable format (+60 12 345 6789) |
| `status` | TEXT | NOT NULL, default 'confirmed' | "confirmed" / "waitlisted" / "cancelled" |
| `created_at` | TEXT | NOT NULL, default CURRENT_TIMESTAMP | Application time (UTC) |

**Indexes:**
- `(class_id)` — Find all applicants for a class
- `(class_id, status)` — Find confirmed/waitlisted/cancelled per class
- `(phone_e164, class_id)` — Enforce no-duplicate rule

**Foreign Keys:**
- `class_id` → `classes(id)` (ON DELETE CASCADE)

#### Data Relationships

```
classes (1) ─── (many) applications
  - One class has many applications
  - Deleting a class cascades to delete its applications
  - Applicants can be confirmed (hold a seat), waitlisted, or cancelled
```

### Version 2: Waitlist & Multi-Admin

Added withdrawal tokens, admin accounts, audit logging.

#### Table: `applications` (columns added in v2)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `withdraw_token` | TEXT | UNIQUE | One-off URL token for self-withdrawal |

#### Table: `classes` (columns added in v2)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `waitlist_enabled` | INTEGER | NOT NULL, default 0 | Enable waitlist when full? |
| `waitlist_count` | INTEGER | GENERATED STORED | Number of waitlisted applicants (computed) |

**Indexes added:**
- `(withdraw_token)` — Lookup application for withdrawal

#### Table: `admins` (new in v2)

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, autoincrement | Unique admin ID |
| `username` | TEXT | NOT NULL, UNIQUE | Login username (case-insensitive in code) |
| `password_hash` | TEXT | NOT NULL | bcrypt hash (12 rounds) |
| `created_at` | TEXT | NOT NULL, default CURRENT_TIMESTAMP | When added (UTC) |
| `created_by` | TEXT | NOT NULL | Who created this admin (username or "env") |

**Indexes:**
- `(username)` — Case-insensitive lookup

#### Table: `audit_log` (new in v2)

Immutable append-only log. No UPDATE/DELETE allowed.

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, autoincrement | Log entry ID |
| `actor` | TEXT | NOT NULL | Username who performed action |
| `action` | TEXT | NOT NULL | What they did (e.g., "created class") |
| `entity_type` | TEXT | | What entity (class, application, admin) |
| `entity_id` | INTEGER | | Which entity ID |
| `summary` | TEXT | | Human-readable summary |
| `created_at` | TEXT | NOT NULL, default CURRENT_TIMESTAMP | When (UTC) |

**Indexes:**
- `(created_at DESC)` — Latest first

**Audit Actions Logged:**
- `"created class"` (entity_type: class)
- `"updated class"` (entity_type: class)
- `"deleted class"` (entity_type: class)
- `"promoted from waitlist"` (entity_type: application)
- `"restored applicant"` (entity_type: application)
- `"deleted applicant"` (entity_type: application)
- `"added administrator"` (entity_type: admin)
- `"removed administrator"` (entity_type: admin)
- `"changed password"` (actor only, no entity)

## Migration Strategy

### How Migrations Work

1. **Database starts at `user_version = 0`** (fresh database)
2. **baselineVersion()** detects if existing tables present
   - If tables exist: assume v1 has been applied, set `user_version = 1`
   - If no tables: `user_version` stays 0
3. **migrate()** loops through MIGRATIONS array
   - For each version ≤ current `user_version`: skip
   - For each version > current `user_version`: execute migration
   - Update `user_version` after each
4. **ready()** promise ensures migrations run once per process

### Example: Adding a New Migration

When you need to add a new column or table:

1. Increment `SCHEMA_VERSION` if needed (actually it auto-increments to `MIGRATIONS.length`)
2. Append a new array to `MIGRATIONS` in `lib/db.ts`:

```typescript
const MIGRATIONS = [
  // v1: existing migrations...
  [
    `CREATE TABLE classes (...)`,
    // ... v1 statements
  ],
  [
    `CREATE TABLE applications (...)`,
    // ... v2 statements
  ],
  // v3: your new migration
  [
    `ALTER TABLE classes ADD COLUMN category TEXT;`,
    `CREATE INDEX classes_category ON classes(category);`,
  ],
];
```

3. Restart the app—migration runs automatically
4. Test with both fresh DB and upgraded DB

**Important:**
- **Never edit an existing migration** — it won't re-run on deployed databases
- **Always use IF NOT EXISTS / IF NOT FOUND** where safe
- **Append-only** — new migrations go at the end
- **Transaction safety** — each statement runs in a transaction by default

### Rollback Strategy

Currently **no automatic rollback**. If a migration breaks production:

1. Revert the code change (git revert)
2. Database stays at new schema
3. Code works with the new schema even if empty/partially migrated
4. If absolutely necessary, restore from backup (`data/backups/` if on local file)

## Data Types & Conventions

- **Timestamps**: `TEXT` in ISO 8601 format (UTC), e.g., "2026-08-01 21:45:30"
  - Render with JavaScript `toLocaleString()` or set `TZ` env var
- **Booleans**: `INTEGER` (0/1)
- **Phone Numbers**: 
  - e164: digits only, no spaces/dashes (e.g., "60123456789")
  - display: human-readable with spaces (e.g., "+60 12 345 6789")
- **Passwords**: bcrypt hashes only, never plain text
- **IDs**: AUTOINCREMENT INTEGER PRIMARY KEY

## Backup Strategy

Before `deleteClass()` or `deleteApplication()`, `backupBeforeDestructiveChange()` writes a snapshot:

```
data/backups/app-2026-08-01T13-46-00-delete-application-11.db
                └─ timestamp        └─ reason   └─ entity ID
```

**Backup rules:**
- Only on local SQLite (skipped on Turso/remote)
- Keeps 10 most recent
- Automatic, no manual intervention
- Full database snapshot via `VACUUM INTO`

**Restore from backup:**
```bash
# List backups
ls data/backups/

# Restore (make a copy first!)
cp data/backups/app-TIMESTAMP-reason.db data/app.db
npm run dev
```

## Query Patterns

### Get Applicant Counts for a Class

```sql
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
  SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) AS waitlisted,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled
FROM applications
WHERE class_id = ?;
```

Implemented in `lib/classes.ts` as `countApplications()`.

### List Applicants (Confirmed First, Then Waitlist)

```sql
SELECT *
FROM applications
WHERE class_id = ?
ORDER BY
  CASE WHEN status = 'confirmed' THEN 0 ELSE 1 END,
  created_at ASC
LIMIT ? OFFSET ?;
```

Implemented in `lib/classes.ts` as `listApplications()`.

### Check for Duplicate Application

```sql
SELECT id
FROM applications
WHERE class_id = ? AND phone_e164 = ? AND status IN ('confirmed', 'waitlisted');
```

Enforced in `lib/classes.ts` before inserting.

### Find Waitlist Position

```sql
SELECT COUNT(*) + 1 AS position
FROM applications
WHERE class_id = ? AND status = 'waitlisted' AND created_at < ?;
```

Calculated in `lib/classes.ts` as `waitlistPosition()`.

## Foreign Key Integrity

Foreign keys are **enabled** (`PRAGMA foreign_keys = ON`). Deleting a class cascades to delete its applications:

```sql
DELETE FROM classes WHERE id = ?;
-- Automatically deletes all rows in applications with class_id = ?
```

## Performance Considerations

- **Indexes on foreign keys** (`class_id`, `phone_e164, class_id`) speed up lookups
- **No full-text search** — use simple LIKE for now
- **No pagination at DB level** — fetch all applicants, paginate in app (reasonable for small classes)
- **Generated column** `waitlist_count` is computed on read (no storage cost)

For production scale (10k+ applicants per class), add:
- Partial indexes on active statuses
- Pagination at DB level
- Materialized view for counts

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design & data flow
- [API_REFERENCE.md](API_REFERENCE.md) — Query functions
- `lib/db.ts` — Connection & migrations code
- `lib/classes.ts`, `lib/admins.ts`, `lib/audit.ts` — Query implementations
