'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, LockKeyhole, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { api, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { panelDe } from '@/lib/roles';
import { BrandLogo } from '@/components/BrandLogo';
import { Loading } from '@/components/Loading';

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, usuario, iniciarSesion } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && usuario) {
      router.replace(panelDe(usuario.rol));
    }
  }, [hydrated, usuario, router]);

  const enviar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (enviando) {
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await api.login(username.trim(), password);
      iniciarSesion(respuesta);
      router.replace(panelDe(respuesta.usuario.rol));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  if (!hydrated || usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-white via-canvas to-brand/10 px-6 py-10">
      <span className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand/5 blur-3xl" />
      <span className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-card">
        <div className="flex justify-center">
          <BrandLogo size="md" />
        </div>

        <div className="mt-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
            <ShieldCheck className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-ink">Acceso funcionarios</h1>
          <p className="mt-2 text-sm text-muted">
            Ingrese con su usuario para ver el dashboard o atender la ventanilla.
          </p>
        </div>

        <form onSubmit={enviar} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-ink">Usuario</span>
            <span className="relative block">
              <UserRound
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-canvas py-3.5 pl-12 pr-4 text-base font-semibold text-ink outline-none transition focus:border-brand focus:bg-white"
                placeholder="admin"
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
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-slate-200 bg-canvas py-3.5 pl-12 pr-4 text-base font-semibold text-ink outline-none transition focus:border-brand focus:bg-white"
                placeholder="••••••••"
              />
            </span>
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-brand" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-base font-bold text-white shadow-lg transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-70"
          >
            <LogIn className="h-5 w-5" aria-hidden />
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-6 rounded-2xl bg-canvas px-4 py-3 text-xs text-muted">
            <p className="flex items-center gap-2 font-bold text-ink">
              <KeyRound className="h-4 w-4" aria-hidden />
              Credenciales de desarrollo
            </p>
            <p className="mt-1">
              Administrador: <span className="font-mono font-bold">admin / admin123</span>
            </p>
            <p>
              Asesor: <span className="font-mono font-bold">asesor / asesor123</span>
            </p>
            <p>
              Kiosco: <span className="font-mono font-bold">kiosco / kiosco123</span>
            </p>
          </div>
        )}

        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 text-sm font-bold text-muted transition hover:text-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver al kiosco
        </Link>
      </div>
    </div>
  );
}
