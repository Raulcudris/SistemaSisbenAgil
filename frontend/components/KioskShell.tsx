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
  badge?: string;
  backHref?: string;
  onBack?: () => void;
  center?: boolean;
  footer?: ReactNode;
}

export function KioskShell({
  children,
  title,
  subtitle,
  badge,
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
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute -right-32 top-24 h-[26rem] w-[26rem] rounded-full bg-ink/5 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-[24rem] w-[46rem] -translate-x-1/2 rounded-full bg-brand/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(15, 23, 42, 0.07) 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />
      </div>

      <div
        aria-hidden
        className="no-print absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-brand-dark to-ink"
      />

      <header className="no-print relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="shrink-0 rounded-2xl p-1 transition hover:opacity-80 active:scale-95"
          aria-label="Ir al inicio"
        >
          <span className="sm:hidden">
            <BrandLogo size="sm" />
          </span>
          <span className="hidden sm:inline-flex">
            <BrandLogo />
          </span>
        </button>

        {mostrarVolver ? (
          <button
            type="button"
            onClick={volver}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2.5 text-sm font-bold text-ink shadow-sm backdrop-blur transition hover:border-brand hover:text-brand active:scale-95 sm:px-5 sm:py-3 sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            Volver
          </button>
        ) : (
          <span className="h-12" />
        )}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-6 pt-1 sm:px-8 lg:px-12">
        <div className={cn('flex w-full flex-col', center && 'my-auto')}>
          {(title || subtitle || badge) && (
            <div className="no-print mx-auto mb-5 flex max-w-3xl flex-col items-center text-center">
              {badge && (
                <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-white/80 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-brand shadow-sm backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                  {badge}
                </span>
              )}
              {title && (
                <h1 className="text-balance text-3xl font-black tracking-tight text-ink sm:text-4xl md:text-5xl">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mt-3 text-balance text-base text-muted sm:text-lg md:text-xl">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      </main>

      {footer && (
        <footer className="no-print relative z-10 mx-auto w-full max-w-7xl px-5 pb-4 text-center text-sm text-muted sm:px-8 lg:px-12">
          {footer}
        </footer>
      )}
    </div>
  );
}
