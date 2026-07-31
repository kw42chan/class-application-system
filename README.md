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

From the class list you can **Open** or **Close** a class in one click. Inside a class you get the applicant list, where each row has a green WhatsApp button — clicking it opens WhatsApp (app or web) with a chat to that student, pre-filled with a message naming the class. **Download CSV** exports the list for a spreadsheet.

Cancelling an applicant frees their seat but keeps the record, so you can restore them later if a seat is still free. Deleting removes them permanently.

### For students

The dashboard splits classes into *Open for applications* and *Not currently open*, each showing how many seats are left. Applying takes a name and a WhatsApp number — country code from a dropdown, then the local number. A leading `0` is stripped automatically, and pasting a full international number works too.

### Rules the app enforces

- A class only accepts applications while it is open **and** below its limit.
- The seat count and the insert happen in one database transaction, so two students racing for the last seat can't both get it.
- The same WhatsApp number can't apply twice to the same class.
- Restoring a cancelled applicant fails if the class is already at its limit.
- Admin sign-in is rate limited to 8 failed attempts per 15 minutes.

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
| `NEXT_PUBLIC_DEFAULT_COUNTRY_CODE` | `60` for Malaysia, `65` Singapore, etc. |

`npm run setup` prints the unescaped `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` at the end specifically for pasting here. Don't copy them out of `.env.local` — the `$` characters in that file are backslash-escaped for local use, and Vercel would store the escaping literally.

**4. Deploy.** The database schema is created on the first request. Share the deployed URL with students and use `/admin` yourself.

---

## Project layout

```
app/
  page.tsx                      Student dashboard
  classes/[id]/                 Class detail + application form
  admin/login/                  Sign in
  admin/(protected)/            Everything behind auth
    page.tsx                    Class list
    classes/new/                Create a class
    classes/[id]/               Edit a class, manage applicants
    classes/[id]/export/        CSV download
  actions/                      Server actions (apply, admin)
components/                     Shared UI
lib/
  db.ts                         libSQL client + schema
  classes.ts                    All class/application queries
  auth.ts, session.ts           Admin session and login throttle
  phone.ts                      Number normalising + wa.me links
proxy.ts                        Blocks signed-out access to /admin
scripts/setup-env.mjs           Writes .env.local
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run setup` | Write `.env.local` (admin credentials + secret) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |

## Notes

- Only one administrator account exists, configured through environment variables. There is no sign-up, and no student accounts by design.
- Phone numbers are stored twice: digits-only for the `wa.me` link, and a readable form for display.
- `npm audit` reports advisories in development-only tooling (ESLint's `minimatch`, and `postcss`/`sharp` under `next`). Nothing in the runtime request path.
