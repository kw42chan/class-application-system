import Link from "next/link";
import { toggleClassOpen } from "@/app/actions/admin";
import { StatusPill } from "@/components/class-status";
import { SubmitButton } from "@/components/form-buttons";
import { listClasses, seatsLeft } from "@/lib/classes";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage() {
  const classes = await listClasses();
  const totalApplicants = classes.reduce((sum, c) => sum + c.applicantCount, 0);

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
          <p className="mt-1 text-sm text-muted">
            {classes.length} class{classes.length === 1 ? "" : "es"} ·{" "}
            {totalApplicants} applicant{totalApplicants === 1 ? "" : "s"} in total
          </p>
        </div>
        <Link href="/admin/classes/new" className="btn-primary">
          + New class
        </Link>
      </header>

      {classes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium">No classes yet</p>
          <p className="mt-1 text-sm text-muted">
            Create your first class to start collecting applications.
          </p>
          <Link href="/admin/classes/new" className="btn-primary mt-5">
            + New class
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Class</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Applicants</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {classes.map((cls) => {
                const left = seatsLeft(cls);
                return (
                  <tr key={cls.id}>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/classes/${cls.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {cls.title}
                      </Link>
                      {cls.schedule && (
                        <div className="text-xs text-muted">{cls.schedule}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill cls={cls} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="font-medium">
                        {cls.applicantCount} / {cls.capacity}
                      </span>
                      <span className="ml-2 text-xs text-muted">
                        {left === 0 ? "full" : `${left} left`}
                      </span>
                      {cls.waitlistCount > 0 && (
                        <span className="ml-2 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-700 dark:text-sky-400">
                          +{cls.waitlistCount} waiting
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <form action={toggleClassOpen}>
                          <input type="hidden" name="id" value={cls.id} />
                          <input
                            type="hidden"
                            name="open"
                            value={cls.isOpen ? "0" : "1"}
                          />
                          <SubmitButton
                            className="btn-secondary px-3 py-1.5"
                            pendingLabel="…"
                          >
                            {cls.isOpen ? "Close" : "Open"}
                          </SubmitButton>
                        </form>
                        <Link
                          href={`/admin/classes/${cls.id}`}
                          className="btn-secondary px-3 py-1.5"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
