import Link from "next/link";
import type { Metadata } from "next";
import { getApplicationByToken } from "@/lib/classes";
import { WithdrawForm } from "./withdraw-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Withdraw application",
  // A withdrawal link is a capability — keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function WithdrawPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const found = await getApplicationByToken(token);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-12">
      {!found ? (
        <div className="card p-8 text-center">
          <h1 className="text-lg font-semibold">This link isn&rsquo;t valid</h1>
          <p className="mt-2 text-sm text-muted">
            It may have already been used, or the class may have been removed.
          </p>
          <Link href="/" className="btn-secondary mt-5">
            Browse classes
          </Link>
        </div>
      ) : found.application.status === "cancelled" ? (
        <div className="card p-8 text-center">
          <h1 className="text-lg font-semibold">Already withdrawn</h1>
          <p className="mt-2 text-sm text-muted">
            {found.application.name}, you&rsquo;re no longer signed up for{" "}
            <strong className="text-foreground">{found.classTitle}</strong>.
          </p>
          <Link href={`/classes/${found.application.classId}`} className="btn-secondary mt-5">
            View the class
          </Link>
        </div>
      ) : (
        <WithdrawForm
          token={token}
          classTitle={found.classTitle}
          name={found.application.name}
          waitlisted={found.application.status === "waitlisted"}
        />
      )}
    </div>
  );
}
