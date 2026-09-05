import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegistration } from "./service-worker-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FABntasy", template: "%s · FABntasy" },
  description: "El fantasy del baloncesto federado andaluz.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FABntasy", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#07130f", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="es"><body>{children}<ServiceWorkerRegistration /></body></html>;
}
