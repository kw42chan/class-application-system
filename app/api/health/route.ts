export const dynamic = "force-dynamic";

/**
 * Temporary deployment diagnostic. Reports whether the database is reachable
 * without exposing credentials — remove once the deployment is healthy.
 *
 * `lib/db` is imported lazily so a failure while that module initialises (for
 * example writing the local SQLite folder on a read-only filesystem) is
 * reported here instead of crashing the request.
 */
export async function GET() {
  const rawUrl = process.env.DATABASE_URL;

  const report: Record<string, unknown> = {
    databaseUrlSet: Boolean(rawUrl),
    databaseUrlScheme: rawUrl ? rawUrl.split(":")[0] : "(unset — defaults to file:)",
    authTokenSet: Boolean(process.env.DATABASE_AUTH_TOKEN),
    sessionSecretSet: Boolean(process.env.SESSION_SECRET),
    adminUsernameSet: Boolean(process.env.ADMIN_USERNAME),
    adminPasswordHashSet: Boolean(process.env.ADMIN_PASSWORD_HASH),
    defaultCountry: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY ?? null,
    defaultCountryCode: process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE ?? null,
  };

  try {
    const { db, ready } = await import("@/lib/db");
    await ready();
    const result = await db.execute("SELECT COUNT(*) AS n FROM classes");
    report.database = "ok";
    report.classCount = Number(
      (result.rows[0] as Record<string, unknown>).n ?? 0,
    );
  } catch (error) {
    report.database = "failed";
    report.error = error instanceof Error ? error.message : String(error);
  }

  return Response.json(report, {
    status: report.database === "ok" ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
