'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { WithdrawForm } from './withdraw-form';

export function WithdrawPageContent({
  found,
  token,
}: {
  found: {
    application: { status: string; name: string; classId: number };
    classTitle: string;
  } | null;
  token: string;
}) {
  const { t } = useLanguage();

  if (!found) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">{t('withdraw.invalidLink')}</h1>
        <p className="mt-2 text-sm text-muted">
          {t('withdraw.linkAlreadyUsed')}
        </p>
        <Link href="/" className="btn-secondary mt-5">
          {t('withdraw.browseClasses')}
        </Link>
      </div>
    );
  }

  if (found.application.status === 'cancelled') {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-lg font-semibold">{t('withdraw.alreadyWithdrawn')}</h1>
        <p className="mt-2 text-sm text-muted">
          {found.application.name}, {t('withdraw.youreNoLongerSignedUp')}{" "}
          <strong className="text-foreground">{found.classTitle}</strong>.
        </p>
        <Link href={`/classes/${found.application.classId}`} className="btn-secondary mt-5">
          {t('withdraw.viewTheClass')}
        </Link>
      </div>
    );
  }

  return (
    <WithdrawForm
      token={token}
      classTitle={found.classTitle}
      name={found.application.name}
      waitlisted={found.application.status === 'waitlisted'}
    />
  );
}
