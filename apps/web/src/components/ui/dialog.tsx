"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); if (!open && ref.current?.open) ref.current.close(); }, [open]);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby={titleId} onClose={onClose} onClick={e => { if (e.target === ref.current) ref.current.close(); }}><div className="confirm-dialog-body"><h2 id={titleId}>{title}</h2>{children}</div></dialog>;
}
