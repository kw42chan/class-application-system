"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  endSession,
  loginLockoutRemainingMs,
  requireAdmin,
  startSession,
  verifyCredentials,
} from "@/lib/auth";
import {
  createClass,
  deleteApplication,
  deleteClass,
  setApplicationStatus,
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

  let ok: boolean;
  try {
    ok = await verifyCredentials(username, password);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Login is not configured.",
    };
  }

  if (!ok) {
    return { status: "error", message: "Incorrect username or password." };
  }

  await startSession(username);
  redirect(next);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

function readClassInput(formData: FormData): ClassInput | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const capacity = Number(capacityRaw);

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
  };
}

export async function saveClass(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = readClassInput(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error };

  const idRaw = String(formData.get("id") ?? "").trim();

  if (idRaw) {
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) {
      return { status: "error", message: "Unknown class." };
    }
    await updateClass(id, parsed);
    revalidatePath("/");
    revalidatePath(`/classes/${id}`);
    revalidatePath("/admin");
    revalidatePath(`/admin/classes/${id}`);
    redirect(`/admin/classes/${id}?saved=1`);
  }

  const newId = await createClass(parsed);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect(`/admin/classes/${newId}?created=1`);
}

export async function toggleClassOpen(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const open = formData.get("open") === "1";
  if (!Number.isInteger(id) || id <= 0) return;

  await setClassOpen(id, open);
  revalidatePath("/");
  revalidatePath(`/classes/${id}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/classes/${id}`);
}

export async function removeClass(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await deleteClass(id);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function changeApplicationStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId"));
  const status = formData.get("status") === "cancelled" ? "cancelled" : "confirmed";
  if (!Number.isInteger(id) || id <= 0) return;

  const result = await setApplicationStatus(id, status);
  revalidatePath("/");
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/classes/${classId}`);

  if (!result.ok) {
    redirect(`/admin/classes/${classId}?error=full`);
  }
}

export async function removeApplication(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const classId = Number(formData.get("classId"));
  if (!Number.isInteger(id) || id <= 0) return;

  await deleteApplication(id);
  revalidatePath("/");
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/classes/${classId}`);
}
