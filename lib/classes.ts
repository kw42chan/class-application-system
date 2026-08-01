import { randomBytes } from "node:crypto";
import { backupBeforeDestructiveChange } from "./backup";
import { db, ready, withWriteLock } from "./db";

export type ApplicationStatus = "confirmed" | "waitlisted" | "cancelled";

export type ClassRecord = {
  id: number;
  title: string;
  description: string;
  instructor: string;
  location: string;
  schedule: string;
  capacity: number;
  isOpen: boolean;
  waitlistEnabled: boolean;
  createdAt: string;
  /** Confirmed applicants only. */
  applicantCount: number;
  waitlistCount: number;
};

export type ApplicationRecord = {
  id: number;
  classId: number;
  name: string;
  phoneE164: string;
  phoneDisplay: string;
  status: ApplicationStatus;
  withdrawToken: string | null;
  createdAt: string;
};

export type ClassInput = {
  title: string;
  description: string;
  instructor: string;
  location: string;
  schedule: string;
  capacity: number;
  isOpen: boolean;
  waitlistEnabled: boolean;
};

type Row = Record<string, unknown>;

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => String(v ?? "");

function toStatus(value: unknown): ApplicationStatus {
  const s = str(value);
  return s === "cancelled" || s === "waitlisted" ? s : "confirmed";
}

function toClass(row: Row): ClassRecord {
  return {
    id: num(row.id),
    title: str(row.title),
    description: str(row.description),
    instructor: str(row.instructor),
    location: str(row.location),
    schedule: str(row.schedule),
    capacity: num(row.capacity),
    isOpen: num(row.is_open) === 1,
    waitlistEnabled: num(row.waitlist_enabled) === 1,
    createdAt: str(row.created_at),
    applicantCount: num(row.applicant_count),
    waitlistCount: num(row.waitlist_count),
  };
}

function toApplication(row: Row): ApplicationRecord {
  return {
    id: num(row.id),
    classId: num(row.class_id),
    name: str(row.name),
    phoneE164: str(row.phone_e164),
    phoneDisplay: str(row.phone_display),
    status: toStatus(row.status),
    withdrawToken: row.withdraw_token == null ? null : str(row.withdraw_token),
    createdAt: str(row.created_at),
  };
}

const SELECT_CLASS = `
  SELECT c.*,
         (SELECT COUNT(*) FROM applications a
           WHERE a.class_id = c.id AND a.status = 'confirmed')  AS applicant_count,
         (SELECT COUNT(*) FROM applications a
           WHERE a.class_id = c.id AND a.status = 'waitlisted') AS waitlist_count
    FROM classes c`;

export function seatsLeft(cls: ClassRecord): number {
  return Math.max(0, cls.capacity - cls.applicantCount);
}

/** True when a student can still claim a seat outright. */
export function isAcceptingApplications(cls: ClassRecord): boolean {
  return cls.isOpen && seatsLeft(cls) > 0;
}

/** True when the class is full but still collecting waitlist entries. */
export function isAcceptingWaitlist(cls: ClassRecord): boolean {
  return cls.isOpen && seatsLeft(cls) === 0 && cls.waitlistEnabled;
}

/** True when the form should be shown at all. */
export function isAcceptingAnything(cls: ClassRecord): boolean {
  return isAcceptingApplications(cls) || isAcceptingWaitlist(cls);
}

export async function listClasses(): Promise<ClassRecord[]> {
  await ready();
  const result = await db.execute(
    `${SELECT_CLASS} ORDER BY c.is_open DESC, c.id DESC`,
  );
  return result.rows.map((r) => toClass(r as Row));
}

export async function getClass(id: number): Promise<ClassRecord | null> {
  await ready();
  const result = await db.execute({
    sql: `${SELECT_CLASS} WHERE c.id = ?`,
    args: [id],
  });
  const row = result.rows[0];
  return row ? toClass(row as Row) : null;
}

export async function createClass(input: ClassInput): Promise<number> {
  await ready();
  const result = await db.execute({
    sql: `INSERT INTO classes
            (title, description, instructor, location, schedule, capacity, is_open, waitlist_enabled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.title,
      input.description,
      input.instructor,
      input.location,
      input.schedule,
      input.capacity,
      input.isOpen ? 1 : 0,
      input.waitlistEnabled ? 1 : 0,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function updateClass(id: number, input: ClassInput): Promise<void> {
  await ready();
  await db.execute({
    sql: `UPDATE classes
             SET title = ?, description = ?, instructor = ?, location = ?,
                 schedule = ?, capacity = ?, is_open = ?, waitlist_enabled = ?
           WHERE id = ?`,
    args: [
      input.title,
      input.description,
      input.instructor,
      input.location,
      input.schedule,
      input.capacity,
      input.isOpen ? 1 : 0,
      input.waitlistEnabled ? 1 : 0,
      id,
    ],
  });
}

export async function setClassOpen(id: number, isOpen: boolean): Promise<void> {
  await ready();
  await db.execute({
    sql: "UPDATE classes SET is_open = ? WHERE id = ?",
    args: [isOpen ? 1 : 0, id],
  });
}

export async function deleteClass(id: number): Promise<void> {
  await ready();
  await backupBeforeDestructiveChange(`delete-class-${id}`);
  await db.execute({
    sql: "DELETE FROM applications WHERE class_id = ?",
    args: [id],
  });
  await db.execute({ sql: "DELETE FROM classes WHERE id = ?", args: [id] });
}

// --- Applications ---------------------------------------------------------

/** Confirmed first, then the waitlist queue, then cancelled records. */
const APPLICATION_ORDER = `
  ORDER BY CASE status
             WHEN 'confirmed'  THEN 0
             WHEN 'waitlisted' THEN 1
             ELSE 2
           END, id ASC`;

export type ApplicationCounts = {
  confirmed: number;
  waitlisted: number;
  cancelled: number;
  total: number;
};

export async function countApplications(
  classId: number,
): Promise<ApplicationCounts> {
  await ready();
  const result = await db.execute({
    sql: `SELECT status, COUNT(*) AS n FROM applications
           WHERE class_id = ? GROUP BY status`,
    args: [classId],
  });

  const counts: ApplicationCounts = {
    confirmed: 0,
    waitlisted: 0,
    cancelled: 0,
    total: 0,
  };
  for (const row of result.rows) {
    const status = toStatus((row as Row).status);
    const n = num((row as Row).n);
    counts[status] = n;
    counts.total += n;
  }
  return counts;
}

export async function listApplications(
  classId: number,
  options: { limit?: number; offset?: number } = {},
): Promise<ApplicationRecord[]> {
  await ready();
  const { limit, offset = 0 } = options;

  const result = await db.execute({
    sql:
      `SELECT * FROM applications WHERE class_id = ?${APPLICATION_ORDER}` +
      (limit == null ? "" : " LIMIT ? OFFSET ?"),
    args: limit == null ? [classId] : [classId, limit, offset],
  });
  return result.rows.map((r) => toApplication(r as Row));
}

export async function getApplicationByToken(
  token: string,
): Promise<{ application: ApplicationRecord; classTitle: string } | null> {
  await ready();
  const result = await db.execute({
    sql: `SELECT a.*, c.title AS class_title
            FROM applications a JOIN classes c ON c.id = a.class_id
           WHERE a.withdraw_token = ?`,
    args: [token],
  });
  const row = result.rows[0] as Row | undefined;
  if (!row) return null;
  return { application: toApplication(row), classTitle: str(row.class_title) };
}

/** 1-based place in the queue, or null when the applicant isn't waitlisted. */
export async function waitlistPosition(
  applicationId: number,
): Promise<number | null> {
  await ready();
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS ahead
            FROM applications a
            JOIN applications me ON me.id = ?
           WHERE a.class_id = me.class_id
             AND a.status = 'waitlisted'
             AND me.status = 'waitlisted'
             AND a.id <= me.id`,
    args: [applicationId],
  });
  const ahead = num((result.rows[0] as Row).ahead);
  return ahead > 0 ? ahead : null;
}

export type ApplyResult =
  | {
      ok: true;
      applicationId: number;
      status: "confirmed" | "waitlisted";
      position: number | null;
      withdrawToken: string;
    }
  | { ok: false; reason: "not_found" | "closed" | "full" | "duplicate" };

/**
 * Records an application, rejecting it if the class closed or filled up in the
 * meantime. The seat count and the insert share one write transaction, so two
 * people racing for the last seat can't both win it. When the class is full and
 * a waitlist is enabled the applicant joins the queue instead of being refused.
 */
export async function applyToClass(
  classId: number,
  name: string,
  phoneE164: string,
  phoneDisplay: string,
): Promise<ApplyResult> {
  await ready();
  return withWriteLock(() =>
    applyToClassLocked(classId, name, phoneE164, phoneDisplay),
  );
}

async function applyToClassLocked(
  classId: number,
  name: string,
  phoneE164: string,
  phoneDisplay: string,
): Promise<ApplyResult> {
  const withdrawToken = randomBytes(24).toString("base64url");

  const tx = await db.transaction("write");
  try {
    const classRow = await tx.execute({
      sql: "SELECT capacity, is_open, waitlist_enabled FROM classes WHERE id = ?",
      args: [classId],
    });
    const cls = classRow.rows[0] as Row | undefined;
    if (!cls) {
      await tx.rollback();
      return { ok: false, reason: "not_found" };
    }
    if (num(cls.is_open) !== 1) {
      await tx.rollback();
      return { ok: false, reason: "closed" };
    }

    const duplicate = await tx.execute({
      sql: `SELECT 1 FROM applications
             WHERE class_id = ? AND phone_e164 = ?
               AND status IN ('confirmed', 'waitlisted')`,
      args: [classId, phoneE164],
    });
    if (duplicate.rows.length > 0) {
      await tx.rollback();
      return { ok: false, reason: "duplicate" };
    }

    const counted = await tx.execute({
      sql: `SELECT COUNT(*) AS n FROM applications
             WHERE class_id = ? AND status = 'confirmed'`,
      args: [classId],
    });
    const confirmed = num((counted.rows[0] as Row).n);
    const hasSeat = confirmed < num(cls.capacity);

    if (!hasSeat && num(cls.waitlist_enabled) !== 1) {
      await tx.rollback();
      return { ok: false, reason: "full" };
    }

    const status: "confirmed" | "waitlisted" = hasSeat ? "confirmed" : "waitlisted";

    const inserted = await tx.execute({
      sql: `INSERT INTO applications
              (class_id, name, phone_e164, phone_display, status, withdraw_token)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [classId, name, phoneE164, phoneDisplay, status, withdrawToken],
    });

    let position: number | null = null;
    if (status === "waitlisted") {
      const queued = await tx.execute({
        sql: `SELECT COUNT(*) AS n FROM applications
               WHERE class_id = ? AND status = 'waitlisted'`,
        args: [classId],
      });
      position = num((queued.rows[0] as Row).n);
    }

    await tx.commit();
    return {
      ok: true,
      applicationId: Number(inserted.lastInsertRowid),
      status,
      position,
      withdrawToken,
    };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export async function cancelApplication(id: number): Promise<void> {
  await ready();
  await db.execute({
    sql: "UPDATE applications SET status = 'cancelled' WHERE id = ?",
    args: [id],
  });
}

/**
 * Gives an applicant a confirmed seat — used both to restore someone who was
 * cancelled and to promote someone off the waitlist. Fails if the class is
 * already at its limit.
 */
export async function confirmApplication(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "full" | "not_found" }> {
  await ready();
  return withWriteLock(() => confirmApplicationLocked(id));
}

async function confirmApplicationLocked(
  id: number,
): Promise<{ ok: true } | { ok: false; reason: "full" | "not_found" }> {
  const tx = await db.transaction("write");
  try {
    const row = await tx.execute({
      sql: `SELECT c.capacity,
                   (SELECT COUNT(*) FROM applications x
                     WHERE x.class_id = a.class_id AND x.status = 'confirmed') AS n
              FROM applications a JOIN classes c ON c.id = a.class_id
             WHERE a.id = ?`,
      args: [id],
    });
    const info = row.rows[0] as Row | undefined;
    if (!info) {
      await tx.rollback();
      return { ok: false, reason: "not_found" };
    }
    if (num(info.n) >= num(info.capacity)) {
      await tx.rollback();
      return { ok: false, reason: "full" };
    }
    await tx.execute({
      sql: "UPDATE applications SET status = 'confirmed' WHERE id = ?",
      args: [id],
    });
    await tx.commit();
    return { ok: true };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

/** Student-initiated cancellation via their one-off link. */
export async function withdrawByToken(
  token: string,
): Promise<
  | { ok: true; name: string; classTitle: string }
  | { ok: false; reason: "not_found" | "already_withdrawn" }
> {
  await ready();
  const found = await getApplicationByToken(token);
  if (!found) return { ok: false, reason: "not_found" };
  if (found.application.status === "cancelled") {
    return { ok: false, reason: "already_withdrawn" };
  }

  await db.execute({
    sql: "UPDATE applications SET status = 'cancelled' WHERE id = ?",
    args: [found.application.id],
  });
  return {
    ok: true,
    name: found.application.name,
    classTitle: found.classTitle,
  };
}

export async function deleteApplication(id: number): Promise<void> {
  await ready();
  await backupBeforeDestructiveChange(`delete-application-${id}`);
  await db.execute({ sql: "DELETE FROM applications WHERE id = ?", args: [id] });
}
