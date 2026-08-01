import { StudentHeader } from "@/components/student-header";
import { DashboardContent } from "@/components/dashboard-content";
import { listClasses } from "@/lib/classes";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const classes = await listClasses();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <StudentHeader />
      <DashboardContent classes={classes} />
    </div>
  );
}
