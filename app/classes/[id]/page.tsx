import { notFound } from "next/navigation";
import {
  getClass,
  isAcceptingApplications,
  isAcceptingAnything,
  isAcceptingWaitlist,
} from "@/lib/classes";
import { ClassDetailContent } from "./class-detail-content";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classId = Number(id);
  if (!Number.isInteger(classId) || classId <= 0) notFound();

  const cls = await getClass(classId);
  if (!cls) notFound();

  const canApply = isAcceptingApplications(cls);
  const waitlistOnly = isAcceptingWaitlist(cls);
  const showForm = isAcceptingAnything(cls);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <ClassDetailContent
        cls={cls}
        showForm={showForm}
        waitlistOnly={waitlistOnly}
        canApply={canApply}
      />
    </div>
  );
}
