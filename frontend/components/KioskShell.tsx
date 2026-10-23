'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { BrandLogo } from './BrandLogo';

interface KioskShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  center?: boolean;
  footer?: ReactNode;
}

export function KioskShell({
  children,
  title,
  subtitle,
  backHref,
  onBack,
  center = true,
  footer,
}: KioskShellProps) {
  const router = useRouter();
  const mostrarVolver = Boolean(backHref || onBack);

  const volver = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      router.push(backHref);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="no-print flex items-center justify-between gap-4 px-6 py-4 md:px-10">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-xl p-1 transition hover:opacity-80"
          aria-label="Ir al inicio"
        >
          <BrandLogo />
        </button>

        {mostrarVolver ? (
          <button
            type="button"
            onClick={volver}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-ink shadow-sm transition hover:border-brand hover:text-brand active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            Volver
          </button>
        ) : (
          <span className="h-12" />
        )}
      </header>

      <main
        className={cn(
          'flex flex-1 flex-col px-6 pb-8 md:px-10',
          center && 'items-center justify-center',
        )}
      >
        {(title || subtitle) && (
          <div className="no-print mb-8 text-center">
            {title && (
              <h1 className="text-4xl font-black tracking-tight text-ink md:text-5xl">
                {title}
              </h1>
            )}
            {subtitle && <p className="mt-2 text-lg text-muted md:text-xl">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>

      {footer && (
        <footer className="no-print px-6 pb-6 text-center text-sm text-muted">{footer}</footer>
      )}
    </div>
  );
}
