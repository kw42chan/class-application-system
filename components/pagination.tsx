import Link from "next/link";

/** Page links that preserve the rest of the query string. */
export function Pagination({
  basePath,
  page,
  pageCount,
  searchParams = {},
  paramName = "page",
}: {
  basePath: string;
  page: number;
  pageCount: number;
  searchParams?: Record<string, string | undefined>;
  paramName?: string;
}) {
  if (pageCount <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value != null && key !== paramName) params.set(key, value);
    }
    if (target > 1) params.set(paramName, String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Show first, last, current and its neighbours; gaps become an ellipsis.
  const pages = [...Array(pageCount)].map((_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1.5 py-4"
      aria-label="Pagination"
    >
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={page === 1}
        className={`btn-secondary px-3 py-1.5 ${
          page === 1 ? "pointer-events-none opacity-50" : ""
        }`}
      >
        Previous
      </Link>

      {visible.map((p, index) => {
        const previous = visible[index - 1];
        const gap = previous != null && p - previous > 1;
        return (
          <span key={p} className="flex items-center gap-1.5">
            {gap && <span className="px-1 text-muted">…</span>}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? "page" : undefined}
              className={
                p === page
                  ? "btn-primary px-3 py-1.5"
                  : "btn-secondary px-3 py-1.5"
              }
            >
              {p}
            </Link>
          </span>
        );
      })}

      <Link
        href={hrefFor(Math.min(pageCount, page + 1))}
        aria-disabled={page === pageCount}
        className={`btn-secondary px-3 py-1.5 ${
          page === pageCount ? "pointer-events-none opacity-50" : ""
        }`}
      >
        Next
      </Link>
    </nav>
  );
}
