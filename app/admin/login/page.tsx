import type { Metadata } from "next";
import { LoginPageContent } from "./login-page-content";

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
      <LoginPageContent next={target} />
    </div>
  );
}
