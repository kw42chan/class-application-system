import Link from "next/link";
import { notFound } from "next/navigation";
import { SeatMeter, StatusPill } from "@/components/class-status";
import { getClass, isAcceptingApplications, seatsLeft } from "@/lib/classes";
import { ApplyForm } from "./apply-form";

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
  const details = [
    cls.instructor && { label: "Instructor", value: cls.instructor },
    cls.schedule && { label: "When", value: cls.schedule },
    cls.location && { label: "Where", value: cls.location },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="text-sm text-muted underline-offset-4 hover:underline"
      >
        &larr; All classes
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{cls.title}</h1>
        <StatusPill cls={cls} />
      </header>

      {cls.description && (
        <p className="mt-4 whitespace-pre-line text-muted">{cls.description}</p>
      )}

      {details.length > 0 && (
        <dl className="card mt-6 divide-y divide-border">
          {details.map((detail) => (
            <div key={detail.label} className="flex gap-4 px-5 py-3 text-sm">
              <dt className="w-24 shrink-0 text-muted">{detail.label}</dt>
              <dd className="font-medium">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="card mt-6 p-5">
        <SeatMeter cls={cls} />
      </div>

      <div className="mt-6">
        {canApply ? (
          <ApplyForm classId={cls.id} classTitle={cls.title} />
        ) : (
          <div className="card p-6 text-center">
            <p className="font-medium">
              {!cls.isOpen
                ? "Applications for this class are closed."
                : "This class is full."}
            </p>
            <p className="mt-1 text-sm text-muted">
              {!cls.isOpen
                ? "Check the dashboard for classes that are currently open."
                : `All ${cls.capacity} seats have been taken.`}
            </p>
            <Link href="/" className="btn-secondary mt-5">
              Browse other classes
            </Link>
          </div>
        )}
      </div>

      {canApply && seatsLeft(cls) <= 3 && (
        <p className="mt-4 text-center text-sm text-amber-600 dark:text-amber-400">
          Only {seatsLeft(cls)} seat{seatsLeft(cls) === 1 ? "" : "s"} left.
        </p>
      )}
    </div>
  );
}
