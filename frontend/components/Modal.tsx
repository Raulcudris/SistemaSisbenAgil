'use client';

import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'error' | 'success';

interface ModalProps {
  open: boolean;
  title: string;
  message?: string;
  children?: ReactNode;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  autoCloseMs?: number;
}

export function Modal({
  open,
  title,
  message,
  children,
  tone = 'info',
  actionLabel = 'Entendido',
  onAction,
  onClose,
  autoCloseMs,
}: ModalProps) {
  useEffect(() => {
    if (!open || !autoCloseMs) {
      return;
    }
    const id = setTimeout(() => {
      onAction?.();
      onClose?.();
    }, autoCloseMs);
    return () => clearTimeout(id);
  }, [open, autoCloseMs, onAction, onClose]);

  if (!open) {
    return null;
  }

  const Icono = tone === 'error' ? AlertTriangle : tone === 'success' ? CheckCircle2 : Info;
  const colorIcono =
    tone === 'error'
      ? 'bg-red-100 text-brand'
      : tone === 'success'
        ? 'bg-emerald-100 text-emerald-600'
        : 'bg-brand-light text-brand';

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-card">
        <div
          className={cn(
            'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
            colorIcono,
          )}
        >
          <Icono className="h-9 w-9" aria-hidden />
        </div>
        <h2 className="mt-5 text-3xl font-black text-ink">{title}</h2>
        {message && <p className="mt-3 text-lg leading-relaxed text-muted">{message}</p>}
        {children}
        <button
          type="button"
          onClick={() => {
            onAction?.();
            onClose?.();
          }}
          className="mt-7 w-full rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-dark active:scale-[0.99]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
