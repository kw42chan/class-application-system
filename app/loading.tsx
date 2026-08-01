export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 space-y-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-surface-muted" />
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="card space-y-4 p-5">
            <div className="h-5 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-surface-muted" />
            <div className="h-1.5 w-full animate-pulse rounded-full bg-surface-muted" />
            <div className="h-9 w-full animate-pulse rounded-lg bg-surface-muted" />
          </li>
        ))}
      </ul>

      <span className="sr-only">Loading classes…</span>
    </div>
  );
}
