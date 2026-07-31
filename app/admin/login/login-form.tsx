"use client";

import { useActionState } from "react";
import { login, type FormState } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form-buttons";

const INITIAL: FormState = { status: "idle" };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, INITIAL);

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="username" className="label">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoFocus
          className="input"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <SubmitButton pendingLabel="Signing in…" className="btn-primary w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
