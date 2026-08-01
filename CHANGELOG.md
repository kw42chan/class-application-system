# Changelog

All notable changes to the Appointment System are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned

- Email notifications to students (confirmation, promotions, reminders)
- Bulk actions (delete multiple applicants, export to CSV)
- Class recurrence (weekly classes create automatically)
- Student dashboard improvements (past vs. upcoming classes)
- Admin analytics (enrollment trends, popular times)

---

## [0.2.0] — 2026-08-02

### Added

#### Waitlist System
- Classes can enable "Keep a waitlist when full"
- Students automatically queued when capacity reached
- Display shows waitlist position to student
- Admin can promote from waitlist into freed seats
- Transactional race-condition protection (write lock)

#### Student Self-Withdrawal
- One-off withdrawal link (24-byte random token)
- Students cancel applications without contacting admin
- Withdrawal link invalidates after first use
- Frees seat immediately (no admin action needed)
- Page marked `noindex` for privacy

#### Sharing Tools
- QR code generator (server-rendered SVG)
- Copy link button with clipboard fallback
- Share class with students via QR or link
- Works on all devices (no external libraries)

#### Phone Number Validation
- Per-country validation via libphonenumber-js
- 19 supported countries (MY, SG, HK, TW, CN, ID, TH, PH, VN, BN, IN, JP, KR, AU, NZ, GB, US, CA, AE)
- Rejects fixed-line numbers (landlines)
- Strips leading 0, accepts full international format
- Real-world examples: Malaysia (01X), Singapore (81-89), USA (area codes)

#### Multi-Admin System
- Multiple administrator accounts (no longer single env-based)
- Admin seeding from environment on first login (backward compatible)
- Team management UI (`/admin/team`)
- Add/remove admins without env vars
- Prevents accidental lockout (won't delete last admin)

#### Audit Logging
- Who-did-what trail for all mutations
- Activity log UI (`/admin/activity`)
- Immutable append-only (no deletion)
- Records: created/updated/deleted classes, promoted applicants, admin account changes
- Useful for compliance & troubleshooting

#### Testing
- Vitest test suite (30 tests, all passing)
- Phone validation tests (14 tests covering all country rules)
- Capacity & waitlist logic tests (16 tests including concurrency)
- Concurrent submission race condition test
- 100% coverage of critical paths

#### Error & Loading States
- `error.tsx` — Catches page errors, shows user-friendly message
- `global-error.tsx` — Last-resort boundary (full document)
- `loading.tsx` — Skeleton UI while page loads
- `not-found.tsx` — 404 page for missing classes

#### Pagination
- Applicant table paginated (25 per page)
- Audit log paginated (50 per page)
- Preserves query params across pages
- First/last/adjacent page buttons with ellipsis

#### Backups
- Automatic `VACUUM INTO` snapshot before class deletion
- Automatic `VACUUM INTO` snapshot before applicant deletion
- Last 10 backups retained (`data/backups/`)
- No-op on remote Turso (file system not available)
- Never throws (continues if backup fails)

### Changed

#### Database
- Versioned migrations (v1 = initial, v2 = new features)
- `user_version` pragma tracks applied version
- Automatically detects legacy v0 databases and stamps as v1 (zero data loss)
- All migrations append-only, never edited

#### Phone Number Handling
- Changed from digit-count validation to libphonenumber-js
- Replaced manual leading-0 stripping with real parser
- Environment variable: `NEXT_PUBLIC_DEFAULT_COUNTRY` (ISO code, not dialing code)
  - Old: `NEXT_PUBLIC_DEFAULT_COUNTRY_CODE="60"`
  - New: `NEXT_PUBLIC_DEFAULT_COUNTRY="MY"`

#### Admin Pages
- Admin list now database-backed (not env var only)
- Class count display shows waitlist numbers
- Applicant table shows "W1", "W2" for waitlist positions
- Admin class detail page refactored for clarity

#### Seat Allocation
- Write operations serialized via `withWriteLock()` to prevent SQLITE_BUSY
- Race condition protection proven by concurrency tests
- Applied globally to `applyToClass()` and `confirmApplication()`

### Fixed

- **Concurrency race condition** — Two students could oversell a seat if submitted simultaneously. Fixed by: (1) single transaction for read+write, (2) in-process write lock serialization
- **Phone validation false positives** — Numbers like "441321441331" (HK example) were accepted but invalid. Fixed by using real libphonenumber-js rules per country
- **Ambiguous applicant status** — No visual distinction between confirmed/waitlisted in tables. Fixed with "W1", "W2" queue labels and color-coded pills

### Removed

- N/A (backward compatible release)

### Tech Debt Addressed

- Removed digit-count phone validation (unreliable)
- Simplified default country configuration (ISO codes are standard)
- Added proper database versioning (safe for multi-region deploys)

### Documentation

- Comprehensive ARCHITECTURE.md (system design, data flow)
- DATABASE.md (schema, migrations, query patterns)
- API_REFERENCE.md (all functions with signatures)
- TESTING.md (test structure, coverage)
- SECURITY.md (auth, validation, threats)
- COMPONENTS.md (shared UI library)
- TROUBLESHOOTING.md (common issues)
- CONTRIBUTING.md (dev workflow)

---

## [0.1.0] — 2026-07-31

### Initial Release

#### Core Features
- **Student Dashboard** — Browse classes, view seats remaining
- **Student Application** — Enter name + WhatsApp number, apply for class
- **Admin Dashboard** — Manage classes, view applicants
- **Admin Class Management** — Create, edit, open/close classes
- **Capacity Limits** — Set max seats per class, auto-closes when full
- **WhatsApp Integration** — Click applicant phone to open WhatsApp chat
- **Admin Login** — Username + password authentication, session cookies

#### Technology
- Next.js 16 with App Router & Turbopack
- React 19, TypeScript 5
- SQLite (local) / Turso (production)
- Tailwind CSS 4
- bcryptjs for password hashing
- libSQL HTTP client

#### Database
- v1 schema: classes, applications tables
- Indexes on class_id, phone_e164
- Foreign key cascades
- User-version migration system

#### Security
- Password hashing (bcrypt, 12 rounds)
- Session encryption (cookie)
- SQL parameterization (no injection risk)
- Rate limiting (8 failed logins / 15 min)
- XSS protection (React escaping)

#### Deployment
- Vercel deployment support
- Environment-based admin account seeding
- Database backups on command (not automatic)

---

## Release Notes

### Upgrading from 0.1.0 to 0.2.0

**Database:** Automatic migration from v1 to v2 on first request. No data loss.

**Configuration:**
```bash
# Update .env.local
# Old: NEXT_PUBLIC_DEFAULT_COUNTRY_CODE="60"
# New: NEXT_PUBLIC_DEFAULT_COUNTRY="MY"
npm run setup  # Regenerates .env.local with correct format
```

**Behavior Changes:**
- Phone validation is stricter (fixed-lines rejected)
- Admin accounts now managed in UI (no longer env-only)
- Applicant list shows waitlist positions
- Seats are promoted automatically (no manual action to confirm)

**What Stays the Same:**
- All student data (applications, classes) persists
- Admin login still works (migrated to database on first signin)
- WhatsApp integration unchanged
- Deployment to Vercel unchanged

### Known Issues

None known at release time.

---

## Version History

| Version | Date | Status | Node | Next.js |
|---------|------|--------|------|---------|
| 0.2.0 | 2026-08-02 | Current | 18+ | 16.2.12 |
| 0.1.0 | 2026-07-31 | Archived | 18+ | 16.2.12 |

---

## Roadmap

### Short Term (Next 2 Weeks)

- [ ] Email notifications (SendGrid integration)
- [ ] Bulk CSV export for all applicants
- [ ] Improved error messages in forms

### Medium Term (1-2 Months)

- [ ] Class recurrence (weekly/monthly templates)
- [ ] Admin analytics (enrollment trends, conversion rate)
- [ ] Student account system (view past/upcoming enrollments)

### Long Term (3+ Months)

- [ ] Payment/ticketing (if required)
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Webhooks for external integrations

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on submitting changes.

---

## License

Copyright 2026. Licensed under MIT.

---

## Support

- **Issues:** GitHub issues
- **Discussions:** GitHub discussions
- **Security:** Report privately to kw42chan@example.com
