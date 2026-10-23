'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Hand, LockKeyhole, LogOut, RefreshCw, UserRound } from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useKiosk } from '@/lib/kiosk-context';
import type { KioskConfig } from '@/lib/types';
import { BrandLogo } from '@/components/BrandLogo';
import { KioskLogin } from '@/components/KioskLogin';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';

export default function InicioPage() {
  const router = useRouter();
  const { hydrated, update, reset } = useKiosk();
  const {
    hydrated: authHydrated,
    usuario,
    token,
    iniciarSesion,
    actualizarSesion,
    cerrarSesion,
  } = useAuth();

  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const limpiado = useRef(false);

  const puedeOperar = usuario?.rol === 'KIOSCO' || usuario?.rol === 'ADMIN';

  useEffect(() => {
    if (hydrated && !limpiado.current) {
      limpiado.current = true;
      reset();
    }
  }, [hydrated, reset]);

  // Valida la sesión guardada; si expiró, vuelve al acceso del kiosco.
  useEffect(() => {
    if (!authHydrated || !token || !puedeOperar) {
      return;
    }
    let cancelado = false;
    api
      .sesion(token)
      .then((sesion) => {
        if (!cancelado) {
          actualizarSesion(sesion);
        }
      })
      .catch((e) => {
        if (!cancelado && e instanceof ApiError && e.status === 401) {
          cerrarSesion();
        }
      });
    return () => {
      cancelado = true;
    };
  }, [authHydrated, token, puedeOperar, actualizarSesion, cerrarSesion]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await api.config();
      setConfig(respuesta);
      update({ config: respuesta });
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
    }
  }, [update]);

  useEffect(() => {
    if (hydrated && authHydrated && puedeOperar) {
      cargar();
    }
  }, [hydrated, authHydrated, puedeOperar, cargar]);

  const entrar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (entrando) {
      return;
    }
    setEntrando(true);
    setErrorLogin(null);
    try {
      const respuesta = await api.login(username.trim(), password);
      if (respuesta.usuario.rol !== 'KIOSCO' && respuesta.usuario.rol !== 'ADMIN') {
        setErrorLogin(
          'Este usuario no está habilitado para el kiosco. Use el acceso de funcionarios.',
        );
        return;
      }
      iniciarSesion(respuesta);
      setUsername('');
      setPassword('');
      if (respuesta.usuario.rol === 'ADMIN') {
        router.replace('/dashboard');
        return;
      }
    } catch (e) {
      setErrorLogin(mensajeError(e));
    } finally {
      setEntrando(false);
    }
  };

  const salir = () => {
    reset();
    cerrarSesion();
    setConfig(null);
    setCargando(false);
    setError(null);
    setErrorLogin(null);
    setUsername('');
    setPassword('');
  };

  const comenzar = () => {
    if (!puedeOperar) {
      return;
    }
    if (!config) {
      cargar();
      return;
    }
    router.push('/cedula');
  };

  if (!authHydrated || !hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Iniciando kiosco…" />
      </div>
    );
  }

  if (!puedeOperar) {
    return (
      <KioskLogin
        usuarioInvalido={usuario ? usuario.nombre : null}
        username={username}
        password={password}
        entrando={entrando}
        error={errorLogin}
        onUsername={(valor) => {
          setUsername(valor);
          setErrorLogin(null);
        }}
        onPassword={(valor) => {
          setPassword(valor);
          setErrorLogin(null);
        }}
        onSubmit={entrar}
        onSalir={salir}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-white via-canvas to-brand/10 px-8 text-center">
      <span className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand/5 blur-3xl" />
      <span className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />

      <BrandLogo size="lg" />

      <h1 className="mt-8 text-6xl font-black tracking-tight text-ink md:text-8xl">
        Bienvenido
      </h1>

      <p className="mt-5 text-xl font-medium text-muted md:text-3xl">
        Toque la pantalla para comenzar
      </p>

      <button
        type="button"
        onClick={comenzar}
        disabled={cargando}
        className="mt-10 inline-flex items-center gap-3 rounded-full bg-brand px-10 py-5 text-xl font-bold text-white shadow-card transition hover:bg-brand-dark active:scale-95 disabled:opacity-70 md:text-2xl"
      >
        {cargando ? (
          <>
            <RefreshCw className="h-6 w-6 animate-spin" aria-hidden />
            Conectando…
          </>
        ) : (
          <>
            <Hand className="h-7 w-7" aria-hidden />
            Comenzar
          </>
        )}
      </button>

      <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
        <UserRound className="h-3.5 w-3.5 text-brand" aria-hidden />
        Operador: {usuario?.nombre}
        <button
          type="button"
          onClick={salir}
          className="ml-1 inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-red-50 hover:text-brand"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          Cambiar
        </button>
      </div>

      {config && (
        <p className="absolute bottom-6 hidden text-sm font-medium text-muted md:block">
          {config.empresa} · {config.sede}
        </p>
      )}

      <Link
        href="/login"
        className="no-print absolute bottom-6 right-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-bold text-slate-400 shadow-sm transition hover:border-brand hover:text-brand"
      >
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden />
        Acceso funcionarios
      </Link>

      <Modal
        open={Boolean(error)}
        tone="error"
        title="No hay conexión con el kiosco"
        message={error ?? undefined}
        actionLabel="Reintentar"
        onAction={cargar}
        onClose={() => setError(null)}
      />
    </div>
  );
}
