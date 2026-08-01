import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { ensureSeedAdmin, findAdminByUsername } from "./admins";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSession,
  verifySession,
  type Session,
} from "./session";

export type { Session };

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** Use at the top of every admin page and admin-only action. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function startSession(username: string): Promise<void> {
  const token = await signSession(username);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// Small in-process throttle so accounts can't be brute forced by a flood of
// guesses. Resets whenever the process restarts, which is fine — it only needs
// to make automated guessing impractical. On a serverless host each instance
// throttles independently, so treat it as a speed bump rather than a wall.
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

function throttleKey(username: string) {
  return username.toLowerCase();
}

export function loginLockoutRemainingMs(username: string): number {
  const entry = attempts.get(throttleKey(username));
  if (!entry || entry.count < MAX_ATTEMPTS) return 0;
  const remaining = LOCKOUT_MS - (Date.now() - entry.firstAt);
  if (remaining <= 0) {
    attempts.delete(throttleKey(username));
    return 0;
  }
  return remaining;
}

function recordFailure(username: string) {
  const key = throttleKey(username);
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.firstAt > LOCKOUT_MS) {
    attempts.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

// Compared against when the username doesn't exist, so a wrong username costs
// the same time as a wrong password and can't be distinguished from it.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.rNbeBkAP2VgWZKF/tdmuFmvVQ5vJ2Vy";

/**
 * Checks credentials against the administrator accounts in the database,
 * seeding the environment-configured account on first use.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<{ ok: true; username: string } | { ok: false }> {
  await ensureSeedAdmin();

  const admin = await findAdminByUsername(username);
  const matches = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);

  if (admin && matches) {
    attempts.delete(throttleKey(username));
    return { ok: true, username: admin.username };
  }

  recordFailure(username);
  return { ok: false };
}
