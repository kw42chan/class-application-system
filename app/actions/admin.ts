"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  countAdmins,
  createAdmin,
  deleteAdmin,
  findAdminByUsername,
  setAdminPassword,
} from "@/lib/admins";
import { recordAudit } from "@/lib/audit";
import {
  endSession,
  loginLockoutRemainingMs,
  requireAdmin,
  startSession,
  verifyCredentials,
} from "@/lib/auth";
import {
  cancelApplication,
  confirmApplication,
  createClass,
  deleteApplication,
  deleteClass,
  getClass,
  setClassOpen,
  updateClass,
  type ClassInput,
} from "@/lib/classes";

export type FormState = { status: "idle" | "error"; message?: string };

/** Only allow relative in-app paths, so `?next=` can't bounce users off-site. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) {
    return "/admin";
  }
  return value;
}

function refreshClass(id: number) {
  revalidatePath("/");
  revalidatePath(`/classes/${id}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/classes/${id}`);
}

// --- Session --------------------------------------------------------------

export async function login(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!username || !password) {
    return { status: "error", message: "Enter both your username and password." };
  }

  const lockedFor = loginLockoutRemainingMs(username);
  if (lockedFor > 0) {
    const minutes = Math.ceil(lockedFor / 60000);
    return {
      status: "error",
      message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  let result: Awaited<ReturnType<typeof verifyCredentials>>;
  try {
    result = await verifyCredentials(username, password);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Login is not configured.",
    };
  }

  if (!result.ok) {
    if ((await countAdmins()) === 0) {
      return {
        status: "error",
        message: "No administrator account exists yet. Run `npm run setup` to create one.",
      };
    }
    return { status: "error", message: "Incorrect username or password." };
  }

  await startSession(result.username);
  await recordAudit({
    actor: result.username,
    action: "signed in",
    entityType: "session",
  });
  redirect(next);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

// --- Classes --------------------------------------------------------------

function readClassInput(formData: FormData): ClassInput | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const capacity = Number(String(formData.get("capacity") ?? "").trim());

  if (title.length < 2) return { error: "Give the class a title." };
  if (title.length > 120) return { error: "Title is too long (120 characters max)." };
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 10000) {
    return { error: "Applicant limit must be a whole number between 1 and 10000." };
  }

  return {
    title,
    description: String(formData.get("description") ?? "").trim().slice(0, 2000),
    instructor: String(formData.get("instructor") ?? "").trim().slice(0, 120),
    location: String(formData.get("location") ?? "").trim().slice(0, 200),
    schedule: String(formData.get("schedule") ?? "").trim().slice(0, 200),
    capacity,
    isOpen: formData.get("isOpen") === "on",
    waitlistEnabled: formData.get("waitlistEnabled") === "on",
  };
}

export async function saveClass(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();

  const parsed = readClassInput(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };

  const idRaw = String(formData.get("id") ?? "").trim();

  if (idRaw) {
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) {
      return { status: "error", message: "Unknown class." };
    }
    await updateClass(id, parsed);
    await recordAudit({
      actor: session.username,
      action: "updated class",
      entityType: "class",
      entityId: id,
      summary: parsed.title,
    });
    refreshClass(id);
    redirect(`/admin/classes/${id}?saved=1`);
  }

  const newId = await createClass(parsed);
  await recordAudit({
    actor: session.username,
    action: "created class",
    entityType: "class",
    entityId: newId,
    summary: parsed.title,
  });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/classes/${newId}?created=1`);
}

export async function toggleClassOpen(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const open = formData.get("open") === "1";
  if (!Number.isInteger(id) || id <= 0) return;

  await setClassOpen(id, open);
  const cls = await getClass(id);
  await recordAudit({
    actor: session.username,
    action: open ? "opened applications" : "closed applications",
    entityType: "class",
    entityId: id,
    summary: cls?.title ?? "",
  });
  refreshClass(id);
}

export async function removeClass(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  const cls = await getClass(id);
  await deleteClass(id);
  await recordAudit({
    actor: session.username,
    action: "deleted class",
    entityType: "class",
    entityId: id,
    summary: cls ? `${cls.title} (${cls.applicantCount} applicants)` : "",
  });
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

// --- Applications ---------------------------------------------------------

export async function cancelApplicationAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId"));
  const name = String(formData.get("name") ?? "");
  if (!Number.isInteger(id) || id <= 0) return;

  await cancelApplication(id);
  await recordAudit({
    actor: session.username,
    action: "cancelled applicant",
    entityType: "application",
    entityId: id,
    summary: name,
  });
  refreshClass(classId);
}

/** Restores a cancelled applicant, or promotes one off the waitlist. */
export async function confirmApplicationAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId"));
  const name = String(formData.get("name") ?? "");
  const wasWaitlisted = formData.get("from") === "waitlisted";
  if (!Number.isInteger(id) || id <= 0) return;

  const result = await confirmApplication(id);
  refreshClass(classId);

  if (!result.ok) {
    redirect(`/admin/classes/${classId}?error=full`);
  }

  await recordAudit({
    actor: session.username,
    action: wasWaitlisted ? "promoted from waitlist" : "restored applicant",
    entityType: "application",
    entityId: id,
    summary: name,
  });
  redirect(`/admin/classes/${classId}?promoted=${wasWaitlisted ? "1" : "0"}`);
}

export async function removeApplication(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId"));
  const name = String(formData.get("name") ?? "");
  if (!Number.isInteger(id) || id <= 0) return;

  await deleteApplication(id);
  await recordAudit({
    actor: session.username,
    action: "deleted applicant",
    entityType: "application",
    entityId: id,
    summary: name,
  });
  refreshClass(classId);
}

// --- Administrator accounts ----------------------------------------------

export async function addAdmin(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await createAdmin(username, password, session.username);
  if (!result.ok) return { status: "error", message: result.error };

  await recordAudit({
    actor: session.username,
    action: "added administrator",
    entityType: "admin",
    entityId: result.id,
    summary: username.trim(),
  });
  revalidatePath("/admin/team");
  redirect("/admin/team?added=1");
}

export async function removeAdmin(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  // Removing your own account would sign you out mid-session.
  const self = await findAdminByUsername(session.username);
  if (self && self.id === id) {
    redirect("/admin/team?error=self");
  }

  const result = await deleteAdmin(id);
  if (!result.ok) {
    redirect(`/admin/team?error=${encodeURIComponent(result.error)}`);
  }

  await recordAudit({
    actor: session.username,
    action: "removed administrator",
    entityType: "admin",
    entityId: id,
    summary: result.username,
  });
  revalidatePath("/admin/team");
  redirect("/admin/team?removed=1");
}

export async function changeOwnPassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireAdmin();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");

  const verified = await verifyCredentials(session.username, current);
  if (!verified.ok) {
    return { status: "error", message: "Your current password is incorrect." };
  }

  const self = await findAdminByUsername(session.username);
  if (!self) return { status: "error", message: "Account not found." };

  const result = await setAdminPassword(self.id, next);
  if (!result.ok) return { status: "error", message: result.error };

  await recordAudit({
    actor: session.username,
    action: "changed own password",
    entityType: "admin",
    entityId: self.id,
  });
  redirect("/admin/team?password=1");
}
