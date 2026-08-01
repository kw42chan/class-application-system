# Class Application System

A small web app for running class sign-ups.

- **Students** don't log in. They open the dashboard, pick a class, and submit their name and WhatsApp number.
- **The administrator** logs in to create classes, set an applicant limit, open and close applications, and click any applicant's number to open a WhatsApp chat with them.

Built with Next.js 16 (App Router), SQLite/libSQL, and Tailwind CSS 4.

---

## Getting started

```bash
npm install
```

```bash
npm run setup
```

`npm run setup` asks for an administrator username and password, then writes `.env.local` with a bcrypt password hash and a random session secret. To skip the prompts:

```bash
npm run setup -- --username admin --password "your password here"
```

```bash
npm run dev
```

| URL | Who it's for |
| --- | --- |
| <http://localhost:3000> | Student dashboard — no login |
| <http://localhost:3000/classes/1> | A single class + its application form |
| <http://localhost:3000/admin> | Administrator (redirects to sign in) |

The database is created automatically at `data/app.db` on first use. That folder is gitignored.

To change the administrator password later, run `npm run setup` again.

---

## How it works

### For the administrator

Sign in at `/admin`, then **+ New class**. Each class has:

| Field | Purpose |
| --- | --- |
| Title, description, instructor, when, where | Shown to students |
| **Applicant limit** | Applications stop automatically once this many students have applied |
| **Open for applications** | Unchecked = students see the class but can't apply |
| **Keep a waitlist when full** | Once full, students join a queue instead of being turned away |

From the class list you can **Open** or **Close** a class in one click. Inside a class you get:

- **Share tools** — a copy-link button and a QR code for the class page. Print the QR or show it on screen; students scan it and apply on the spot.
- **The applicant list** — seated students numbered `1, 2, 3…`, waitlisted students `W1, W2…`, cancelled records greyed out at the bottom. Every row has a green WhatsApp button that opens a chat with that student, pre-filled with a message naming the class. Lists longer than 25 are paginated.
- **Download CSV** for a spreadsheet, including each person's position and status.

Cancelling an applicant frees their seat but keeps the record, so you can restore them later. **Promote** moves someone off the waitlist into a freed seat. Deleting removes them permanently — and takes a database snapshot first.

**Team** manages administrator accounts, and **Activity** shows who did what.

### For students

The dashboard splits classes into *Open for applications* and *Not currently open*, each showing how many seats are left. Applying takes a name and a WhatsApp number — country from a dropdown, then the local number.

If the class is full and a waitlist is enabled, they join the queue instead and are told their position.

Either way they get a **one-off withdrawal link** on the confirmation screen. If they can't attend, they open it and release their place themselves — no message to you, and the seat frees immediately.

### Rules the app enforces

- A class only accepts applications while it is open **and** either below its limit or running a waitlist.
- The seat count and the insert happen in one write transaction, and writes are serialised in-process, so two students racing for the last seat can't both get it.
- The same WhatsApp number can't hold two active places in one class. A cancelled applicant may re-apply.
- Numbers are validated against the selected country's real numbering rules, so a typo is caught at the form rather than becoming a dead `wa.me` link.
- Promoting or restoring someone fails if the class is already at its limit.
- Admin sign-in is rate limited to 8 failed attempts per 15 minutes.
- Deleting a class or applicant writes a snapshot to `data/backups/` first, keeping the last 10.

---

## Deploying

The app is built to run on Vercel with a [Turso](https://turso.tech) database (both have free tiers). Vercel's filesystem is read-only, so the local SQLite file can't be used in production — Turso is the same SQLite engine over the network, and needs no application code changes.

**1. Create the database**

```bash
turso db create class-app
```

```bash
turso db show class-app --url
```

```bash
turso db tokens create class-app
```

**2. Push the code to GitHub**

```bash
git add -A
```

```bash
git commit -m "Class application system"
```

Then create a repo on GitHub and push to it.

**3. Import the repo at [vercel.com/new](https://vercel.com/new)** and set these environment variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The `libsql://…` URL from step 1 |
| `DATABASE_AUTH_TOKEN` | The token from step 1 |
| `SESSION_SECRET` | The value printed by `npm run setup` |
| `ADMIN_USERNAME` | Your administrator username |
| `ADMIN_PASSWORD_HASH` | The unescaped hash printed by `npm run setup` |
| `NEXT_PUBLIC_DEFAULT_COUNTRY` | ISO code pre-selected in the form — `MY`, `SG`, `HK`, … |

`npm run setup` prints the unescaped `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` at the end specifically for pasting here. Don't copy them out of `.env.local` — the `$` characters in that file are backslash-escaped for local use, and Vercel would store the escaping literally.

**4. Deploy.** The database schema is created on the first request. Share the deployed URL with students and use `/admin` yourself.

---

## Project layout

```
app/
  page.tsx                      Student dashboard
  error.tsx / loading.tsx       Failure and skeleton states
  global-error.tsx              Last-resort boundary
  classes/[id]/                 Class detail + application form
  withdraw/[token]/             Student self-withdrawal
  admin/login/                  Sign in
  admin/(protected)/            Everything behind auth
    page.tsx                    Class list
    team/                       Administrator accounts
    activity/                   Audit log
    classes/new/                Create a class
    classes/[id]/               Edit, applicants, share tools
    classes/[id]/export/        CSV download
  actions/                      Server actions (apply, withdraw, admin)
components/                     Shared UI (share tools, pagination, …)
lib/
  db.ts                         libSQL client, migrations, write lock
  classes.ts                    Class/application queries + waitlist
  admins.ts                     Administrator accounts
  audit.ts                      Who-did-what log
  backup.ts                     Snapshots before destructive writes
  auth.ts, session.ts           Session and login throttle
  phone.ts                      Validation + wa.me links
tests/                          Vitest suites
proxy.ts                        Blocks signed-out access to /admin
scripts/setup-env.mjs           Writes .env.local
```

## Database migrations

`lib/db.ts` holds an ordered `MIGRATIONS` array and tracks the applied version in
SQLite's `user_version`. To change the schema, **append** a new array of
statements — never edit a released one, since databases that already applied it
won't re-run it. Migrations run automatically on the first request after deploy.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run setup` | Write `.env.local` (admin credentials + secret) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Vitest suites |
| `npm run test:watch` | Vitest in watch mode |

## Notes

- The first administrator comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` and is copied into the database on first sign-in. After that, manage accounts under **Team**. There are no student accounts by design.
- Phone numbers are stored twice: digits-only for the `wa.me` link, and a readable form for display.
- Withdrawal tokens are unguessable random strings and grant nothing beyond cancelling that one application. The page is marked `noindex`.
- Tests use a temporary file database, not `:memory:` — libSQL recycles the connection between operations, so an in-memory database would appear empty after the first statement.
- Timestamps render in the **server's** timezone. On a host that runs in UTC, set `TZ` (e.g. `TZ=Asia/Kuala_Lumpur`) so admin screens show local time.
- `npm audit` reports advisories in development-only tooling (ESLint's `minimatch`, and `postcss`/`sharp` under `next`). Nothing in the runtime request path.
