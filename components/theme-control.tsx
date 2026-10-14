"use client";

import { useState } from "react";
import { THEME_COOKIE, THEMES, type Theme } from "@/lib/theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeControl({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex h-6 items-center rounded border border-line text-[0.6875rem]"
    >
      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          onClick={() => choose(t)}
          className={`h-full px-2 first:rounded-l last:rounded-r ${
            theme === t ? "bg-raised text-fg" : "text-fg-muted hover:text-fg"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
