"use client";

import { useEffect, useState } from "react";
import { normalizeTheme, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from "../../../src/lib/preferences";

const labels: Record<ThemePreference, string> = { system: "Sistema", light: "Claro", dark: "Oscuro" };

function applyTheme(preference: ThemePreference) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const resolved = resolveTheme(preference, media.matches);
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

export function AppearanceSettings({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_STORAGE_KEY); } catch { setStorageAvailable(false); }
    const initial = normalizeTheme(saved);
    setTheme(initial);
    applyTheme(initial);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { if (normalizeTheme(document.documentElement.dataset.themePreference) === "system") applyTheme("system"); };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  function choose(value: ThemePreference) {
    setTheme(value);
    applyTheme(value);
    try { localStorage.setItem(THEME_STORAGE_KEY, value); setStorageAvailable(true); }
    catch { setStorageAvailable(false); applyTheme("system"); setTheme("system"); }
  }

  return <section className="profile-group" aria-labelledby="appearance-title">
    {compact ? <h2 className="settings-section-title" id="appearance-title">Tema</h2> : <div className="profile-group-heading"><h2 id="appearance-title">Apariencia e idioma</h2></div>}
    <fieldset className="theme-picker"><legend>Tema</legend>
      {(["system", "light", "dark"] as const).map(value => <label key={value}><input type="radio" name="theme" value={value} checked={theme === value} onChange={() => choose(value)} /><span>{labels[value]}</span></label>)}
    </fieldset>
    <p className="settings-help">Sistema sigue el tema del dispositivo.</p><dl className="preference-metadata"><div><dt>Idioma</dt><dd>Español (España)</dd></div><div><dt>Fecha y hora</dt><dd>Madrid</dd></div></dl>
    {!storageAvailable ? <p className="settings-status" role="status">No se puede guardar la preferencia en este navegador; usamos Sistema durante esta sesión.</p> : null}
  </section>;
}
