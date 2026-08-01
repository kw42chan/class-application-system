"use server";

import { revalidatePath } from "next/cache";
import { getApplicationByToken, withdrawByToken } from "@/lib/classes";

export type WithdrawState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; name: string; classTitle: string };

export async function submitWithdrawal(
  _prevState: WithdrawState,
  formData: FormData,
): Promise<WithdrawState> {
  const token = String(formData.get("token") ?? "");
  if (!token) {
    return { status: "error", message: "This withdrawal link is not valid." };
  }

  const found = await getApplicationByToken(token);
  const result = await withdrawByToken(token);

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "already_withdrawn"
          ? "You have already withdrawn from this class."
          : "This withdrawal link is not valid.",
    };
  }

  if (found) {
    revalidatePath("/");
    revalidatePath(`/classes/${found.application.classId}`);
    revalidatePath("/admin");
    revalidatePath(`/admin/classes/${found.application.classId}`);
  }

  return { status: "done", name: result.name, classTitle: result.classTitle };
}
