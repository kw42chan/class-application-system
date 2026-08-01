import { removeAdmin } from "@/app/actions/admin";
import { ConfirmSubmitButton } from "@/components/form-buttons";
import { ensureSeedAdmin, listAdmins } from "@/lib/admins";
import { requireAdmin } from "@/lib/auth";
import { AddAdminForm, ChangePasswordForm } from "./admin-forms";

export const dynamic = "force-dynamic";

function formatWhen(value: string) {
  const parsed = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdmin();
  const query = await searchParams;

  await ensureSeedAdmin();
  const admins = await listAdmins();

  const notice = query.added
    ? { tone: "ok" as const, text: "Administrator added." }
    : query.removed
      ? { tone: "ok" as const, text: "Administrator removed." }
      : query.password
        ? { tone: "ok" as const, text: "Password changed." }
        : query.error === "self"
          ? { tone: "warn" as const, text: "You can't remove your own account while signed in." }
          : query.error
            ? { tone: "warn" as const, text: query.error }
            : null;

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-muted">
          {admins.length} administrator{admins.length === 1 ? "" : "s"}. Everyone
          here has full access, and their actions are recorded in Activity.
        </p>
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

      <div className="card mb-8 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Username</th>
              <th className="px-5 py-3 font-medium">Added</th>
              <th className="px-5 py-3 font-medium">Added by</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((admin) => {
              const isSelf =
                admin.username.toLowerCase() === session.username.toLowerCase();
              return (
                <tr key={admin.id}>
                  <td className="px-5 py-4">
                    <span className="font-medium">{admin.username}</span>
                    {isSelf && (
                      <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted">{formatWhen(admin.createdAt)}</td>
                  <td className="px-5 py-4 text-muted">{admin.createdBy}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      {isSelf || admins.length === 1 ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <form action={removeAdmin}>
                          <input type="hidden" name="id" value={admin.id} />
                          <ConfirmSubmitButton
                            className="btn-danger px-3 py-1.5"
                            confirmMessage={`Remove administrator "${admin.username}"? They will lose access immediately.`}
                            pendingLabel="…"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AddAdminForm />
        <ChangePasswordForm />
      </div>
    </>
  );
}
