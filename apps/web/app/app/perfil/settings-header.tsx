import Link from "next/link";
import type { ReactNode } from "react";
export function SettingsPage({ title, children, backHref="/app/perfil" }: { title: string; children: ReactNode; backHref?: string }) { return <main className="app-main profile-page settings-page"><header className="settings-header"><Link href={backHref} aria-label="Volver">←</Link><div><p className="eyebrow">Perfil</p><h1>{title}</h1></div></header>{children}</main>; }
