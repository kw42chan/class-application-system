'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { submitWithdrawal, type WithdrawState } from '@/app/actions/withdraw';
import { ConfirmSubmitButton } from '@/components/form-buttons';
import { useLanguage } from '@/lib/language-context';

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
  const { t } = useLanguage();
  const [state, formAction] = useActionState(submitWithdrawal, INITIAL);

  if (state.status === 'done') {
    return (
      <div className="card border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
          {t('withdraw.withdrawn')}
        </h2>
        <p className="mt-2 text-sm">
          Thanks {state.name} — {t('withdraw.youveBeenRemoved')}{" "}
          <strong>{state.classTitle}</strong>. {t('withdraw.yourPlaceIsFree')}
        </p>
        <Link href="/" className="btn-secondary mt-5">
          {t('class.browseOtherClasses')}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <input type="hidden" name="token" value={token} />

      <div>
        <h2 className="text-lg font-semibold">{t('withdraw.title')}</h2>
        <p className="mt-2 text-sm text-muted">
          {name}, you currently {waitlisted ? t('withdraw.holdQueue') : t('withdraw.holdSeat')}{" "}
          for <strong className="text-foreground">{classTitle}</strong>.
          {t('withdraw.withdrawingFreesForOthers')}
        </p>
      </div>

      {state.status === 'error' && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <ConfirmSubmitButton
          confirmMessage={t('withdraw.confirmMessage').replace('%s', classTitle)}
          pendingLabel={t('withdraw.withdrawing')}
        >
          {t('withdraw.yesWithdrawMe')}
        </ConfirmSubmitButton>
        <Link href="/" className="btn-secondary">
          {t('withdraw.keepMyPlace')}
        </Link>
      </div>
    </form>
  );
}
