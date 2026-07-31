"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitApplication, type ApplyState } from "@/app/actions/apply";
import { SubmitButton } from "@/components/form-buttons";
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from "@/lib/phone";

const INITIAL: ApplyState = { status: "idle" };

export function ApplyForm({
  classId,
  classTitle,
}: {
  classId: number;
  classTitle: string;
}) {
  const [state, formAction] = useActionState(submitApplication, INITIAL);

  if (state.status === "success") {
    return (
      <div className="card border-emerald-500/40 bg-emerald-500/5 p-6">
        <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
          You&rsquo;re on the list
        </h2>
        <p className="mt-2 text-sm">
          Thanks {state.name} — your seat in <strong>{classTitle}</strong> is
          reserved. We&rsquo;ll reach you on WhatsApp at{" "}
          <span className="font-mono">{state.phoneDisplay}</span>.
        </p>
        <Link href="/" className="btn-secondary mt-5">
          Back to all classes
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">Apply for a seat</h2>
        <p className="mt-1 text-sm text-muted">
          The instructor will contact you on WhatsApp to confirm.
        </p>
      </div>

      <input type="hidden" name="classId" value={classId} />

      <div>
        <label htmlFor="name" className="label">
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={80}
          autoComplete="name"
          placeholder="e.g. Tan Wei Ming"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="phone" className="label">
          WhatsApp number
        </label>
        <div className="flex gap-2">
          <select
            name="countryCode"
            defaultValue={DEFAULT_COUNTRY_CODE}
            aria-label="Country code"
            className="input w-36 shrink-0"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} +{country.code}
              </option>
            ))}
          </select>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="12 345 6789"
            className="input"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Enter the number without the country code — a leading 0 is fine.
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

      <SubmitButton pendingLabel="Submitting…" className="btn-primary w-full">
        Submit application
      </SubmitButton>
    </form>
  );
}
