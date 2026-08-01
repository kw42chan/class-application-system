'use client';

import { useLanguage } from '@/lib/language-context';
import { LANGUAGES, type Language } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          language === 'en'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
        }`}
        title="English"
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('zh-TW')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          language === 'zh-TW'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
        }`}
        title="Traditional Chinese"
      >
        繁
      </button>
    </div>
  );
}
