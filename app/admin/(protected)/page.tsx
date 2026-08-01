import { listClasses } from "@/lib/classes";
import { AdminClassesContent } from "./admin-classes-content";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage() {
  const classes = await listClasses();

  return <AdminClassesContent classes={classes} />;
}
