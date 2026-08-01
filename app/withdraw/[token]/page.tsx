import type { Metadata } from "next";
import { getApplicationByToken } from "@/lib/classes";
import { WithdrawPageContent } from "./withdraw-page-content";

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
      <WithdrawPageContent found={found} token={token} />
    </div>
  );
}
