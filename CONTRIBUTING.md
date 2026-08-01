# Contributing Guide

## Welcome

Thanks for contributing to the Appointment System! This guide explains how to set up your development environment, write code, and submit changes.

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/kw42chan/class-application-system.git
cd class-application-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment

```bash
npm run setup
# Follow prompts for admin username & password
```

### 4. Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### 5. Run Tests

```bash
npm test
# All tests should pass
```

---

## Development Workflow

### Branch Naming

Create a branch for your work:

```bash
git checkout -b feature/short-description
# Examples:
# feature/add-email-notifications
# fix/phone-validation-edge-case
# docs/update-api-reference
```

### Commit Messages

Write clear, descriptive commit messages:

**Format:**
```
Type: Short description (under 50 chars)

Longer explanation if needed. Explain WHY you made the change,
not WHAT the code does (code speaks for itself).

- Bullet points for multiple changes
- Each change is one line
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code reorganization
- `docs:` Documentation
- `test:` Test additions or fixes
- `chore:` Dependency updates, config changes

**Examples:**

```
feat: Add email notifications to student applications

Students now receive an email when:
- Their application is confirmed
- They are promoted from the waitlist
- A reminder when 24h before class starts

Implement via SendGrid API with email templates.

test: Add tests for email notification logic
```

```
fix: Handle invalid phone numbers gracefully

Previously, non-numeric phone input would crash the parser.
Now we validate with libphonenumber-js before parsing.

Closes #42
```

### Code Style

**TypeScript:**
- Use strict mode (no `any` types)
- Props typed with interfaces, not inline types
- No `var`, use `const`/`let`

**React:**
- Functional components only (no class components)
- Hooks for state management
- Props destructured in function signature

**Naming:**
- Components: PascalCase (`<ClassForm>`, `<SeatMeter>`)
- Functions: camelCase (`applyToClass`, `parsePhone`)
- Constants: UPPER_SNAKE_CASE (`PAGE_SIZE`, `BCRYPT_ROUNDS`)
- Files: kebab-case (classForm.tsx) for components, kebab-case (phone.ts) for utils

**Comments:**
- Only add comments if WHY is non-obvious
- NEVER comment WHAT the code does (code speaks for itself)
- NEVER comment referencing the current task/issue (that belongs in commit message)

**Examples:**

```typescript
// Good: Explains WHY
// Limit to 8 failed attempts per 15 min to prevent brute force
const MAX_LOGIN_ATTEMPTS = 8;

// Bad: States the obvious
// Set max attempts to 8
const MAX_LOGIN_ATTEMPTS = 8;

// Good: Explains a subtle invariant
// Check confirmed count INSIDE the transaction to prevent race conditions
// where two requests both see an available seat
const confirmedCount = await tx.execute(...);

// Bad: Restates the code
// Query the confirmed count
const confirmedCount = await tx.execute(...);
```

**Formatting:**
- Use Prettier (run `npm run lint` to fix)
- 2-space indentation
- 80-char line limit for readability (soft limit)

### Tailwind CSS

Use Tailwind classes, not CSS files:

```tsx
// Good
<button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
  Apply
</button>

// Bad: Don't use inline styles
<button style={{padding: '8px 16px', backgroundColor: 'blue'}}>
  Apply
</button>

// Bad: Don't create new CSS
<style>{`
  .apply-btn { background: blue; }
`}</style>
```

---

## Making Changes

### Adding a Feature

**1. Plan first** (especially for large changes)
- Write it out: what pages/functions/database tables change
- Check for conflicts with existing code

**2. Create test cases** (before or after, but include them)
- Unit tests for library functions (`lib/`)
- No need for test for UI tweaks
- Integration tests for multi-step flows

**3. Implement the feature**
- Keep changes focused (one feature = one PR)
- Don't refactor unrelated code in the same PR

**4. Test manually**
- Run dev server
- Test golden path (happy case)
- Test error cases (validation failures, edge cases)
- Check dark mode and mobile responsiveness

**5. Update documentation**
- Update README.md if user-facing
- Update relevant doc file (API_REFERENCE.md, DATABASE.md, etc.)
- Add JSDoc comments to exported functions

### Fixing a Bug

**1. Reproduce the bug**
- Confirm with a test case
- Add test that fails before fix, passes after

**2. Locate the root cause**
- Don't just patch the symptom
- Check git blame to understand why it exists

**3. Fix it**
- Minimal change to resolve the issue
- No drive-by refactoring

**4. Test**
- Run `npm test` to ensure all tests pass
- Test the specific bug scenario manually
- Test related functionality for regressions

### Updating Dependencies

**Before updating:**
- Check changelog for breaking changes
- Run tests with current version first

**After updating:**
- Run `npm test`
- Run `npm run typecheck`
- Run `npm run build` (test production build)
- Test manually in dev server

**Commit:**
```
chore: Update dependency-name to v1.2.3

- Upgrade from v1.0.0
- No breaking changes for our usage
- Fixes bug/performance issue: [description]
```

---

## Testing

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on file change)
npm run test:watch

# Run specific test file
npm test tests/phone.test.ts

# Verbose output
npm test -- --reporter=verbose
```

### Writing Tests

**Location:** `tests/` directory

**File naming:** `feature.test.ts`

**Test structure:**
```typescript
import { describe, it, expect } from 'vitest';

describe('my feature', () => {
  it('does the expected thing', async () => {
    const result = await doThing();
    expect(result).toBe(expected);
  });

  it('handles error case', async () => {
    const result = await doThing();
    expect(result).toHaveProperty('error');
  });
});
```

**Best practices:**
- One `describe` block per function
- Test happy path + error cases
- Use descriptive test names (not "test 1", "test 2")
- Each test is independent (no shared state)

### Coverage Goals

**Current:** 30 tests covering:
- Phone validation (all country rules)
- Seat allocation (capacity, waitlist, race conditions)
- Withdrawal logic

**Future nice-to-have:**
- Server actions (form validation, redirects)
- Authentication (rate limiting, session)
- Audit logging
- E2E flows

---

## Submitting a PR

### Before Pushing

1. **Run checks**
   ```bash
   npm run lint      # Fix: npm run lint --fix
   npm run typecheck
   npm test
   npm run build     # Test production build
   ```

2. **Commit with clear messages**
   ```bash
   git add .
   git commit -m "feat: Clear description"
   ```

3. **Push to your fork**
   ```bash
   git push origin feature/your-feature
   ```

### PR Guidelines

**Title:** Short description (same as commit message first line)

**Description:** Include:
- **What changed** — Brief summary
- **Why** — Problem it solves or feature it enables
- **How to test** — Steps to verify manually
- **Related issues** — Link to issues (e.g., "Closes #42")

**Example PR:**

```markdown
## feat: Add email notifications to students

### Changes
- Integrate SendGrid API for email delivery
- Send confirmation email when application accepted
- Send reminder email 24h before class

### Testing
1. Apply to a class with a test email
2. Verify confirmation email arrives (check spam)
3. Promote applicant from waitlist
4. Verify notification email sent

### Checklist
- [x] Tests pass: `npm test`
- [x] Types pass: `npm run typecheck`
- [x] Lints: `npm run lint --fix`
- [x] Build succeeds: `npm run build`
- [x] Documented in API_REFERENCE.md
```

### Code Review

A maintainer will review your PR. They may:
- Ask clarifying questions
- Request changes
- Approve

**Be open to feedback** — Code review makes the codebase better.

---

## Deployment

### To Staging

(If you have access)

```bash
# Make sure everything is committed
git status

# Push to vercel (or your staging environment)
git push origin feature/your-feature
# Vercel auto-deploys preview on PR
```

### To Production

(Maintainers only)

1. Merge PR to `main`
2. Create a GitHub release
3. Tag: `v1.2.3` (semantic versioning)
4. Vercel auto-deploys on main branch push

---

## Documentation Standards

### README.md

Update for:
- New user-facing features
- Changed setup instructions
- New deployment requirements

### Markdown Files

- **ARCHITECTURE.md** — System design changes
- **DATABASE.md** — Schema changes, migrations
- **API_REFERENCE.md** — New functions or changed signatures
- **TESTING.md** — New test patterns
- **SECURITY.md** — Security implications of new features
- **COMPONENTS.md** — New or changed components
- **TROUBLESHOOTING.md** — New common issues

### JSDoc Comments

For exported functions, add JSDoc:

```typescript
/**
 * Apply to a class with race-condition protection.
 * 
 * @param classId - Class ID
 * @param name - Student name
 * @param phoneE164 - Digits only ("+60123456789")
 * @param phoneDisplay - Readable format ("+60 12 345 6789")
 * 
 * @returns {Promise<ApplyResult>} - {ok: true, status, position, token} or {ok: false, reason}
 * 
 * @throws Never throws; errors returned in result object
 */
export async function applyToClass(
  classId: number,
  name: string,
  phoneE164: string,
  phoneDisplay: string,
): Promise<ApplyResult> {
  // ...
}
```

---

## Common Pitfalls

### ❌ Don't

- Commit directly to `main` (use feature branch + PR)
- Skip tests (they catch real bugs)
- Use `any` type (defeats TypeScript)
- Hardcode API keys or secrets
- Add large dependencies without discussion
- Break backward compatibility without major version bump
- Commit `.env.local` or node_modules

### ✅ Do

- Create a branch
- Write tests for new logic
- Use proper TypeScript types
- Use environment variables for secrets
- Keep dependencies minimal
- Discuss breaking changes first
- Use `.gitignore` for environment files

---

## Git Workflow

### Typical Flow

```bash
# 1. Create branch
git checkout -b feature/cool-feature

# 2. Make changes, test, commit
npm test  # Make sure all tests pass
git add .
git commit -m "feat: Add cool feature"

# 3. Push
git push origin feature/cool-feature

# 4. Create PR on GitHub
# (GitHub prompts you to create PR after push)

# 5. Wait for review + checks
# - GitHub Actions runs tests
- Maintainer reviews code

# 6. Merge
# (Maintainer clicks "Merge PR" button)

# 7. Delete branch (optional, GitHub does this)
git branch -D feature/cool-feature
git fetch -p origin
```

### Keeping Up with Main

If `main` has advanced and you have conflicts:

```bash
# Fetch latest
git fetch origin

# Rebase on main
git rebase origin/main

# If conflicts: resolve them, then
git rebase --continue

# Force push (only safe on your own branch)
git push --force-with-lease origin feature/cool-feature
```

---

## Getting Help

- **Questions:** Open a discussion or GitHub issue
- **Bug report:** Open a GitHub issue with reproduction steps
- **Code review:** Post in PR (tag maintainers)
- **Chat:** Discord/Slack (if available)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (typically MIT).

---

## See Also

- [README.md](README.md) — Project overview
- [TESTING.md](TESTING.md) — Test structure & patterns
- [CODE_STYLE.md](CODE_STYLE.md) (if available) — More detailed style guide
