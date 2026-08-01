# API Reference

## Server Actions

Server actions are async functions in `app/actions/*.ts` called from forms. They handle mutations, return state, and can redirect.

### `app/actions/apply.ts`

#### `parseCountryCode(code: string | undefined)`

**Purpose**: Map a phone country code to ISO code.

**Parameters:**
- `code` — Dialing code (e.g., "60", "852") or ISO code (e.g., "MY", "HK")

**Returns:** ISO code (e.g., "MY") or "MY" (default)

**Errors:** None (falls back to default)

```typescript
parseCountryCode("60")   // "MY"
parseCountryCode("MY")   // "MY"
parseCountryCode(undefined) // DEFAULT_COUNTRY from env
```

---

#### `submitApply(prevState: ApplyState, formData: FormData)`

**Purpose**: Process student application (server action).

**Parameters:**
- `prevState` — Previous form state (for error recovery)
- `formData` — Form submission data:
  - `name` (string) — Student name
  - `country` (string) — ISO country code or dialing code
  - `phone` (string) — Local phone number

**Returns:** `ApplyState` object:

```typescript
{
  status: 'idle' | 'error' | 'success',
  message?: string,
  classTitle?: string,
  outcome?: 'confirmed' | 'waitlisted',  // If success
  position?: number | null,              // Waitlist position (if waitlisted)
  withdrawToken?: string,                // Withdrawal link token
  applicationId?: number,                // For data retrieval
}
```

**Errors:**
- `"Class doesn't exist"` — Class not found
- `"Class is closed"` — Applications not open
- `"Class is full"` — No seats and no waitlist
- `"That WhatsApp number doesn't look right..."` — Invalid number for country
- `"You've already applied to this class"` — Duplicate phone number

**Example:**

```typescript
const formData = new FormData();
formData.append('name', 'Alice');
formData.append('country', 'MY');
formData.append('phone', '012-345 6789');

const result = await submitApply({status: 'idle'}, formData);
if (result.status === 'success') {
  console.log(`${result.outcome}: position ${result.position}`);
}
```

---

### `app/actions/withdraw.ts`

#### `submitWithdrawal(prevState: WithdrawState, formData: FormData)`

**Purpose**: Process student self-withdrawal (server action).

**Parameters:**
- `prevState` — Previous state (for error recovery)
- `formData` — Must include:
  - `token` (string) — Withdrawal token from URL

**Returns:** `WithdrawState` object:

```typescript
{
  status: 'idle' | 'error' | 'done',
  name?: string,           // If success
  classTitle?: string,     // If success
  message?: string,        // If error
}
```

**Errors:**
- `"This link isn't valid"` — Token not found or already used
- Any database error

**Example:**

```typescript
const formData = new FormData();
formData.append('token', 'abc123xyz...');

const result = await submitWithdrawal({status: 'idle'}, formData);
if (result.status === 'done') {
  console.log(`${result.name} withdrew from ${result.classTitle}`);
}
```

---

### `app/actions/admin.ts`

These are admin-only server actions (require session).

#### `saveClass(formData: FormData)`

**Purpose**: Create or update a class.

**Parameters:** FormData with:
- `id` (optional) — If present, update; if absent, create
- `title`, `description`, `instructor`, `schedule`, `location` — Class fields
- `capacity` — Max seated students
- `isOpen` — Checkbox "open for applications"
- `waitlistEnabled` — Checkbox "keep waitlist when full"

**Side Effects:**
- Creates/updates `classes` row
- Audits: "created class" or "updated class"
- Revalidates `/admin` path

**Errors:** Validation errors returned in form state

---

#### `toggleClassOpen(formData: FormData)`

**Purpose**: Quickly open or close a class.

**Parameters:**
- `id` — Class ID

**Side Effects:**
- Toggles `is_open` column
- Audits: "class opened" or "class closed"

---

#### `removeClass(formData: FormData)`

**Purpose**: Delete a class permanently.

**Parameters:**
- `id` — Class ID

**Side Effects:**
- Takes backup before delete (`data/backups/`)
- Deletes class and cascades to applications
- Audits: "deleted class"
- Revalidates `/admin`

---

#### `confirmApplicationAction(formData: FormData)`

**Purpose**: Promote applicant from waitlist or restore cancelled.

**Parameters:**
- `id` — Application ID
- `classId` — Class ID (for revalidation)
- `name`, `from` — For audit trail

**Side Effects:**
- Updates status from "waitlisted"/"cancelled" to "confirmed"
- Fails if class is at capacity
- Audits: "promoted from waitlist" or "restored applicant"
- Revalidates `/admin/classes/[id]`

**Returns:** Redirect to class with `?promoted=1` (success) or `?error=full` (failure)

---

#### `cancelApplicationAction(formData: FormData)`

**Purpose**: Cancel a confirmed applicant.

**Parameters:**
- `id` — Application ID
- `classId` — Class ID
- `name` — For audit

**Side Effects:**
- Updates status from "confirmed" to "cancelled"
- Frees seat (other waitlisted can be promoted)
- Audits: "cancelled applicant"
- Revalidates `/admin/classes/[id]`

---

#### `removeApplication(formData: FormData)`

**Purpose**: Permanently delete an application.

**Parameters:**
- `id` — Application ID
- `classId` — Class ID
- `name` — For audit

**Side Effects:**
- Takes backup before delete
- Deletes application row
- Audits: "deleted applicant"
- Revalidates `/admin/classes/[id]`

---

#### `addAdmin(formData: FormData)`

**Purpose**: Create a new administrator account.

**Parameters:**
- `username` — Must be 3-32 chars, alphanumeric + `._-`
- `password` — Must be ≥ 8 chars

**Side Effects:**
- Creates admin row with bcrypt hash
- Audits: "added administrator"
- Revalidates `/admin/team`

**Errors:**
- `"Username already exists"`
- `"Password must be at least 8 characters"`
- `"Username invalid. Use alphanumeric..."`

---

#### `removeAdmin(formData: FormData)`

**Purpose**: Remove an administrator account.

**Parameters:**
- `id` — Admin ID

**Side Effects:**
- Refuses if count ≤ 1 (prevent lockout)
- Refuses if removing self
- Audits: "removed administrator"
- Revalidates `/admin/team`

**Errors:**
- `"Cannot remove yourself"`
- `"Cannot remove the last administrator"`

---

#### `changeOwnPassword(formData: FormData)`

**Purpose**: Admin changes their own password.

**Parameters:**
- `currentPassword` — Must match current hash
- `newPassword` — Must be ≥ 8 chars

**Side Effects:**
- Verifies current password first
- Updates password hash
- Audits: "changed password"

**Errors:**
- `"Current password is incorrect"`
- `"New password must be at least 8 characters"`

---

#### `logout()`

**Purpose**: Sign out (delete session cookie).

**Side Effects:**
- Clears session cookie
- Redirects to `/admin/login`

---

## Library Functions

These are exported from `lib/*.ts` and used internally by server actions.

### `lib/classes.ts`

#### `createClass(input: ClassInput): Promise<number>`

**Purpose**: Insert a new class.

**Parameters:**
```typescript
{
  title: string,
  description: string,
  instructor: string,
  location: string,
  schedule: string,
  capacity: number,
  isOpen: boolean,
  waitlistEnabled: boolean,
}
```

**Returns:** Class ID

**Errors:** Database constraint violations

---

#### `getClass(id: number): Promise<ClassRecord | null>`

**Purpose**: Fetch a class by ID.

**Returns:**
```typescript
{
  id, title, description, instructor, location, schedule,
  capacity, isOpen, waitlistEnabled, waitlistCount, createdAt
}
```

---

#### `listClasses(): Promise<ClassRecord[]>`

**Purpose**: List all classes (student view).

**Returns:** Array of ClassRecord

---

#### `applyToClass(classId, name, phoneE164, phoneDisplay): Promise<ApplyResult>`

**Purpose**: Apply to a class (transactional seat allocation).

**Parameters:**
- `classId` — Class ID
- `name` — Student name
- `phoneE164` — Digits only ("+60123456789")
- `phoneDisplay` — Readable format ("+60 12 345 6789")

**Returns:**
```typescript
{
  ok: true,
  status: 'confirmed' | 'waitlisted',
  position: number | null,        // Waitlist position (if waitlisted)
  withdrawToken: string,
  applicationId: number,
} | {
  ok: false,
  reason: 'closed' | 'full' | 'not_found' | 'duplicate'
}
```

**Transaction safety:** Serialized by `withWriteLock()`, race-condition proof.

---

#### `cancelApplication(id): Promise<{ ok: boolean }>`

**Purpose**: Mark application as cancelled (frees seat).

**Parameters:**
- `id` — Application ID

---

#### `confirmApplication(id): Promise<{ ok, reason? }>`

**Purpose**: Promote from waitlist to confirmed (if seat available).

**Returns:**
```typescript
{ ok: true } | { ok: false, reason: 'full' | 'not_found' }
```

---

#### `withdrawByToken(token): Promise<WithdrawResult>`

**Purpose**: Cancel application by withdrawal token.

**Returns:**
```typescript
{ ok: true } | { ok: false, reason: 'not_found' | 'already_withdrawn' }
```

---

#### `listApplications(classId, {limit?, offset?}): Promise<ApplicationRecord[]>`

**Purpose**: List applicants for a class (paginated, confirmed first).

**Parameters:**
- `classId` — Class ID
- `limit` — Rows per page (default 25)
- `offset` — Starting row

**Returns:** Array ordered: confirmed, then waitlisted, then cancelled

---

#### `getApplicationByToken(token): Promise<{application, classTitle} | null>`

**Purpose**: Lookup application by withdrawal token.

**Returns:** Application record + class title

---

#### `countApplications(classId): Promise<{total, confirmed, waitlisted, cancelled}>`

**Purpose**: Count applicants by status.

---

#### `waitlistPosition(classId, beforeId): Promise<number>`

**Purpose**: Get position in queue for a waitlisted applicant.

**Returns:** Position (1-indexed)

---

#### `isAcceptingApplications(cls): boolean`

**Purpose**: Check if class is open AND below capacity.

---

#### `isAcceptingWaitlist(cls): boolean`

**Purpose**: Check if class is full but waitlist enabled.

---

#### `isAcceptingAnything(cls): boolean`

**Purpose**: Check if open OR (full with waitlist).

---

#### `seatsLeft(cls): number`

**Purpose**: Calculate available seats.

**Returns:** `capacity - confirmedCount`

---

### `lib/phone.ts`

#### `parsePhone(country: string, localNumber: string): {e164, display} | {error}`

**Purpose**: Validate and normalize phone number.

**Parameters:**
- `country` — ISO code ("MY", "SG", "HK", etc.)
- `localNumber` — Local format (leading 0 accepted, spaces/dashes OK)

**Returns:**
- Success: `{e164: "60123456789", display: "+60 12 345 6789"}`
- Failure: `{error: "...reason..."}`

**Validation Rules:**
- Rejects fixed-line numbers
- Per-country digit count and patterns (via libphonenumber-js)
- Strips leading 0 (Malaysia, etc.)
- Accepts explicit `+` prefix (overrides country)

---

#### `whatsappLink(e164, message?): string`

**Purpose**: Build WhatsApp chat link.

**Parameters:**
- `e164` — Digits only
- `message` — Optional pre-filled message

**Returns:** `https://wa.me/60123456789?text=...`

---

### `lib/admins.ts`

#### `ensureSeedAdmin(): Promise<void>`

**Purpose**: On first sign-in, copy env admin to database.

**Side Effect:** Creates admin row from `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH`, if table empty

---

#### `findAdminByUsername(username): Promise<{id, username, passwordHash} | null>`

**Purpose**: Lookup admin for login.

**Parameters:**
- `username` — Case-insensitive search

---

#### `createAdmin(username, password, createdBy): Promise<number>`

**Purpose**: Create new admin.

**Parameters:**
- `username` — 3-32 chars
- `password` — ≥ 8 chars
- `createdBy` — Who created (username)

**Returns:** Admin ID

---

#### `setAdminPassword(id, password): Promise<void>`

**Purpose**: Update admin password.

---

#### `deleteAdmin(id): Promise<{ok: boolean}>`

**Purpose:** Remove admin (refuses if last).

**Returns:** `{ok: false}` if would leave zero admins

---

#### `listAdmins(): Promise<AdminRecord[]>`

**Purpose:** List all admins.

---

#### `countAdmins(): Promise<number>`

**Purpose:** Total admin count.

---

### `lib/audit.ts`

#### `recordAudit(entry): Promise<void>`

**Purpose**: Append audit log entry (called after mutations).

**Parameters:**
```typescript
{
  actor: string,           // Username
  action: string,          // "created class", "deleted applicant", etc.
  entityType?: string,     // "class", "application", "admin"
  entityId?: number,       // ID of entity
  summary?: string,        // Human description
}
```

**Side Effect:** Never throws (logs errors instead)

---

#### `listAudit({limit?, offset?}): Promise<AuditEntry[]>`

**Purpose:** List audit log (newest first).

**Parameters:**
- `limit` — Rows per page (default 50)
- `offset` — Starting row

---

#### `countAudit(): Promise<number>`

**Purpose:** Total log entries.

---

### `lib/auth.ts`

#### `verifyCredentials(username, password): Promise<{ok, username?}>`

**Purpose**: Check login (constant-time with dummy hash).

**Returns:** `{ok: true, username}` or `{ok: false}`

---

#### `requireAdmin(): Promise<{username: string}>`

**Purpose**: Middleware for `/admin` pages (throws if not authenticated).

**Returns:** Session data

**Error:** 401 Unauthorized if no session or expired

---

## See Also

- [ARCHITECTURE.md](ARCHITECTURE.md) — Data flow & system design
- [DATABASE.md](DATABASE.md) — Schema & query patterns
- [TESTING.md](TESTING.md) — Testing these functions
- [SECURITY.md](SECURITY.md) — Rate limiting, validation rules
