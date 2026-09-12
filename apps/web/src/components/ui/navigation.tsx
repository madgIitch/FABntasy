"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./icon";

export function Navigation({ items, mobile = false }: { items: string[][]; mobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  useEffect(() => { setPendingHref(null); for (const [href] of items) router.prefetch(href); }, [items, pathname, router]);
  return <nav className={mobile ? "bottom-nav" : undefined} aria-label={mobile ? "Navegación móvil" : "Secciones de la aplicación"}>
    {items.map(([href, label, icon]) => <Link href={href} key={href} prefetch onClick={() => setPendingHref(href)} aria-busy={pendingHref===href} data-pending={pendingHref===href||undefined} aria-current={(href === "/app" ? pathname === href : pathname.startsWith(href)) ? "page" : undefined}><Icon name={icon as IconName} /><span>{pendingHref===href?"Cargando…":label}</span></Link>)}
  </nav>;
}
