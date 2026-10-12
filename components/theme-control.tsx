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
    <div className="flex items-center rounded border border-surface-border bg-surface p-0.5 font-mono text-[11px]">
      <button
        type="button"
        onClick={() => applyTheme('system')}
        aria-label="System theme"
        className={`px-2 py-0.5 rounded transition-none cursor-pointer ${
          theme === 'system'
            ? 'bg-foreground text-background font-medium'
            : 'text-foreground/70 hover:text-foreground'
        }`}
      >
        system
      </button>
      <button
        type="button"
        onClick={() => applyTheme('light')}
        aria-label="Light theme"
        className={`px-2 py-0.5 rounded transition-none cursor-pointer ${
          theme === 'light'
            ? 'bg-foreground text-background font-medium'
            : 'text-foreground/70 hover:text-foreground'
        }`}
      >
        light
      </button>
      <button
        type="button"
        onClick={() => applyTheme('dark')}
        aria-label="Dark theme"
        className={`px-2 py-0.5 rounded transition-none cursor-pointer ${
          theme === 'dark'
            ? 'bg-foreground text-background font-medium'
            : 'text-foreground/70 hover:text-foreground'
        }`}
      >
        dark
      </button>
    </div>
  );
}

