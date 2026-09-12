"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      requestAnimationFrame(() => dialog.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href]")?.focus());
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);
  function closed() { onClose(); requestAnimationFrame(() => triggerRef.current?.focus()); }
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby={titleId} aria-modal="true" onClose={closed} onClick={e => { if (e.target === ref.current) ref.current.close(); }}><div className="confirm-dialog-body"><h2 id={titleId}>{title}</h2>{children}</div></dialog>;
}
