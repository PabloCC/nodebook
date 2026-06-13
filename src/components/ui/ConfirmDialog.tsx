"use client";

import { useState, useTransition, type ReactNode } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-hairline bg-canvas p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <h2 className="font-display text-lg text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-destructive">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmButton({
  title,
  message,
  confirmLabel,
  onConfirm,
  className,
  children,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={className}
      >
        {children}
      </button>
      <ConfirmDialog
        open={open}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          startTransition(() => onConfirm());
        }}
      />
    </>
  );
}
