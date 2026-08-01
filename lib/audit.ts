import { db, ready } from "./db";

export type AuditEntry = {
  id: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  createdAt: string;
};

type Row = Record<string, unknown>;

function toEntry(row: Row): AuditEntry {
  return {
    id: Number(row.id ?? 0),
    actor: String(row.actor ?? ""),
    action: String(row.action ?? ""),
    entityType: String(row.entity_type ?? ""),
    entityId: row.entity_id == null ? null : Number(row.entity_id),
    summary: String(row.summary ?? ""),
    createdAt: String(row.created_at ?? ""),
  };
}

/**
 * Records who did what. Never throws — an action the user asked for should not
 * fail because we couldn't write its log line.
 */
export async function recordAudit(entry: {
  actor: string;
  action: string;
  entityType: string;
  entityId?: number | null;
  summary?: string;
}): Promise<void> {
  try {
    await ready();
    await db.execute({
      sql: `INSERT INTO audit_log (actor, action, entity_type, entity_id, summary)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        entry.actor,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.summary ?? "",
      ],
    });
  } catch (error) {
    console.error("[audit] failed to record entry:", error);
  }
}

export async function listAudit(
  options: { limit?: number; offset?: number } = {},
): Promise<AuditEntry[]> {
  await ready();
  const { limit = 50, offset = 0 } = options;
  const result = await db.execute({
    sql: "SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?",
    args: [limit, offset],
  });
  return result.rows.map((r) => toEntry(r as Row));
}

export async function countAudit(): Promise<number> {
  await ready();
  const result = await db.execute("SELECT COUNT(*) AS n FROM audit_log");
  return Number((result.rows[0] as Row).n ?? 0);
}
