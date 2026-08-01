"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitWithdrawal, type WithdrawState } from "@/app/actions/withdraw";
import { ConfirmSubmitButton } from "@/components/form-buttons";

const INITIAL: WithdrawState = { status: "idle" };

export function WithdrawForm({
  token,
  classTitle,
  name,
  waitlisted,
}: {
  token: string;
  classTitle: string;
  name: string;
  waitlisted: boolean;
}) {
  const [state, formAction] = useActionState(submitWithdrawal, INITIAL);

  if (state.status === "done") {
    return (
      <div className="card border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
          Withdrawn
        </h2>
        <p className="mt-2 text-sm">
          Thanks {state.name} — you&rsquo;ve been removed from{" "}
          <strong>{state.classTitle}</strong>. Your place is now free for someone
          else.
        </p>
        <Link href="/" className="btn-secondary mt-5">
          Browse other classes
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <input type="hidden" name="token" value={token} />

      <div>
        <h2 className="text-lg font-semibold">Withdraw your application</h2>
        <p className="mt-2 text-sm text-muted">
          {name}, you currently {waitlisted ? "hold a place in the queue" : "hold a seat"}{" "}
          for <strong className="text-foreground">{classTitle}</strong>.
          Withdrawing frees it for someone else and cannot be undone — you would
          need to apply again.
        </p>
      </div>

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <ConfirmSubmitButton
          confirmMessage={`Withdraw from "${classTitle}"? This cannot be undone.`}
          pendingLabel="Withdrawing…"
        >
          Yes, withdraw me
        </ConfirmSubmitButton>
        <Link href="/" className="btn-secondary">
          Keep my place
        </Link>
      </div>
    </form>
  );
}
