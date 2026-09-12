export const APP_LOCALE = "es-ES" as const;
export const APP_TIME_ZONE = "Europe/Madrid" as const;
export const THEME_STORAGE_KEY = "canastio-theme" as const;
export const THEME_OPTIONS = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export function normalizeTheme(value: unknown): ThemePreference {
  return typeof value === "string" && THEME_OPTIONS.includes(value as ThemePreference)
    ? value as ThemePreference
    : "system";
}

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemIsDark ? "dark" : "light") : preference;
}

export const themeBootstrapScript = `(() => {
  const root = document.documentElement;
  let preference = "system";
  try {
    const saved = localStorage.getItem("${THEME_STORAGE_KEY}");
    if (saved === "light" || saved === "dark" || saved === "system") preference = saved;
  } catch {}
  const dark = preference === "dark" || (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.themePreference = preference;
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
})();`;
