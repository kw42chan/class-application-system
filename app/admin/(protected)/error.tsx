"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card p-8 text-center">
      <h1 className="text-lg font-semibold">This page didn&rsquo;t load</h1>
      <p className="mt-2 text-sm text-muted">
        The database may be briefly unavailable. Your data is unaffected.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/admin" className="btn-secondary">
          Back to classes
        </Link>
      </div>
    </div>
  );
}
