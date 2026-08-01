'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { type ClassRecord } from '@/lib/class-utils';
import { ClassCard } from './class-card';

export function DashboardContent({ classes }: { classes: ClassRecord[] }) {
  const { t } = useLanguage();
  const open = classes.filter((cls) => cls.isOpen);
  const closed = classes.filter((cls) => !cls.isOpen);

  if (classes.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="font-medium">{t('dashboard.noClassesPublished')}</p>
        <p className="mt-1 text-sm text-muted">{t('dashboard.checkBackLater')}</p>
      </div>
    );
  }

  return (
    <>
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('dashboard.open')}
        </h2>
        {open.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            {t('dashboard.noClassesOpen')}
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
            {t('dashboard.notOpen')}
          </h2>
          <ul className="grid gap-4 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((cls) => (
              <ClassCard key={cls.id} cls={cls} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
