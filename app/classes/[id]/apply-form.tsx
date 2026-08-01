"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitApplication, type ApplyState } from "@/app/actions/apply";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/form-buttons";
import { useLanguage } from "@/lib/language-context";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/phone";

const INITIAL: ApplyState = { status: "idle" };

function WithdrawNotice({ token, t }: { token: string; t: (key: string) => string }) {
  const url =
    typeof window === "undefined"
      ? `/withdraw/${token}`
      : `${window.location.origin}/withdraw/${token}`;

  return (
    <div className="mt-5 rounded-lg border border-border bg-surface-muted p-4">
      <p className="text-sm font-medium">{t('success.cantMakeLater')}</p>
      <p className="mt-1 text-xs text-muted">
        {t('success.keepThisLink')}
      </p>
      <code className="mt-3 block truncate rounded border border-border bg-surface px-2.5 py-1.5 font-mono text-xs">
        {url}
      </code>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton value={url} className="btn-secondary px-3 py-1.5" />
        <Link href={`/withdraw/${token}`} className="btn-secondary px-3 py-1.5">
          Open
        </Link>
      </div>
    </div>
  );
}

export function ApplyForm({
  classId,
  classTitle,
  waitlistOnly,
}: {
  classId: number;
  classTitle: string;
  waitlistOnly: boolean;
}) {
  const { t } = useLanguage();
  const [state, formAction] = useActionState(submitApplication, INITIAL);

  if (state.status === "success") {
    const waitlisted = state.outcome === "waitlisted";
    return (
      <div
        className={`card p-6 ${
          waitlisted
            ? "border-sky-500/40 bg-sky-500/5"
            : "border-emerald-500/40 bg-emerald-500/5"
        }`}
      >
        <h2
          className={`text-lg font-semibold ${
            waitlisted
              ? "text-sky-700 dark:text-sky-400"
              : "text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {waitlisted ? t('success.waitlisted') : t('success.confirmed')}
        </h2>

        <p className="mt-2 text-sm">
          {waitlisted ? (
            <>
              {t('success.waitlistPosition')} <strong>{state.position}</strong> {t('success.inTheQueue')}{" "}
              <strong>{classTitle}</strong>. {t('success.willMessageIfSeatFrees')}
            </>
          ) : (
            <>
              {t('success.seatReserved')} <strong>{classTitle}</strong> {t('success.isReserved')} {t('success.willReachYou')}{" "}
              <span className="font-mono">{state.phoneDisplay}</span>.
            </>
          )}
        </p>

        <WithdrawNotice token={state.withdrawToken} t={t} />

        <Link href="/" className="btn-secondary mt-5">
          {t('btn.backToClasses')}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">
          {waitlistOnly ? t('class.joinWaitlist') : t('class.applyForThisClass')}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {waitlistOnly
            ? t('success.willMessageIfSeatFrees')
            : ""}
        </p>
      </div>

      <input type="hidden" name="classId" value={classId} />

      <div>
        <label htmlFor="name" className="label">
          {t('form.fullName')}
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
          {t('form.whatsappNumber')}
        </label>
        <div className="flex gap-2">
          <select
            name="country"
            defaultValue={DEFAULT_COUNTRY}
            aria-label="Country"
            className="input w-40 shrink-0"
          >
            {COUNTRIES.map((country) => (
              <option key={country.iso} value={country.iso}>
                {country.flag} +{country.callingCode}
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

      <SubmitButton pendingLabel={t('form.apply')} className="btn-primary w-full">
        {waitlistOnly ? t('class.joinWaitlist') : t('form.apply')}
      </SubmitButton>
    </form>
  );
}
