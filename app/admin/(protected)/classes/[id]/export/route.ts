import { getSession } from "@/lib/auth";
import { getClass, listApplications } from "@/lib/classes";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "class"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Route handlers aren't wrapped by the admin layout, so check the session here.
  if (!(await getSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const classId = Number(id);
  if (!Number.isInteger(classId) || classId <= 0) {
    return new Response("Not found", { status: 404 });
  }

  const cls = await getClass(classId);
  if (!cls) return new Response("Not found", { status: 404 });

  const applications = await listApplications(classId);

  const rows = [
    ["Name", "WhatsApp", "WhatsApp link", "Status", "Applied at (UTC)"],
    ...applications.map((a) => [
      a.name,
      // Leading apostrophe keeps Excel from mangling the "+" into a formula.
      `'${a.phoneDisplay}`,
      `https://wa.me/${a.phoneE164}`,
      a.status,
      a.createdAt,
    ]),
  ];

  // The BOM makes Excel read the file as UTF-8.
  const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const filename = `${slugify(cls.title)}-applicants.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
