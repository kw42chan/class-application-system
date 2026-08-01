"use server";

import { revalidatePath } from "next/cache";
import { applyToClass } from "@/lib/classes";
import { parsePhone } from "@/lib/phone";

export type ApplyState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | {
      status: "success";
      name: string;
      phoneDisplay: string;
      /** "confirmed" means a seat is held; "waitlisted" means queued. */
      outcome: "confirmed" | "waitlisted";
      position: number | null;
      withdrawToken: string;
    };

const REJECTION_MESSAGES: Record<string, string> = {
  not_found: "That class no longer exists.",
  closed: "Applications for this class have closed.",
  full: "Sorry — the last seat was taken just before you submitted.",
  duplicate: "This WhatsApp number has already applied for this class.",
};

export async function submitApplication(
  _prevState: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const classId = Number(formData.get("classId"));
  const name = String(formData.get("name") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  const country = String(formData.get("country") ?? "");
  const localNumber = String(formData.get("phone") ?? "");

  if (!Number.isInteger(classId) || classId <= 0) {
    return { status: "error", message: "Something went wrong. Please reload the page." };
  }
  if (name.length < 2) {
    return { status: "error", message: "Please enter your full name." };
  }
  if (name.length > 80) {
    return { status: "error", message: "That name is too long (80 characters max)." };
  }

  const phone = parsePhone(country, localNumber);
  if ("error" in phone) {
    return { status: "error", message: phone.error };
  }

  const result = await applyToClass(classId, name, phone.e164, phone.display);
  if (!result.ok) {
    return { status: "error", message: REJECTION_MESSAGES[result.reason] };
  }

  revalidatePath("/");
  revalidatePath(`/classes/${classId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/classes/${classId}`);

  return {
    status: "success",
    name,
    phoneDisplay: phone.display,
    outcome: result.status,
    position: result.position,
    withdrawToken: result.withdrawToken,
  };
}
