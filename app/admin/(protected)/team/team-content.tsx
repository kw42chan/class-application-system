'use client';

import { removeAdmin } from '@/app/actions/admin';
import { ConfirmSubmitButton } from '@/components/form-buttons';
import { useLanguage } from '@/lib/language-context';
import { type AdminRecord } from '@/lib/admins';
import { AddAdminForm, ChangePasswordForm } from './admin-forms';

function formatWhen(value: string) {
  const parsed = new Date(value.replace(' ', 'T') + 'Z');
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function TeamContent({
  admins,
  currentUsername,
  notice,
}: {
  admins: AdminRecord[];
  currentUsername: string;
  notice: { tone: 'ok' | 'warn'; text: string } | null;
}) {
  const { t } = useLanguage();

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.team')}</h1>
        <p className="mt-1 text-sm text-muted">
          {admins.length} {admins.length === 1 ? t('admin.administrator') : t('admin.administratorPlural')}.{' '}
          {t('admin.teamDescription')}
        </p>
      </header>

      {notice && (
        <p
          role="status"
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            notice.tone === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          }`}
        >
          {notice.text}
        </p>
      )}

      <div className="card mb-8 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">{t('admin.tableUsername')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.tableAdded')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.tableAddedBy')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('admin.tableActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((admin) => {
              const isSelf = admin.username.toLowerCase() === currentUsername.toLowerCase();
              return (
                <tr key={admin.id}>
                  <td className="px-5 py-4">
                    <span className="font-medium">{admin.username}</span>
                    {isSelf && (
                      <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">
                        {t('admin.you')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted">{formatWhen(admin.createdAt)}</td>
                  <td className="px-5 py-4 text-muted">{admin.createdBy}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end">
                      {isSelf || admins.length === 1 ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <form action={removeAdmin}>
                          <input type="hidden" name="id" value={admin.id} />
                          <ConfirmSubmitButton
                            className="btn-danger px-3 py-1.5"
                            confirmMessage={t('admin.removeAdminConfirm').replace('%s', admin.username)}
                            pendingLabel="…"
                          >
                            {t('admin.removeAdmin')}
                          </ConfirmSubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AddAdminForm />
        <ChangePasswordForm />
      </div>
    </>
  );
}
