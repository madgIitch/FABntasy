"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

export function Navigation({ items, mobile = false }: { items: string[][]; mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? "bottom-nav" : undefined} aria-label={mobile ? "Navegación móvil" : "Secciones de la aplicación"}>
    {items.map(([href, label, icon]) => <Link href={href} key={href} aria-current={(href === "/app" ? pathname === href : pathname.startsWith(href)) ? "page" : undefined}><Icon name={icon as IconName} /><span>{label}</span></Link>)}
  </nav>;
}
