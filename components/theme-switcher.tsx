'use client';

import { useEffect, useState } from 'react';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get saved theme preference from localStorage
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'auto' | null;
    if (saved) {
      setTheme(saved);
      applyTheme(saved);
    }
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;

    if (newTheme === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', newTheme);
    }

    localStorage.setItem('theme', newTheme);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  if (!mounted) return null;

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => handleThemeChange('light')}
        className={`rounded px-3 py-1 text-sm font-medium transition ${
          theme === 'light'
            ? 'bg-indigo-600 text-white'
            : 'bg-transparent text-muted hover:text-foreground'
        }`}
        title="Light theme"
      >
        ☀️
      </button>
      <button
        onClick={() => handleThemeChange('dark')}
        className={`rounded px-3 py-1 text-sm font-medium transition ${
          theme === 'dark'
            ? 'bg-indigo-600 text-white'
            : 'bg-transparent text-muted hover:text-foreground'
        }`}
        title="Dark theme"
      >
        🌙
      </button>
      <button
        onClick={() => handleThemeChange('auto')}
        className={`rounded px-3 py-1 text-sm font-medium transition ${
          theme === 'auto'
            ? 'bg-indigo-600 text-white'
            : 'bg-transparent text-muted hover:text-foreground'
        }`}
        title="Auto (system preference)"
      >
        🔄
      </button>
    </div>
  );
}
