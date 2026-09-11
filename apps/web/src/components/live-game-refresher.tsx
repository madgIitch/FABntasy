"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const LIVE_REFRESH_INTERVAL_MS = 30_000;

export function LiveGameRefresher({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const refresh = () => router.refresh();
    const interval = window.setInterval(refresh, LIVE_REFRESH_INTERVAL_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [active, router]);

  return null;
}
