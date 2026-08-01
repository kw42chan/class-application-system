import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          That class may have been removed, or the link may be mistyped.
        </p>
        <Link href="/" className="btn-primary mt-6">
          Browse classes
        </Link>
      </div>
    </div>
  );
}
