# Testing Guide

## Overview

The project uses **Vitest** for unit & integration testing. Current coverage focuses on the most critical paths: phone validation and capacity/waitlist logic.

**Test files:**
- `tests/phone.test.ts` — Phone parsing validation
- `tests/classes.test.ts` — Class application, waitlist, withdrawal logic

**Run tests:**
```bash
npm test           # Run once
npm run test:watch # Watch mode (re-run on file change)
```

**Test results:** All 30 tests pass (14 phone + 16 capacity/waitlist)

---

## Test Structure

### `tests/phone.test.ts` (14 tests)

Tests `lib/phone.ts` — phone number parsing and WhatsApp link generation.

#### Test Cases

**Valid numbers:**
- ✓ Strips leading 0 for Malaysian mobiles
- ✓ Accepts number without leading 0
- ✓ Ignores spaces, dashes, brackets
- ✓ Explicit `+` prefix overrides country selection
- ✓ Formats readable display value

**Invalid numbers:**
- ✓ Too short
- ✓ Too long
- ✓ Not a valid range for country
- ✓ Empty string
- ✓ No digits at all
- ✓ Unknown country code

**WhatsApp link:**
- ✓ Builds wa.me link from digits
- ✓ URL-encodes pre-filled message

#### Example Tests

```typescript
it("strips the national trunk prefix for Malaysian mobiles", () => {
  expect(ok(parsePhone("MY", "012-345 6789")).e164).toBe("60123456789");
});

it("rejects an unknown country", () => {
  expect(parsePhone("ZZ", "123456789")).toHaveProperty("error");
});

it("url-encodes a prefilled message", () => {
  expect(whatsappLink("60123456789", "Hi there!")).toBe(
    "https://wa.me/60123456789?text=Hi%20there!",
  );
});
```

---

### `tests/classes.test.ts` (16 tests)

Tests `lib/classes.ts` — seat allocation, waitlist, withdrawal logic.

**Setup:** Uses temporary file database (not `:memory:`, see [Why Not :memory:?](#why-not-memory) below).

#### Test Suite: `applyToClass` (8 tests)

**Happy path:**
- ✓ Confirms applicant while seats remain
- ✓ Allows same number in different classes
- ✓ Queues on waitlist when full + enabled

**Error cases:**
- ✓ Refuses closed class
- ✓ Refuses missing class
- ✓ Rejects duplicate (same number applying twice)
- ✓ Refuses once full (no waitlist)
- ✓ **Concurrency**: Never hands out more seats than capacity under 12 racing requests

#### Example: Concurrency Test

```typescript
it("never hands out more seats than capacity under concurrency", async () => {
  const capacity = 3;
  const id = await makeClass({ capacity, waitlistEnabled: false });

  // 12 applicants submit simultaneously
  const attempts = Array.from({ length: 12 }, (_, i) =>
    lib.applyToClass(id, `Racer ${i}`, phone(100 + i), ...)
  );
  const settled = await Promise.allSettled(attempts);

  // Only 3 succeeded
  const confirmed = settled.filter(r => r.value.ok && r.value.status === "confirmed");
  expect(confirmed).toHaveLength(capacity);
});
```

This test proved the write lock was necessary—without it, SQLite would fail with `SQLITE_BUSY`.

---

#### Test Suite: `confirmApplication` (2 tests)

- ✓ Promotes waitlisted applicant into freed seat
- ✓ Fails if class still at capacity
- ✓ Reports missing application

#### Test Suite: `withdrawByToken` (4 tests)

- ✓ Cancels application + frees seat
- ✓ Allows re-application with same number
- ✓ Refuses second withdrawal (token spent)
- ✓ Refuses unknown token

#### Test Suite: `listApplications` (1 test)

- ✓ Orders confirmed, then waitlisted, then cancelled
- ✓ Paginates correctly (25 per page)

---

## Test Patterns

### 1. Database Setup & Cleanup

**Problem:** `:memory:` databases recycle the connection between operations, so each statement sees an empty DB.

**Solution:** Use temp file database.

```typescript
const dir = mkdtempSync(path.join(tmpdir(), "cas-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;

beforeAll(async () => {
  lib = await import("@/lib/classes");
});

afterAll(async () => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
```

### 2. Transactional Isolation

Tests run sequentially. Each test has its own class (counter increments) to avoid collision:

```typescript
let counter = 0;

async function makeClass(overrides = {}) {
  counter += 1;
  return lib.createClass({
    title: `Class ${counter}`,
    capacity: 2,
    ...overrides,
  });
}
```

### 3. Concurrency Testing

Use `Promise.allSettled()` to collect results without failing on individual errors:

```typescript
const attempts = Array.from({ length: 12 }, (_, i) =>
  lib.applyToClass(id, `Racer ${i}`, phone(100 + i), ...)
);
const settled = await Promise.allSettled(attempts);
const confirmed = settled.filter(r => r.status === "fulfilled" && r.value.ok);
```

### 4. Helper Functions

```typescript
function ok(result) {
  if ("error" in result) throw new Error(`expected valid, got: ${result.error}`);
  return result;
}

function phone(n) {
  return `6012345${String(n).padStart(4, "0")}`;
}
```

---

## Coverage Gaps

The following areas are NOT currently tested but could be:

1. **Server Actions** — `app/actions/*.ts`
   - Form validation & error messages
   - Revalidate paths
   - Redirect logic
   - Session checks for admin actions

2. **Authentication** — `lib/auth.ts`
   - Rate limiting (8 attempts / 15 min)
   - Timing attack resistance (dummy hash)
   - Session cookie creation & validation

3. **Admin Functions** — `lib/admins.ts`
   - Password hashing (bcrypt rounds)
   - Case-insensitive username lookup
   - Deletion safeguard (prevent lockout)

4. **Audit Logging** — `lib/audit.ts`
   - Entry creation & immutability
   - Pagination

5. **Backup Safeguard** — `lib/backup.ts`
   - Pre-delete snapshots
   - Rolling retention (last 10)

6. **Components** — UI layer
   - Form inputs & validation feedback
   - Button interactions
   - Pagination navigation

7. **E2E Flows** — Full user journeys
   - Student apply → withdraw
   - Admin create class → promote from waitlist
   - Admin team management

---

## How to Add Tests

### Step 1: Create Test File

```bash
touch tests/myfeature.test.ts
```

### Step 2: Set Up Database

```typescript
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(path.join(import.meta.dirname, "../.test-db"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;

beforeAll(async () => {
  // Import modules after env is set
  lib = await import("@/lib/mymodule");
});

afterAll(async () => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
```

### Step 3: Write Tests

```typescript
describe("my feature", () => {
  it("does the thing", async () => {
    const result = await lib.doThing();
    expect(result).toBe(expected);
  });
});
```

### Step 4: Run

```bash
npm test
```

---

## Debugging Tests

### Print Debug Output

```typescript
it("my test", () => {
  console.log("debug:", someValue);
  // shown in test output
});
```

Run with:
```bash
npm test -- tests/myfeature.test.ts --reporter=verbose
```

### Use Watch Mode

```bash
npm run test:watch
```

Edit a test file; Vitest re-runs automatically.

### Step Through in IDE

Most IDEs support Vitest debugging. Set breakpoint and run test.

---

## CI/CD Integration

**Currently:** Tests run locally only.

**Suggested for CI (GitHub Actions):**

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm test
```

---

## Why Not :memory:?

SQLite's libSQL client recycles the connection between operations. Each statement gets a fresh connection, so after the first CREATE TABLE, the next SELECT sees an empty database.

**Workaround:** Use temp file database (`file:` URL with mkdtemp).

This is a known pattern in libSQL testing. See database connection pooling for details.

---

## Performance Notes

Current tests run in ~600ms on local SQLite. As coverage grows:
- Parallel test files (separate DB per file)
- Keep database per-test small (not many applicants)
- Use in-memory for non-schema tests if possible (or use better mocking)

---

## See Also

- [API_REFERENCE.md](API_REFERENCE.md) — Functions being tested
- [DATABASE.md](DATABASE.md) — Schema for test setup
- `vitest.config.ts` — Test configuration
- `tests/` — All test files
