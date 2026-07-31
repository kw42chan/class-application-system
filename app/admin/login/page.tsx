import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Administrator sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const target = next?.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Administrator sign in</h1>
        <p className="mt-1 text-sm text-muted">
          Students don&rsquo;t need an account — this is for class management only.
        </p>
      </header>

      <LoginForm next={target} />

      <Link
        href="/"
        className="mt-6 text-center text-sm text-muted underline-offset-4 hover:underline"
      >
        &larr; Back to the class dashboard
      </Link>
    </div>
  );
}
