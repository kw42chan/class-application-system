import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin-header";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Class administration" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-screen">
      <AdminHeader username={session.username} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
