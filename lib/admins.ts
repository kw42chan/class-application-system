import bcrypt from "bcryptjs";
import { db, ready } from "./db";

export type AdminRecord = {
  id: number;
  username: string;
  createdAt: string;
  createdBy: string;
};

type Row = Record<string, unknown>;

const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 8;

function toAdmin(row: Row): AdminRecord {
  return {
    id: Number(row.id ?? 0),
    username: String(row.username ?? ""),
    createdAt: String(row.created_at ?? ""),
    createdBy: String(row.created_by ?? ""),
  };
}

/**
 * Copies the environment-configured administrator into the database the first
 * time we need it, so existing installs keep working after the move to
 * multiple accounts. Idempotent — the unique index makes re-runs a no-op.
 */
export async function ensureSeedAdmin(): Promise<void> {
  await ready();

  const username = process.env.ADMIN_USERNAME?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!username || !passwordHash) return;

  const existing = await db.execute("SELECT COUNT(*) AS n FROM admins");
  if (Number((existing.rows[0] as Row).n ?? 0) > 0) return;

  await db.execute({
    sql: `INSERT OR IGNORE INTO admins (username, password_hash, created_by)
          VALUES (?, ?, 'env')`,
    args: [username, passwordHash],
  });
}

export async function listAdmins(): Promise<AdminRecord[]> {
  await ready();
  const result = await db.execute(
    "SELECT id, username, created_at, created_by FROM admins ORDER BY id ASC",
  );
  return result.rows.map((r) => toAdmin(r as Row));
}

export async function countAdmins(): Promise<number> {
  await ready();
  const result = await db.execute("SELECT COUNT(*) AS n FROM admins");
  return Number((result.rows[0] as Row).n ?? 0);
}

export async function findAdminByUsername(
  username: string,
): Promise<{ id: number; username: string; passwordHash: string } | null> {
  await ready();
  const result = await db.execute({
    sql: "SELECT id, username, password_hash FROM admins WHERE lower(username) = lower(?)",
    args: [username.trim()],
  });
  const row = result.rows[0] as Row | undefined;
  if (!row) return null;
  return {
    id: Number(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
  };
}

export async function createAdmin(
  username: string,
  password: string,
  createdBy: string,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await ready();

  const trimmed = username.trim();
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(trimmed)) {
    return {
      ok: false,
      error:
        "Username must be 3–32 characters, using letters, numbers, dots, dashes or underscores.",
    };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (await findAdminByUsername(trimmed)) {
    return { ok: false, error: "That username is already taken." };
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = await db.execute({
    sql: "INSERT INTO admins (username, password_hash, created_by) VALUES (?, ?, ?)",
    args: [trimmed, hash, createdBy],
  });
  return { ok: true, id: Number(result.lastInsertRowid) };
}

export async function setAdminPassword(
  id: number,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ready();
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db.execute({
    sql: "UPDATE admins SET password_hash = ? WHERE id = ?",
    args: [hash, id],
  });
  return { ok: true };
}

/** Refuses to remove the last remaining account, which would lock everyone out. */
export async function deleteAdmin(
  id: number,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  await ready();

  const result = await db.execute({
    sql: "SELECT username FROM admins WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0] as Row | undefined;
  if (!row) return { ok: false, error: "That account no longer exists." };

  if ((await countAdmins()) <= 1) {
    return { ok: false, error: "You can't remove the only administrator account." };
  }

  await db.execute({ sql: "DELETE FROM admins WHERE id = ?", args: [id] });
  return { ok: true, username: String(row.username) };
}
