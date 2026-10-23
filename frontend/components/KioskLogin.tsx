'use client';

import Link from 'next/link';
import type { FormEvent } from 'react';
import { KeyRound, LockKeyhole, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface KioskLoginProps {
  usuarioInvalido: string | null;
  username: string;
  password: string;
  entrando: boolean;
  error: string | null;
  onUsername: (valor: string) => void;
  onPassword: (valor: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSalir: () => void;
}

export function KioskLogin({
  usuarioInvalido,
  username,
  password,
  entrando,
  error,
  onUsername,
  onPassword,
  onSubmit,
  onSalir,
}: KioskLoginProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-white via-canvas to-brand/10 px-6 py-10">
      <span className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand/5 blur-3xl" />
      <span className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-card md:p-10">
        <div className="flex justify-center">
          <BrandLogo size="md" />
        </div>

        <div className="mt-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <ShieldCheck className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-ink">
            {usuarioInvalido ? 'Sesión de asesor activa' : 'Acceso al kiosco'}
          </h1>
          <p className="mt-2 text-base text-muted">
            {usuarioInvalido
              ? `${usuarioInvalido} tiene rol de asesor y debe atender desde la ventanilla.`
              : 'Ingrese el usuario del operador para habilitar la generación de turnos.'}
          </p>
        </div>

        {usuarioInvalido ? (
          <div className="mt-8 space-y-3">
            <Link
              href="/ventanilla"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-brand-dark"
            >
              <UserRound className="h-5 w-5" aria-hidden />
              Ir a mi ventanilla
            </Link>
            <button
              type="button"
              onClick={onSalir}
              className="w-full rounded-2xl border-2 border-slate-200 bg-white px-6 py-4 text-base font-bold text-ink transition hover:border-brand hover:text-brand"
            >
              Cerrar sesión y volver
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-ink">
                Usuario del operador
              </span>
              <span className="relative block">
                <UserRound
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  type="text"
                  value={username}
                  onChange={(event) => onUsername(event.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                  className="w-full rounded-2xl border border-slate-200 bg-canvas py-4 pl-12 pr-4 text-lg font-semibold text-ink outline-none transition focus:border-brand focus:bg-white"
                  placeholder="kiosco"
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-ink">Contraseña</span>
              <span className="relative block">
                <LockKeyhole
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => onPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-canvas py-4 pl-12 pr-4 text-lg font-semibold text-ink outline-none transition focus:border-brand focus:bg-white"
                  placeholder="••••••••"
                />
              </span>
            </label>

            {error && (
              <p
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-brand"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={entrando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-70"
            >
              <LogIn className="h-5 w-5" aria-hidden />
              {entrando ? 'Ingresando…' : 'Ingresar al kiosco'}
            </button>
          </form>
        )}

        {process.env.NODE_ENV !== 'production' && !usuarioInvalido && (
          <div className="mt-6 rounded-2xl bg-canvas px-4 py-3 text-xs text-muted">
            <p className="flex items-center gap-2 font-bold text-ink">
              <KeyRound className="h-4 w-4" aria-hidden />
              Credenciales de desarrollo
            </p>
            <p className="mt-1">
              Operador de kiosco:{' '}
              <span className="font-mono font-bold">kiosco / kiosco123</span>
            </p>
            <p>
              Administrador:{' '}
              <span className="font-mono font-bold">admin / admin123</span>
            </p>
          </div>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 text-sm font-bold text-muted transition hover:text-brand"
        >
          <UserRound className="h-4 w-4" aria-hidden />
          Acceso funcionarios
        </Link>
      </div>
    </div>
  );
}
