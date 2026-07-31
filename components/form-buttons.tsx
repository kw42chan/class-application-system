"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself and shows a pending label while the form is in flight. */
export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}

/** Submit button for destructive actions — asks for confirmation before posting. */
export function ConfirmSubmitButton({
  children,
  confirmMessage,
  className = "btn-danger",
  pendingLabel,
}: {
  children: React.ReactNode;
  confirmMessage: string;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
