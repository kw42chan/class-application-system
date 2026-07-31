import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";

const url = process.env.DATABASE_URL ?? "file:./data/app.db";

// A local `file:` database needs its parent folder to exist before libSQL opens it.
if (url.startsWith("file:")) {
  fs.mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), {
    recursive: true,
  });
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

const SCHEMA = [
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
  // Partial index: one active application per number per class, but a cancelled
  // applicant is free to apply again.
  `CREATE UNIQUE INDEX IF NOT EXISTS applications_active_phone
     ON applications (class_id, phone_e164) WHERE status = 'confirmed'`,
  `CREATE INDEX IF NOT EXISTS applications_class ON applications (class_id)`,
];

async function migrate() {
  await db.execute("PRAGMA foreign_keys = ON");
  for (const statement of SCHEMA) {
    await db.execute(statement);
  }
}

/** Ensures the schema exists. Safe to call on every request; runs once. */
export function ready(): Promise<void> {
  return (globalThis.__casReady ??= migrate());
}
