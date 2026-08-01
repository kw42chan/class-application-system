'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { SeatMeter, StatusPill } from '@/components/class-status';
import { seatsLeft, type ClassRecord } from '@/lib/class-utils';
import { ApplyForm } from './apply-form';

export function ClassDetailContent({
  cls,
  showForm,
  waitlistOnly,
  canApply,
}: {
  cls: ClassRecord;
  showForm: boolean;
  waitlistOnly: boolean;
  canApply: boolean;
}) {
  const { t } = useLanguage();

  const details = [
    cls.instructor && { label: t('class.instructor'), value: cls.instructor },
    cls.schedule && { label: t('class.when'), value: cls.schedule },
    cls.location && { label: t('class.where'), value: cls.location },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">
        &larr; {t('class.backToAllClasses')}
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{cls.title}</h1>
        <StatusPill cls={cls} />
      </header>

      {cls.description && (
        <p className="mt-4 whitespace-pre-line text-muted">{cls.description}</p>
      )}

      {details.length > 0 && (
        <dl className="card mt-6 divide-y divide-border">
          {details.map((detail) => (
            <div key={detail.label} className="flex gap-4 px-5 py-3 text-sm">
              <dt className="w-24 shrink-0 text-muted">{detail.label}</dt>
              <dd className="font-medium">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="card mt-6 p-5">
        <SeatMeter cls={cls} />
      </div>

      <div className="mt-6">
        {showForm ? (
          <ApplyForm
            classId={cls.id}
            classTitle={cls.title}
            waitlistOnly={waitlistOnly}
          />
        ) : (
          <div className="card p-6 text-center">
            <p className="font-medium">
              {!cls.isOpen
                ? t('class.applicationsClosed')
                : t('class.isFull')}
            </p>
            <p className="mt-1 text-sm text-muted">
              {!cls.isOpen
                ? t('class.checkBack')
                : `All ${cls.capacity} ${t('class.seatsTaken')}.`}
            </p>
            <Link href="/" className="btn-secondary mt-5">
              {t('class.browseOtherClasses')}
            </Link>
          </div>
        )}
      </div>

      {canApply && seatsLeft(cls) <= 3 && (
        <p className="mt-4 text-center text-sm text-amber-600 dark:text-amber-400">
          {t('class.onlySeatsLeft')} {seatsLeft(cls)} {t('class.seatsLeftWarning')}
        </p>
      )}
    </>
  );
}
