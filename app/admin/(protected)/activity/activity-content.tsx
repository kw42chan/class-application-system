'use client';

import { Pagination } from '@/components/pagination';
import { useLanguage } from '@/lib/language-context';
import { type AuditEntry } from '@/lib/audit';

function formatWhen(value: string) {
  const parsed = new Date(value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function ActivityContent({
  entries,
  total,
  page,
  pageCount,
  searchParams,
}: {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageCount: number;
  searchParams: Record<string, string | undefined>;
}) {
  const { t } = useLanguage();

  const getToneClass = (action: string) => {
    const toneMap: Record<string, string> = {
      'deleted class': 'text-red-600 dark:text-red-400',
      'deleted applicant': 'text-red-600 dark:text-red-400',
      'removed administrator': 'text-red-600 dark:text-red-400',
      'created class': 'text-emerald-700 dark:text-emerald-400',
      'added administrator': 'text-emerald-700 dark:text-emerald-400',
      'promoted from waitlist': 'text-sky-700 dark:text-sky-400',
    };
    return toneMap[action] ?? 'text-foreground';
  };

  const getTranslatedAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'deleted class': t('admin.actionDeletedClass'),
      'deleted applicant': t('admin.actionDeletedApplicant'),
      'removed administrator': t('admin.actionRemovedAdministrator'),
      'created class': t('admin.actionCreatedClass'),
      'added administrator': t('admin.actionAddedAdministrator'),
      'promoted from waitlist': t('admin.actionPromotedFromWaitlist'),
    };
    return actionMap[action] ?? action;
  };

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.activity')}</h1>
        <p className="mt-1 text-sm text-muted">
          {t('admin.activityDescription')} {total} {total === 1 ? t('admin.event') : t('admin.eventPlural')}{' '}
          {t('admin.recorded')}.
        </p>
      </header>

      {entries.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted">
          {t('admin.noActivity')}
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">{t('admin.tableWhen')}</th>
                  <th className="px-5 py-3 font-medium">{t('admin.tableWho')}</th>
                  <th className="px-5 py-3 font-medium">{t('admin.tableAction')}</th>
                  <th className="px-5 py-3 font-medium">{t('admin.tableDetails')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-3 whitespace-nowrap text-muted">
                      {formatWhen(entry.createdAt)}
                    </td>
                    <td className="px-5 py-3 font-medium">{entry.actor}</td>
                    <td className={`px-5 py-3 ${getToneClass(entry.action)}`}>
                      {getTranslatedAction(entry.action)}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {entry.summary || '—'}
                      {entry.entityId != null && (
                        <span className="ml-2 font-mono text-xs opacity-60">
                          {entry.entityType}#{entry.entityId}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/admin/activity"
            page={page}
            pageCount={pageCount}
            searchParams={searchParams}
          />
        </>
      )}
    </>
  );
}
