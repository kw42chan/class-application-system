'use client';

import Link from 'next/link';
import { SeatMeter, StatusPill } from '@/components/class-status';
import {
  isAcceptingAnything,
  isAcceptingWaitlist,
  type ClassRecord,
} from '@/lib/class-utils';
import { useLanguage } from '@/lib/language-context';

export function ClassCard({ cls }: { cls: ClassRecord }) {
  const { t } = useLanguage();
  const canApply = isAcceptingAnything(cls);
  const waitlistOnly = isAcceptingWaitlist(cls);

  const details = [
    cls.instructor && { label: t('class.instructor'), value: cls.instructor },
    cls.schedule && { label: t('class.when'), value: cls.schedule },
    cls.location && { label: t('class.where'), value: cls.location },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <li className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-tight">{cls.title}</h3>
        <StatusPill cls={cls} />
      </div>

      {cls.description && (
        <p className="line-clamp-3 text-sm text-muted">{cls.description}</p>
      )}

      {details.length > 0 && (
        <dl className="space-y-1 text-sm">
          {details.map((item) => (
            <div key={item.label} className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted">{item.label}</dt>
              <dd className="text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-auto space-y-4 pt-1">
        <SeatMeter cls={cls} />
        {canApply ? (
          <Link href={`/classes/${cls.id}`} className="btn-primary w-full">
            {waitlistOnly ? t('class.joinWaitlist') : t('form.apply')}
          </Link>
        ) : (
          <Link href={`/classes/${cls.id}`} className="btn-secondary w-full">
            {t('dashboard.viewDetails')}
          </Link>
        )}
      </div>
    </li>
  );
}
