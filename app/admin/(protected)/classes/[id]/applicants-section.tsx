'use client';

import { useLanguage } from '@/lib/language-context';
import { type ApplicationRecord } from '@/lib/classes';

export function ApplicantsSection({
  counts,
  classId,
  children,
}: {
  counts: { total: number; confirmed: number; waitlisted: number; cancelled: number };
  classId: number;
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {t('admin.applicantsHeading')}{' '}
          <span className="text-muted">
            ({counts.confirmed} {t('admin.seated')}
            {counts.waitlisted > 0 && `, ${counts.waitlisted} ${t('admin.waiting')}`}
            {counts.cancelled > 0 && `, ${counts.cancelled} ${t('admin.cancelled')}`})
          </span>
        </h2>
        {counts.total > 0 && (
          <a
            href={`/admin/classes/${classId}/export`}
            className="btn-secondary px-3 py-1.5"
          >
            {t('admin.downloadCSV')}
          </a>
        )}
      </div>

      {children}
    </section>
  );
}
