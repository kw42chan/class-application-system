import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "file:./data/app.db";

/** Absolute path of the local database file, or null when using a remote (Turso) database. */
export const localDbPath = url.startsWith("file:")
  ? path.resolve(url.slice("file:".length))
  : null;

if (localDbPath) {
  fs.mkdirSync(path.dirname(localDbPath), { recursive: true });
}

declare global {
  var __casClient: Client | undefined;
  var __casReady: Promise<void> | undefined;
}

// Reused across hot reloads in dev so we don't leak connections.
export const db =
  globalThis.__casClient ??
  createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
globalThis.__casClient = db;

/**
 * Ordered schema migrations. Index 0 produces version 1, index 1 produces
 * version 2, and so on. Only ever append — editing a released entry will not
 * re-run against databases that already applied it.
 */
const MIGRATIONS: string[][] = [
  // v1 — initial schema
  [
    `CREATE TABLE IF NOT EXISTS classes (
       id           INTEGER PRIMARY KEY AUTOINCREMENT,
       title        TEXT    NOT NULL,
       description  TEXT    NOT NULL DEFAULT '',
       instructor   TEXT    NOT NULL DEFAULT '',
       location     TEXT    NOT NULL DEFAULT '',
       schedule     TEXT    NOT NULL DEFAULT '',
       capacity     INTEGER NOT NULL,
       is_open      INTEGER NOT NULL DEFAULT 0,
       created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
     )`,
    `CREATE TABLE IF NOT EXISTS applications (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       class_id      INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
       name          TEXT    NOT NULL,
       phone_e164    TEXT    NOT NULL,
       phone_display TEXT    NOT NULL,
       status        TEXT    NOT NULL DEFAULT 'confirmed',
       created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
     )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS applications_active_phone
       ON applications (class_id, phone_e164) WHERE status = 'confirmed'`,
    `CREATE INDEX IF NOT EXISTS applications_class ON applications (class_id)`,
  ],

  // v2 — waitlist, self-withdrawal, admin accounts, audit log
  [
    `ALTER TABLE classes ADD COLUMN waitlist_enabled INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE applications ADD COLUMN withdraw_token TEXT`,
    // A waitlisted applicant also occupies their number, so the uniqueness rule
    // has to cover both active states — not just 'confirmed'.
    `DROP INDEX IF EXISTS applications_active_phone`,
    `CREATE UNIQUE INDEX applications_active_phone
       ON applications (class_id, phone_e164)
       WHERE status IN ('confirmed', 'waitlisted')`,
    `CREATE UNIQUE INDEX applications_withdraw_token
       ON applications (withdraw_token) WHERE withdraw_token IS NOT NULL`,
    `CREATE INDEX applications_class_status
       ON applications (class_id, status, id)`,
    `CREATE TABLE admins (
       id            INTEGER PRIMARY KEY AUTOINCREMENT,
       username      TEXT    NOT NULL,
       password_hash TEXT    NOT NULL,
       created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
       created_by    TEXT    NOT NULL DEFAULT 'system'
     )`,
    `CREATE UNIQUE INDEX admins_username ON admins (lower(username))`,
    `CREATE TABLE audit_log (
       id          INTEGER PRIMARY KEY AUTOINCREMENT,
       actor       TEXT    NOT NULL,
       action      TEXT    NOT NULL,
       entity_type TEXT    NOT NULL,
       entity_id   INTEGER,
       summary     TEXT    NOT NULL DEFAULT '',
       created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
     )`,
    `CREATE INDEX audit_log_created ON audit_log (id DESC)`,
  ],
];

export const SCHEMA_VERSION = MIGRATIONS.length;

/**
 * Turso speaks a restricted dialect over its remote protocol: statements that
 * configure a connection are rejected outright, so the schema version lives in
 * an ordinary table there instead of in `user_version`.
 */
const isRemote = localDbPath === null;

const VERSION_KEY = "schema_version";

async function readVersion(): Promise<number> {
  if (isRemote) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS schema_meta (
         key   TEXT PRIMARY KEY,
         value TEXT NOT NULL
       )`,
    );
    const result = await db.execute({
      sql: "SELECT value FROM schema_meta WHERE key = ?",
      args: [VERSION_KEY],
    });
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? Number(row.value ?? 0) : 0;
  }

  const result = await db.execute("PRAGMA user_version");
  return Number((result.rows[0] as Record<string, unknown>).user_version ?? 0);
}

async function writeVersion(version: number): Promise<void> {
  if (isRemote) {
    await db.execute({
      sql: `INSERT INTO schema_meta (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [VERSION_KEY, String(version)],
    });
    return;
  }
  // PRAGMA cannot take a bound parameter; `version` is a counter we own.
  await db.execute(`PRAGMA user_version = ${version}`);
}

/**
 * Databases created before migrations existed sit at version 0 but already
 * have the v1 tables. Stamp them as v1 so we don't try to recreate them.
 */
async function baselineVersion(): Promise<number> {
  const version = await readVersion();
  if (version > 0) return version;

  const existing = await db.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'classes'",
  );
  if (existing.rows.length === 0) return 0;

  await writeVersion(1);
  return 1;
}

async function migrate(): Promise<void> {
  await db.execute("PRAGMA foreign_keys = ON");
  // If another process holds the write lock (a second dev server, a backup),
  // wait for it rather than failing the request outright. This configures the
  // one local connection; Turso rejects it and arbitrates concurrency itself.
  if (!isRemote) {
    await db.execute("PRAGMA busy_timeout = 5000");
  }

  let version = await baselineVersion();

  while (version < MIGRATIONS.length) {
    const statements = MIGRATIONS[version];
    const target = version + 1;

    for (const statement of statements) {
      await db.execute(statement);
    }
    await writeVersion(target);

    version = target;
  }
}

/**
 * Ensures the schema is up to date. Safe to call on every request; runs once.
 * A failure clears the cached promise so the next request retries rather than
 * wedging the process on a permanently rejected promise.
 */
export function ready(): Promise<void> {
  globalThis.__casReady ??= migrate().catch((error) => {
    globalThis.__casReady = undefined;
    throw error;
  });
  return globalThis.__casReady;
}

// A local SQLite file is driven through one connection, so overlapping write
// transactions on it fail with SQLITE_BUSY rather than queueing. Funnelling
// them through this chain serialises writes within the process — which is the
// whole story for a single-server deployment, and harmless on Turso where the
// database arbitrates concurrency itself.
let writeChain: Promise<unknown> = Promise.resolve();

export function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  // `then(op, op)` so a rejected predecessor doesn't stall the queue.
  const result = writeChain.then(operation, operation);
  writeChain = result.catch(() => undefined);
  return result;
}
