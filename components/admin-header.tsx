'use client';

import Link from 'next/link';
import { logout } from '@/app/actions/admin';
import { LanguageSwitcher } from './language-switcher';

const NAV = [
  { href: '/admin', label: 'Classes' },
  { href: '/admin/team', label: 'Team' },
  { href: '/admin/activity', label: 'Activity' },
];

export function AdminHeader({ username }: { username: string }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold">Class administration</span>
          <nav className="flex items-center gap-3 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <LanguageSwitcher />
          <Link
            href="/"
            target="_blank"
            className="text-muted underline-offset-4 hover:underline"
          >
            Student view
          </Link>
          <span className="text-muted">
            Signed in as <strong className="text-foreground">{username}</strong>
          </span>
          <form action={logout}>
            <button type="submit" className="btn-secondary px-3 py-1.5">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
