# Troubleshooting Guide

## Development Server

### Problem: Port 3000 in use

**Error:**
```
Port 3000 is in use by node.exe (PID 30524)
```

**Causes:**
- Previous dev server still running
- Another application using port 3000

**Solutions:**

**Option 1: Kill the process**
```powershell
Get-Process -Name node | Stop-Process -Force
npm run dev
```

**Option 2: Use a different port**
```bash
PORT=3001 npm run dev
# Or edit .claude/launch.json to use autoPort: true
```

**Option 3: Restart all Node processes**
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
npm run dev
```

**Prevention:**
- Set `autoPort: true` in `.claude/launch.json` (auto-selects free port)
- Kill processes before each dev session

---

### Problem: Dev server crashes or exits silently

**Error:**
```
Unexpectedly exited with code: 1
```

**Causes:**
- Syntax error in TypeScript/React code
- Missing import
- Database connection issue
- Out of memory (unlikely)

**Solutions:**

1. **Check console output** — Did you see an error message?
   ```bash
   npm run dev
   # Look at full error output (not just exit code)
   ```

2. **Rebuild project**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Check database connection**
   - Ensure `DATABASE_URL` is set in `.env.local`
   - If using Turso: verify `DATABASE_AUTH_TOKEN`
   - Try `npm run test` to see if database works

4. **Run type check**
   ```bash
   npm run typecheck
   ```

5. **Check for infinite loops** — If process is hung (not crashing):
   ```bash
   # Kill and restart
   Get-Process node | Stop-Process -Force
   npm run dev
   ```

---

### Problem: "Cannot find module" or import errors

**Error:**
```
Module not found: Can't resolve '@/lib/classes'
```

**Causes:**
- File was deleted
- Import path is wrong
- TypeScript path alias not configured

**Solutions:**

1. **Check file exists**
   ```bash
   ls lib/classes.ts
   ```

2. **Verify import path**
   - Should be `@/lib/classes` not `./lib/classes` (use alias)
   - Should be `lib/classes` not `lib/classes.ts` (no extension)

3. **Restart dev server**
   ```bash
   npm run dev
   ```

4. **Check tsconfig.json** — Verify `paths` alias is set:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```

---

## Database Issues

### Problem: "no such table: classes"

**Error:**
```
LibsqlError: SQLITE_ERROR: no such table: classes
```

**Causes:**
- Database file is corrupted or empty
- Migrations didn't run
- Wrong DATABASE_URL

**Solutions:**

1. **Check database URL**
   ```bash
   echo $env:DATABASE_URL  # PowerShell
   echo $DATABASE_URL      # Bash
   ```
   Should be `file:./data/app.db` or similar.

2. **Reset local database** (dev only!)
   ```bash
   rm data/app.db
   npm run dev
   # Migrations run automatically
   ```

3. **Check migration logs**
   - Restart dev server
   - Look for "Applying migration v1" message
   - If missing, migrations didn't run

4. **Verify database file**
   ```bash
   ls -la data/app.db
   # File should be > 1KB
   ```

---

### Problem: "database is locked" (SQLITE_BUSY)

**Error:**
```
LibsqlError: SQLITE_BUSY: database is locked
```

**Causes:**
- Another process is writing to the database
- Multiple dev servers running
- Backup process is taking a snapshot

**Solutions:**

1. **Check for multiple dev servers**
   ```powershell
   Get-Process -Name node | ForEach-Object { "$($_.Id) $($_.CommandLine)" }
   ```
   If multiple npm processes, kill them:
   ```powershell
   Get-Process -Name node | Stop-Process -Force
   npm run dev
   ```

2. **Wait for backup to finish**
   - If you just deleted a class, a backup is writing
   - Wait 5 seconds and retry

3. **Check file locks**
   ```bash
   # On Windows, a file might be locked by Explorer
   # Close any file manager windows viewing data/
   ```

---

### Problem: "schema version mismatch"

**Error:**
```
Database user_version is 0, expected 2
```

**Causes:**
- Database file is from an old version
- Migrations are broken

**Solutions:**

1. **Check database version**
   ```bash
   sqlite3 data/app.db "PRAGMA user_version;"
   ```

2. **Reset database** (dev only!)
   ```bash
   rm data/app.db
   npm run dev
   ```

3. **Check migration code** in `lib/db.ts`
   - Ensure MIGRATIONS array has correct SQL
   - Run `npm run typecheck` to catch syntax errors

4. **Restore from backup** (if data is important)
   ```bash
   ls data/backups/
   cp data/backups/app-TIMESTAMP-reason.db data/app.db
   npm run dev
   ```

---

## Phone Validation Issues

### Problem: "That WhatsApp number doesn't look right"

**Error:**
When student applies with a phone number, validation fails.

**Causes:**
- Number doesn't fit the selected country's rules
- Leading 0 not stripped correctly
- Invalid digit count

**Solutions:**

1. **Check country is correct**
   - Dropdown should show selected country code
   - Make sure student selected right country

2. **Try different formats**
   - With leading 0: `012-345 6789` (Malaysia)
   - Without 0: `12 345 6789`
   - With country code: `+60 12 345 6789`
   - All spaces & dashes removed: `60123456789`

3. **Verify number is valid**
   - Use online phone validator: https://phonenumbervalidator.com/
   - Check against libphonenumber-js rules

4. **Country-specific issues:**

| Country | Common Issue | Solution |
|---------|--------------|----------|
| Malaysia | Fixed-line rejected | Use mobile (01X) not landline (03X) |
| Singapore | Landline rejected | Use mobile (81-89) not fixed (6X) |
| Hong Kong | Invalid range | Check 1st digit is 5, 6, 9 |
| USA | Area code issues | Full 10-digit number required |

5. **Test parsing locally**
   ```bash
   npm test tests/phone.test.ts
   # Passes? Then code is correct, check student input
   ```

---

### Problem: Student applied with wrong phone number

**Can't undo once applied.**

**Solutions:**

1. **Admin deletes application**
   - Go to `/admin/classes/[id]`
   - Find applicant row, click Delete
   - Database backup is automatic
   - Student can re-apply with correct number

2. **Student withdraws themselves**
   - Give student their withdrawal link (from confirmation email/message)
   - They click link and confirm withdrawal
   - Then re-apply

---

## Admin Authentication Issues

### Problem: Can't sign in (login fails)

**Error:**
```
Login failed
```

**Causes:**
- Wrong username or password
- Too many failed attempts (rate limited)
- Session secret changed (all sessions expire)
- Admin account deleted

**Solutions:**

1. **Check credentials**
   - Username: set by `ADMIN_USERNAME` env var (default "admin")
   - Password: what you set during `npm run setup`
   - Passwords are case-sensitive

2. **Reset password** (if forgotten)
   ```bash
   npm run setup
   # Follow prompts to set new username/password
   npm run dev
   ```

3. **Wait for rate limit to reset**
   - Rate limit: 8 failed attempts per 15 minutes
   - Try again in 15 minutes
   - Or restart dev server (counter resets)

4. **Check if admin exists** (production only)
   - Ask another admin to add you via `/admin/team`

---

### Problem: Session keeps expiring

**Causes:**
- Session cookie missing HttpOnly flag (HTTPS issue)
- SESSION_SECRET was changed
- Browser cookies disabled

**Solutions:**

1. **Check browser cookies are enabled**
   - Check browser settings → Privacy → Cookies
   - Cookies should be allowed for localhost

2. **Check .env.local**
   - SESSION_SECRET should be stable (not regenerated on each startup)
   - If changed, all sessions are invalid
   ```bash
   cat .env.local | grep SESSION_SECRET
   # Should be a 32+ character string
   ```

3. **Clear browser cookies**
   ```
   DevTools → Application → Cookies → localhost
   Delete session cookie (name: __session or similar)
   ```

4. **Restart dev server** (clears in-process login attempts counter)
   ```bash
   npm run dev
   ```

---

### Problem: "Cannot remove the last administrator"

**Error:**
When trying to delete the only admin account.

**Causes:**
- App prevents lockout (security feature)

**Solution:**
- Add another admin first via `/admin/team`
- Then delete the first admin

---

## Data & Backups

### Problem: "I accidentally deleted a class"

**Solutions:**

1. **Find backup**
   ```bash
   ls -la data/backups/
   # Look for app-*-delete-class-*.db file
   ```

2. **Restore backup** (dev only)
   ```bash
   # Make a copy first
   cp data/app.db data/app.db.corrupt
   cp data/backups/app-TIMESTAMP-delete-class-3.db data/app.db
   npm run dev
   ```

3. **Verify data** before trusting the backup

4. **Note:** Backups only exist on local SQLite
   - Production (Turso): no auto backups yet
   - Manual strategy: periodic exports or Turso snapshots

---

### Problem: "Database backup didn't work"

**Error:**
Database seems to have lost data, but no backup file exists.

**Causes:**
- Backup failed silently (logged, not thrown)
- Running on Turso (remote, no local backup)
- Backup directory permissions issue

**Solutions:**

1. **Check backup logs** in dev server output
   ```
   [info] backup written to data/backups/app-2026-08-01T13-46-00-delete-class-3.db
   ```

2. **Check directory permissions**
   ```bash
   ls -la data/backups/
   # Should be readable/writable
   ```

3. **On Turso**
   - Backups are not automatic
   - Use Turso dashboard to create snapshots
   - Or export data manually

---

## Timestamps & Timezone

### Problem: "Timestamps are showing wrong time"

**Error:**
Admin view shows times 8 hours early (if you're in Asia).

**Causes:**
- Timestamps are rendered in UTC
- Server running in UTC timezone
- Browser shows server time, not local time

**Solution:**

Set `TZ` environment variable:

**Development:**
```bash
# Windows PowerShell
$env:TZ = 'Asia/Kuala_Lumpur'
npm run dev

# Windows cmd
set TZ=Asia/Kuala_Lumpur && npm run dev

# Linux/Mac
TZ=Asia/Kuala_Lumpur npm run dev
```

**Production (Vercel):**
1. Go to Vercel dashboard
2. Project settings → Environment Variables
3. Add: `TZ=Asia/Kuala_Lumpur`
4. Redeploy

**Valid timezone strings:**
- `Asia/Kuala_Lumpur`
- `Asia/Singapore`
- `Asia/Hong_Kong`
- `America/New_York`
- Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

---

## Tests

### Problem: Tests fail with "no such table"

**Error:**
```
LibsqlError: SQLITE_ERROR: no such table: classes
```

**Causes:**
- Using `:memory:` database (doesn't persist between operations)
- Temp database not created correctly

**Solution:**
Tests already use temp file database. If you added a new test:

```typescript
// Correct setup
const dir = mkdtempSync(path.join(tmpdir(), "cas-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
```

**Don't use:**
```typescript
// Wrong: :memory: recycles connection
process.env.DATABASE_URL = ":memory:";
```

---

### Problem: Concurrency test hangs

**Error:**
```
Timeout: Test did not complete after 5000ms
```

**Causes:**
- `Promise.allSettled()` waiting for racing requests
- Write lock is stuck

**Solutions:**

1. **Increase timeout** (test fixture)
   ```typescript
   it("my test", async () => { ... }, { timeout: 10000 })
   ```

2. **Check for deadlock**
   - Kill the test process
   - Restart: `npm test`

3. **Verify write lock isn't broken**
   ```bash
   npm test tests/classes.test.ts
   # Should pass concurrency test
   ```

---

## Performance Issues

### Problem: App is slow

**Causes:**
- Too many applicants loaded (pagination not working)
- Large database (many classes/applications)
- Slow disk (dev machine has slow SSD)

**Solutions:**

1. **Check pagination** is working
   - `/admin/classes/[id]?page=1` should load quickly
   - If page=1 is slow, pagination isn't implemented

2. **Check query performance**
   ```bash
   npm run test
   # Should complete in <2s
   ```

3. **Check database size**
   ```bash
   ls -lh data/app.db
   # Should be < 10MB for reasonable data
   ```

---

### Problem: Form submission is slow

**Causes:**
- Server action is slow
- Database query is slow
- Revalidate is invalidating too many paths

**Solutions:**

1. **Check server logs**
   - Time each operation
   - Identify bottleneck

2. **Profile with browser DevTools**
   - Network tab: request/response time
   - Performance tab: where is time spent

3. **Reduce revalidate scope**
   - Only invalidate paths that changed
   - Not `revalidatePath('/', 'layout')` (too broad)

---

## Getting Help

### Debug Checklist

Before asking for help, verify:

- [ ] Node version: `node --version` (should be 18+)
- [ ] npm version: `npm --version` (should be 9+)
- [ ] `.env.local` exists and has `DATABASE_URL`
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] Dev server output shows no errors
- [ ] Browser DevTools console shows no errors

### Report Information

When reporting a bug, include:

1. **Error message** (full text)
2. **Steps to reproduce**
3. **Screenshots** (if visual)
4. **Environment:**
   - OS (Windows, Mac, Linux)
   - Node version
   - npm version
   - Is this local dev or production?

---

## See Also

- [TESTING.md](TESTING.md) — Test setup & debugging
- [SECURITY.md](SECURITY.md) — Rate limiting, validation rules
- [DATABASE.md](DATABASE.md) — Schema, migrations, query issues
- `npm run setup` — Reset admin credentials
- `rm data/app.db && npm run dev` — Reset database (dev only)
