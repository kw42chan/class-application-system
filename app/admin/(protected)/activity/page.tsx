import { countAudit, listAudit } from "@/lib/audit";
import { ActivityContent } from "./activity-content";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

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
    <ActivityContent
      entries={entries}
      total={total}
      page={page}
      pageCount={pageCount}
      searchParams={query}
    />
  );
}
