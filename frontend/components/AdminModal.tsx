'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
}: AdminModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-card md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted transition hover:bg-canvas hover:text-ink"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
