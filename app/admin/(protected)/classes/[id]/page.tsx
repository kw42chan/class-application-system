import Link from "next/link";
import { notFound } from "next/navigation";
import {
  changeApplicationStatus,
  removeApplication,
  removeClass,
} from "@/app/actions/admin";
import { ClassForm } from "@/components/class-form";
import { SeatMeter, StatusPill } from "@/components/class-status";
import { ConfirmSubmitButton, SubmitButton } from "@/components/form-buttons";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getClass, listApplications } from "@/lib/classes";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  created: { tone: "ok", text: "Class created." },
  saved: { tone: "ok", text: "Changes saved." },
  full: {
    tone: "warn",
    text: "Couldn't restore that applicant — the class is already at its limit. Raise the limit or cancel someone else first.",
  },
};

function formatWhen(value: string) {
  // SQLite stores `datetime('now')` as "YYYY-MM-DD HH:MM:SS" in UTC.
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const classId = Number(id);
  if (!Number.isInteger(classId) || classId <= 0) notFound();

  const cls = await getClass(classId);
  if (!cls) notFound();

  const applications = await listApplications(classId);
  const confirmed = applications.filter((a) => a.status === "confirmed");
  const cancelled = applications.filter((a) => a.status === "cancelled");

  const noticeKey = query.created
    ? "created"
    : query.saved
      ? "saved"
      : query.error === "full"
        ? "full"
        : null;
  const notice = noticeKey ? NOTICES[noticeKey] : null;

  return (
    <>
      <Link
        href="/admin"
        className="text-sm text-muted underline-offset-4 hover:underline"
      >
        &larr; All classes
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{cls.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Created {formatWhen(cls.createdAt)}
          </p>
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

      <div className="card mb-8 p-5">
        <SeatMeter cls={cls} />
      </div>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Applicants{" "}
            <span className="text-muted">({confirmed.length})</span>
          </h2>
          {applications.length > 0 && (
            <a
              href={`/admin/classes/${cls.id}/export`}
              className="btn-secondary px-3 py-1.5"
            >
              Download CSV
            </a>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="card p-10 text-center text-sm text-muted">
            No one has applied yet. Share{" "}
            <span className="font-mono">/classes/{cls.id}</span> with your students.
          </div>
        ) : (
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
                {[...confirmed, ...cancelled].map((application, index) => {
                  const isCancelled = application.status === "cancelled";
                  return (
                    <tr key={application.id} className={isCancelled ? "opacity-55" : ""}>
                      <td className="px-5 py-4 text-muted">
                        {isCancelled ? "—" : index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium">{application.name}</span>
                        {isCancelled && (
                          <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">
                            cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <WhatsAppButton
                          phoneE164={application.phoneE164}
                          label={application.phoneDisplay}
                          message={`Hi ${application.name}, this is about your application for "${cls.title}".`}
                          className="btn-whatsapp px-3 py-1.5 font-mono text-xs"
                        />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-muted">
                        {formatWhen(application.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <form action={changeApplicationStatus}>
                            <input type="hidden" name="id" value={application.id} />
                            <input type="hidden" name="classId" value={cls.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={isCancelled ? "confirmed" : "cancelled"}
                            />
                            <SubmitButton
                              className="btn-secondary px-3 py-1.5"
                              pendingLabel="…"
                            >
                              {isCancelled ? "Restore" : "Cancel"}
                            </SubmitButton>
                          </form>
                          <form action={removeApplication}>
                            <input type="hidden" name="id" value={application.id} />
                            <input type="hidden" name="classId" value={cls.id} />
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
              Removes the class and all {applications.length} application
              {applications.length === 1 ? "" : "s"}. This cannot be undone.
            </p>
          </div>
          <form action={removeClass}>
            <input type="hidden" name="id" value={cls.id} />
            <ConfirmSubmitButton
              confirmMessage={`Delete "${cls.title}" and all ${applications.length} application(s)? This cannot be undone.`}
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
