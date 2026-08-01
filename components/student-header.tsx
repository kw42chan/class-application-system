'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { LanguageSwitcher } from './language-switcher';

export function StudentHeader() {
  const { t } = useLanguage();

  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('dashboard.title')}
        </h1>
        <p className="mt-2 text-muted">{t('dashboard.subtitle')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <LanguageSwitcher />
        <Link
          href="/admin"
          className="text-sm text-muted underline-offset-4 hover:underline"
        >
          Administrator
        </Link>
      </div>
    </header>
  );
}
