export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

// A cookie rather than localStorage so the server can write data-theme into
// the first byte of HTML: no flash and no inline script before paint.
export const THEME_COOKIE = "theme";

export function parseTheme(value: string | undefined): Theme {
  return THEMES.find((t) => t === value) ?? "system";
}
