import { db, ready } from "./db";

export type ClassRecord = {
  id: number;
  title: string;
  description: string;
  instructor: string;
  location: string;
  schedule: string;
  capacity: number;
  isOpen: boolean;
  createdAt: string;
  /** Confirmed applicants only. */
  applicantCount: number;
};

export type ApplicationRecord = {
  id: number;
  classId: number;
  name: string;
  phoneE164: string;
  phoneDisplay: string;
  status: "confirmed" | "cancelled";
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
};

type Row = Record<string, unknown>;

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => String(v ?? "");

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
    createdAt: str(row.created_at),
    applicantCount: num(row.applicant_count),
  };
}

function toApplication(row: Row): ApplicationRecord {
  return {
    id: num(row.id),
    classId: num(row.class_id),
    name: str(row.name),
    phoneE164: str(row.phone_e164),
    phoneDisplay: str(row.phone_display),
    status: str(row.status) === "cancelled" ? "cancelled" : "confirmed",
    createdAt: str(row.created_at),
  };
}

const SELECT_CLASS = `
  SELECT c.*,
         (SELECT COUNT(*) FROM applications a
           WHERE a.class_id = c.id AND a.status = 'confirmed') AS applicant_count
    FROM classes c`;

export function seatsLeft(cls: ClassRecord): number {
  return Math.max(0, cls.capacity - cls.applicantCount);
}

export function isAcceptingApplications(cls: ClassRecord): boolean {
  return cls.isOpen && seatsLeft(cls) > 0;
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
    sql: `INSERT INTO classes (title, description, instructor, location, schedule, capacity, is_open)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.title,
      input.description,
      input.instructor,
      input.location,
      input.schedule,
      input.capacity,
      input.isOpen ? 1 : 0,
    ],
  });
  return Number(result.lastInsertRowid);
}

export async function updateClass(
  id: number,
  input: ClassInput,
): Promise<void> {
  await ready();
  await db.execute({
    sql: `UPDATE classes
             SET title = ?, description = ?, instructor = ?, location = ?,
                 schedule = ?, capacity = ?, is_open = ?
           WHERE id = ?`,
    args: [
      input.title,
      input.description,
      input.instructor,
      input.location,
      input.schedule,
      input.capacity,
      input.isOpen ? 1 : 0,
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
  await db.execute({
    sql: "DELETE FROM applications WHERE class_id = ?",
    args: [id],
  });
  await db.execute({ sql: "DELETE FROM classes WHERE id = ?", args: [id] });
}

export async function listApplications(
  classId: number,
): Promise<ApplicationRecord[]> {
  await ready();
  const result = await db.execute({
    sql: `SELECT * FROM applications
           WHERE class_id = ?
        ORDER BY status = 'cancelled', id ASC`,
    args: [classId],
  });
  return result.rows.map((r) => toApplication(r as Row));
}

export type ApplyResult =
  | { ok: true; applicationId: number }
  | { ok: false; reason: "not_found" | "closed" | "full" | "duplicate" };

/**
 * Records an application, rejecting it if the class closed or filled up in the
 * meantime. The read of the seat count and the insert share one write
 * transaction, so two people racing for the last seat can't both win it.
 */
export async function applyToClass(
  classId: number,
  name: string,
  phoneE164: string,
  phoneDisplay: string,
): Promise<ApplyResult> {
  await ready();
  const tx = await db.transaction("write");
  try {
    const classRow = await tx.execute({
      sql: "SELECT capacity, is_open FROM classes WHERE id = ?",
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
             WHERE class_id = ? AND phone_e164 = ? AND status = 'confirmed'`,
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
    if (num((counted.rows[0] as Row).n) >= num(cls.capacity)) {
      await tx.rollback();
      return { ok: false, reason: "full" };
    }

    const inserted = await tx.execute({
      sql: `INSERT INTO applications (class_id, name, phone_e164, phone_display)
            VALUES (?, ?, ?, ?)`,
      args: [classId, name, phoneE164, phoneDisplay],
    });
    await tx.commit();
    return { ok: true, applicationId: Number(inserted.lastInsertRowid) };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export async function setApplicationStatus(
  id: number,
  status: "confirmed" | "cancelled",
): Promise<{ ok: true } | { ok: false; reason: "full" }> {
  await ready();

  if (status === "cancelled") {
    await db.execute({
      sql: "UPDATE applications SET status = 'cancelled' WHERE id = ?",
      args: [id],
    });
    return { ok: true };
  }

  // Restoring someone only works if a seat is actually free.
  const tx = await db.transaction("write");
  try {
    const row = await tx.execute({
      sql: `SELECT a.class_id, c.capacity,
                   (SELECT COUNT(*) FROM applications x
                     WHERE x.class_id = a.class_id AND x.status = 'confirmed') AS n
              FROM applications a JOIN classes c ON c.id = a.class_id
             WHERE a.id = ?`,
      args: [id],
    });
    const info = row.rows[0] as Row | undefined;
    if (!info) {
      await tx.rollback();
      return { ok: true };
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

export async function deleteApplication(id: number): Promise<void> {
  await ready();
  await db.execute({ sql: "DELETE FROM applications WHERE id = ?", args: [id] });
}
