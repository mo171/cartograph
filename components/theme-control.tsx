'use client';

import { useSyncExternalStore, useEffect } from 'react';

type Theme = 'system' | 'light' | 'dark';

let listeners: Array<() => void> = [];

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    window.removeEventListener('storage', listener);
  };
}

function getSnapshot(): Theme {
  return (localStorage.getItem('cartograph-theme') as Theme) || 'system';
}

function getServerSnapshot(): Theme {
  return 'system';
}

export function ThemeControl() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const applyTheme = (newTheme: Theme) => {
    localStorage.setItem('cartograph-theme', newTheme);
    document.cookie = `cartograph-theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`;

    const root = document.documentElement;
    root.setAttribute('data-theme', newTheme);

    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && systemDark);

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }

    notify();
  };

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <div
      className="flex items-center rounded-lg border border-surface-border bg-surface/70 p-0.5"
      role="group"
      aria-label="Theme selector"
    >
      <button
        type="button"
        onClick={() => applyTheme('system')}
        title="System preference"
        aria-label="System theme"
        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
          theme === 'system'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-foreground/50 hover:text-foreground'
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => applyTheme('light')}
        title="Light mode"
        aria-label="Light theme"
        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
          theme === 'light'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-foreground/50 hover:text-foreground'
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => applyTheme('dark')}
        title="Dark mode"
        aria-label="Dark theme"
        className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors cursor-pointer ${
          theme === 'dark'
            ? 'bg-background text-foreground shadow-xs'
            : 'text-foreground/50 hover:text-foreground'
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>
    </div>
  );
}

