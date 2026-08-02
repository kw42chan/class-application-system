import { ensureSeedAdmin, listAdmins } from "@/lib/admins";
import { requireAdmin } from "@/lib/auth";
import { getTranslation } from "@/lib/i18n";
import { TeamContent } from "./team-content";

export const dynamic = "force-dynamic";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requireAdmin();
  const query = await searchParams;

  await ensureSeedAdmin();
  const admins = await listAdmins();

  // Get translations on server side for the notice messages
  const lang = "en"; // In a real app, you'd get this from headers or cookie

  const notice = query.added
    ? { tone: "ok" as const, text: getTranslation(lang, "admin.administratorAdded") }
    : query.removed
      ? { tone: "ok" as const, text: getTranslation(lang, "admin.administratorRemoved") }
      : query.password
        ? { tone: "ok" as const, text: getTranslation(lang, "admin.passwordChanged") }
        : query.error === "self"
          ? { tone: "warn" as const, text: getTranslation(lang, "admin.cantRemoveSelf") }
          : query.error
            ? { tone: "warn" as const, text: query.error }
            : null;

  return (
    <TeamContent admins={admins} currentUsername={session.username} notice={notice} />
  );
}
