'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { SeatMeter, StatusPill } from '@/components/class-status';
import { type ClassRecord } from '@/lib/class-utils';

function formatWhen(value: string) {
  const parsed = new Date(value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function ClassDetailHeader({ cls }: { cls: ClassRecord }) {
  const { t } = useLanguage();

  return (
    <>
      <Link href="/admin" className="text-sm text-muted underline-offset-4 hover:underline">
        &larr; {t('admin.allClasses')}
      </Link>

      <header className="mt-4 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{cls.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {t('admin.created')} {formatWhen(cls.createdAt)}
          </p>
        </div>
        <StatusPill cls={cls} />
      </header>

      <div className="card mb-6 p-5">
        <SeatMeter cls={cls} />
      </div>
    </>
  );
}
