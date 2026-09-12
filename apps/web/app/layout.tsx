import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "./service-worker-registration";
import { themeBootstrapScript } from "../src/lib/preferences";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Canastio", template: "%s · Canastio" },
  description: "El fantasy del baloncesto federado andaluz.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/canastio-logo.png",
    shortcut: "/canastio-logo.png",
    apple: "/canastio-logo.png",
  },
  appleWebApp: { capable: true, title: "Canastio", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#f4f7f2" },
  { media: "(prefers-color-scheme: dark)", color: "#081811" },
], colorScheme: "light dark", viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} /></head><body>{children}<ServiceWorkerRegistration /></body></html>;
}
