import fs from "node:fs";
import path from "node:path";
import { db, localDbPath } from "./db";

const KEEP = 10;

/** Where snapshots live: alongside the database, in data/backups/. */
export function backupDir(): string | null {
  return localDbPath ? path.join(path.dirname(localDbPath), "backups") : null;
}

function stamp(): string {
  // 2026-08-01T19-56-55 — filename-safe and sorts chronologically.
  return new Date().toISOString().replace(/\..+$/, "").replace(/:/g, "-");
}

function prune(dir: string): void {
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("app-") && name.endsWith(".db"))
    .sort();

  for (const stale of files.slice(0, Math.max(0, files.length - KEEP))) {
    try {
      fs.unlinkSync(path.join(dir, stale));
    } catch {
      // A backup we couldn't prune is not worth failing the request over.
    }
  }
}

/**
 * Takes a consistent snapshot of the database before a destructive operation.
 *
 * Uses VACUUM INTO rather than a file copy so the snapshot is transactionally
 * consistent even if another write is in flight. No-ops for remote (Turso)
 * databases, which are backed up by the provider, and never throws — losing a
 * backup must not block the action the user asked for.
 *
 * Returns the snapshot path, or null if none was taken.
 */
export async function backupBeforeDestructiveChange(
  reason: string,
): Promise<string | null> {
  const dir = backupDir();
  if (!dir) return null;

  try {
    fs.mkdirSync(dir, { recursive: true });

    const safeReason = reason.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    const target = path.join(dir, `app-${stamp()}-${safeReason}.db`);

    // VACUUM INTO takes a string literal, not a bound parameter. The path is
    // built from a timestamp and a sanitised reason, and single quotes are
    // doubled so the literal cannot be broken out of.
    const literal = target.replace(/\\/g, "/").replace(/'/g, "''");
    await db.execute(`VACUUM INTO '${literal}'`);

    prune(dir);
    return target;
  } catch (error) {
    console.error("[backup] snapshot failed:", error);
    return null;
  }
}

export function listBackups(): { name: string; size: number; takenAt: Date }[] {
  const dir = backupDir();
  if (!dir || !fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("app-") && name.endsWith(".db"))
    .sort()
    .reverse()
    .map((name) => {
      const stats = fs.statSync(path.join(dir, name));
      return { name, size: stats.size, takenAt: stats.mtime };
    });
}
