'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { LoginForm } from './login-form';

export function LoginPageContent({ next }: { next: string }) {
  const { t } = useLanguage();

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('login.title')}</h1>
        <p className="mt-1 text-sm text-muted">
          {t('login.subtitle')}
        </p>
      </header>

      <LoginForm next={next} />

      <Link
        href="/"
        className="mt-6 text-center text-sm text-muted underline-offset-4 hover:underline"
      >
        &larr; {t('login.backToDashboard')}
      </Link>
    </>
  );
}
