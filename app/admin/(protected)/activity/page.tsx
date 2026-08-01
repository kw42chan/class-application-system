import { Pagination } from "@/components/pagination";
import { countAudit, listAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function formatWhen(value: string) {
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const TONE: Record<string, string> = {
  "deleted class": "text-red-600 dark:text-red-400",
  "deleted applicant": "text-red-600 dark:text-red-400",
  "removed administrator": "text-red-600 dark:text-red-400",
  "created class": "text-emerald-700 dark:text-emerald-400",
  "added administrator": "text-emerald-700 dark:text-emerald-400",
  "promoted from waitlist": "text-sky-700 dark:text-sky-400",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  const total = await countAudit();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(query.page ?? 1) || 1), pageCount);

  const entries = await listAudit({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted">
          Who changed what. {total} event{total === 1 ? "" : "s"} recorded.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          Nothing recorded yet. Administrator actions will show up here.
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">When</th>
                  <th className="px-5 py-3 font-medium">Who</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatWhen(entry.createdAt)}
                    </td>
                    <td className="px-5 py-3 font-medium">{entry.actor}</td>
                    <td
                      className={`px-5 py-3 ${TONE[entry.action] ?? "text-foreground"}`}
                    >
                      {entry.action}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {entry.summary || "—"}
                      {entry.entityId != null && (
                        <span className="ml-2 font-mono text-xs opacity-60">
                          {entry.entityType}#{entry.entityId}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/activity"
            page={page}
            pageCount={pageCount}
            searchParams={query}
          />
        </>
      )}
    </>
  );
}
