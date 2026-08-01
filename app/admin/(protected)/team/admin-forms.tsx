"use client";

import { useActionState } from "react";
import { addAdmin, changeOwnPassword, type FormState } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form-buttons";

const INITIAL: FormState = { status: "idle" };

function ErrorNote({ state }: { state: FormState }) {
  if (state.status !== "error") return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
    >
      {state.message}
    </p>
  );
}

export function AddAdminForm() {
  const [state, formAction] = useActionState(addAdmin, INITIAL);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <h3 className="font-medium">Add an administrator</h3>
        <p className="mt-1 text-sm text-muted">
          They&rsquo;ll sign in with these credentials and can manage every class.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-username" className="label">
            Username
          </label>
          <input
            id="new-username"
            name="username"
            type="text"
            required
            autoComplete="off"
            placeholder="e.g. darwin"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="label">
            Password
          </label>
          <input
            id="new-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="input"
          />
        </div>
      </div>

      <ErrorNote state={state} />

      <SubmitButton pendingLabel="Adding…">Add administrator</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeOwnPassword, INITIAL);

  return (
    <form action={formAction} className="card space-y-4 p-5">
      <div>
        <h3 className="font-medium">Change your password</h3>
        <p className="mt-1 text-sm text-muted">
          Updates the account you&rsquo;re currently signed in as.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="current-password" className="label">
            Current password
          </label>
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="next-password" className="label">
            New password
          </label>
          <input
            id="next-password"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        </div>
      </div>

      <ErrorNote state={state} />

      <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
    </form>
  );
}
