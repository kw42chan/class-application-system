import Link from "next/link";
import { SeatMeter, StatusPill } from "@/components/class-status";
import { isAcceptingApplications, listClasses, type ClassRecord } from "@/lib/classes";

export const dynamic = "force-dynamic";

function ClassMeta({ cls }: { cls: ClassRecord }) {
  const items = [
    cls.instructor && { label: "Instructor", value: cls.instructor },
    cls.schedule && { label: "When", value: cls.schedule },
    cls.location && { label: "Where", value: cls.location },
  ].filter(Boolean) as { label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <dl className="space-y-1 text-sm">
      {items.map((item) => (
        <div key={item.label} className="flex gap-2">
          <dt className="w-20 shrink-0 text-muted">{item.label}</dt>
          <dd className="text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ClassCard({ cls }: { cls: ClassRecord }) {
  const canApply = isAcceptingApplications(cls);

  return (
    <li className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-tight">{cls.title}</h3>
        <StatusPill cls={cls} />
      </div>

      {cls.description && (
        <p className="line-clamp-3 text-sm text-muted">{cls.description}</p>
      )}

      <ClassMeta cls={cls} />

      <div className="mt-auto space-y-4 pt-1">
        <SeatMeter cls={cls} />
        {canApply ? (
          <Link href={`/classes/${cls.id}`} className="btn-primary w-full">
            Apply for this class
          </Link>
        ) : (
          <Link href={`/classes/${cls.id}`} className="btn-secondary w-full">
            View details
          </Link>
        )}
      </div>
    </li>
  );
}

export default async function StudentDashboard() {
  const classes = await listClasses();
  const open = classes.filter((cls) => cls.isOpen);
  const closed = classes.filter((cls) => !cls.isOpen);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Class Applications
          </h1>
          <p className="mt-2 text-muted">
            Browse the classes below and apply with your name and WhatsApp number.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          Administrator
        </Link>
      </header>

      {classes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-medium">No classes have been published yet.</p>
          <p className="mt-1 text-sm text-muted">Please check back a little later.</p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
              Open for applications
            </h2>
            {open.length === 0 ? (
              <div className="card p-8 text-center text-sm text-muted">
                No classes are open for applications right now.
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {open.map((cls) => (
                  <ClassCard key={cls.id} cls={cls} />
                ))}
              </ul>
            )}
          </section>

          {closed.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                Not currently open
              </h2>
              <ul className="grid gap-4 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
                {closed.map((cls) => (
                  <ClassCard key={cls.id} cls={cls} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
