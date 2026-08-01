import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  cancelApplicationAction,
  confirmApplicationAction,
  removeApplication,
  removeClass,
} from "@/app/actions/admin";
import { ClassForm } from "@/components/class-form";
import { SeatMeter, StatusPill } from "@/components/class-status";
import { ConfirmSubmitButton, SubmitButton } from "@/components/form-buttons";
import { Pagination } from "@/components/pagination";
import { ShareTools } from "@/components/share-tools";
import { WhatsAppButton } from "@/components/whatsapp-button";
import {
  countApplications,
  getClass,
  listApplications,
  seatsLeft,
  type ApplicationRecord,
} from "@/lib/classes";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  created: { tone: "ok", text: "Class created." },
  saved: { tone: "ok", text: "Changes saved." },
  promoted: { tone: "ok", text: "Promoted from the waitlist into a seat." },
  restored: { tone: "ok", text: "Applicant restored." },
  full: {
    tone: "warn",
    text: "Couldn't give that applicant a seat — the class is already at its limit. Raise the limit or cancel someone else first.",
  },
};

function formatWhen(value: string) {
  // SQLite stores `datetime('now')` as "YYYY-MM-DD HH:MM:SS" in UTC.
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function RowLabel({
  application,
  absoluteIndex,
  confirmedTotal,
}: {
  application: ApplicationRecord;
  absoluteIndex: number;
  confirmedTotal: number;
}) {
  if (application.status === "cancelled") {
    return <span className="text-muted">—</span>;
  }
  if (application.status === "waitlisted") {
    return (
      <span className="text-sky-600 dark:text-sky-400">
        W{absoluteIndex - confirmedTotal + 1}
      </span>
    );
  }
  return <span className="text-muted">{absoluteIndex + 1}</span>;
}

function StatusTag({ status }: { status: ApplicationRecord["status"] }) {
  if (status === "confirmed") return null;
  const tone =
    status === "waitlisted"
      ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
      : "bg-surface-muted text-muted";
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${tone}`}>{status}</span>
  );
}

export default async function AdminClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const classId = Number(id);
  if (!Number.isInteger(classId) || classId <= 0) notFound();

  const cls = await getClass(classId);
  if (!cls) notFound();

  const counts = await countApplications(classId);
  const pageCount = Math.max(1, Math.ceil(counts.total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(query.page ?? 1) || 1), pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const applications = await listApplications(classId, {
    limit: PAGE_SIZE,
    offset,
  });
  const origin = await requestOrigin();
  const shareUrl = `${origin}/classes/${cls.id}`;

  const noticeKey = query.created
    ? "created"
    : query.saved
      ? "saved"
      : query.error === "full"
        ? "full"
        : query.promoted === "1"
          ? "promoted"
          : query.promoted === "0"
            ? "restored"
            : null;
  const notice = noticeKey ? NOTICES[noticeKey] : null;

  return (
    <>
      <Link href="/admin" className="text-sm text-muted underline-offset-4 hover:underline">
        &larr; All classes
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{cls.title}</h1>
          <p className="mt-1 text-sm text-muted">Created {formatWhen(cls.createdAt)}</p>
        </div>
        <StatusPill cls={cls} />
      </header>

      {notice && (
        <p
          role="status"
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            notice.tone === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="card mb-6 p-5">
        <SeatMeter cls={cls} />
      </div>

      <div className="mb-8">
        <ShareTools url={shareUrl} />
      </div>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Applicants{" "}
            <span className="text-muted">
              ({counts.confirmed} seated
              {counts.waitlisted > 0 && `, ${counts.waitlisted} waiting`}
              {counts.cancelled > 0 && `, ${counts.cancelled} cancelled`})
            </span>
          </h2>
          {counts.total > 0 && (
            <a
              href={`/admin/classes/${cls.id}/export`}
              className="btn-secondary px-3 py-1.5"
            >
              Download CSV
            </a>
          )}
        </div>

        {counts.total === 0 ? (
          <div className="card p-10 text-center text-sm text-muted">
            No one has applied yet. Share the link or QR code above with your students.
          </div>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="border-b border-border text-left text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">WhatsApp</th>
                    <th className="px-5 py-3 font-medium">Applied</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((application, index) => {
                    const inactive = application.status === "cancelled";
                    const waitlisted = application.status === "waitlisted";
                    const noSeat = seatsLeft(cls) === 0;

                    return (
                      <tr key={application.id} className={inactive ? "opacity-55" : ""}>
                        <td className="px-5 py-4">
                          <RowLabel
                            application={application}
                            absoluteIndex={offset + index}
                            confirmedTotal={counts.confirmed}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-medium">{application.name}</span>
                          <StatusTag status={application.status} />
                        </td>
                        <td className="px-5 py-4">
                          <WhatsAppButton
                            phoneE164={application.phoneE164}
                            label={application.phoneDisplay}
                            message={
                              waitlisted
                                ? `Hi ${application.name}, a seat has opened up in "${cls.title}". Are you still interested?`
                                : `Hi ${application.name}, this is about your application for "${cls.title}".`
                            }
                            className="btn-whatsapp px-3 py-1.5 font-mono text-xs"
                          />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-muted">
                          {formatWhen(application.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            {application.status === "confirmed" ? (
                              <form action={cancelApplicationAction}>
                                <input type="hidden" name="id" value={application.id} />
                                <input type="hidden" name="classId" value={cls.id} />
                                <input type="hidden" name="name" value={application.name} />
                                <SubmitButton
                                  className="btn-secondary px-3 py-1.5"
                                  pendingLabel="…"
                                >
                                  Cancel
                                </SubmitButton>
                              </form>
                            ) : (
                              <form action={confirmApplicationAction}>
                                <input type="hidden" name="id" value={application.id} />
                                <input type="hidden" name="classId" value={cls.id} />
                                <input type="hidden" name="name" value={application.name} />
                                <input
                                  type="hidden"
                                  name="from"
                                  value={application.status}
                                />
                                <SubmitButton
                                  className="btn-secondary px-3 py-1.5"
                                  pendingLabel="…"
                                >
                                  {waitlisted
                                    ? noSeat
                                      ? "Promote (no seat)"
                                      : "Promote"
                                    : "Restore"}
                                </SubmitButton>
                              </form>
                            )}

                            <form action={removeApplication}>
                              <input type="hidden" name="id" value={application.id} />
                              <input type="hidden" name="classId" value={cls.id} />
                              <input type="hidden" name="name" value={application.name} />
                              <ConfirmSubmitButton
                                className="btn-danger px-3 py-1.5"
                                confirmMessage={`Permanently delete ${application.name}'s application?`}
                                pendingLabel="…"
                              >
                                Delete
                              </ConfirmSubmitButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              basePath={`/admin/classes/${cls.id}`}
              page={page}
              pageCount={pageCount}
              searchParams={query}
            />
          </>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold">Class settings</h2>
        <div className="max-w-2xl">
          <ClassForm initial={cls} />
        </div>
      </section>

      <section className="max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold">Danger zone</h2>
        <div className="card flex flex-wrap items-center justify-between gap-4 border-red-500/30 p-5">
          <div>
            <p className="font-medium">Delete this class</p>
            <p className="text-sm text-muted">
              Removes the class and all {counts.total} application
              {counts.total === 1 ? "" : "s"}. A database snapshot is saved to
              data/backups first.
            </p>
          </div>
          <form action={removeClass}>
            <input type="hidden" name="id" value={cls.id} />
            <ConfirmSubmitButton
              confirmMessage={`Delete "${cls.title}" and all ${counts.total} application(s)? A backup will be saved, but this removes it from the app.`}
              pendingLabel="Deleting…"
            >
              Delete class
            </ConfirmSubmitButton>
          </form>
        </div>
      </section>
    </>
  );
}
