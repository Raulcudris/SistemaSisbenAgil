'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clock3,
  Hand,
  LockKeyhole,
  LogOut,
  Monitor,
  RefreshCw,
  UserRound,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useKiosk } from '@/lib/kiosk-context';
import type { KioscoCola, KioscoColaItem, KioskConfig } from '@/lib/types';
import { BrandLogo } from '@/components/BrandLogo';
import { KioskLogin } from '@/components/KioskLogin';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';

const BADGE_PRIORIDAD: Record<number, string> = {
  1: 'bg-brand text-white',
  2: 'bg-slate-800 text-white',
  3: 'bg-amber-500 text-slate-950',
};

const GRUPOS_COLA = [
  { prioridad: 1, codigo: 'PR', nombre: 'Prioritarios', detalle: 'Pasan primero' },
  { prioridad: 2, codigo: 'GN', nombre: 'Generales', detalle: 'Orden de llegada' },
  { prioridad: 3, codigo: 'JR', nombre: 'Jurídicos', detalle: 'Orden de llegada' },
] as const;

function horaCorta(fecha?: string | null): string {
  if (!fecha) {
    return '—';
  }
  return new Date(fecha).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function horaConSegundos(fecha?: string | null): string {
  if (!fecha) {
    return '—';
  }
  return new Date(fecha).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function esperaTexto(minutos: number): string {
  if (minutos < 1) {
    return 'menos de 1 min';
  }
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto > 0 ? `${horas} h ${resto} min` : `${horas} h`;
}

function FilaCola({
  item,
  indice,
  ausente = false,
  onAsignar,
  asignarDeshabilitado = false,
}: {
  item: KioscoColaItem;
  indice?: number;
  ausente?: boolean;
  onAsignar?: (item: KioscoColaItem) => void;
  asignarDeshabilitado?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${
          indice === undefined ? 'bg-rose-50 text-rose-600' : 'bg-canvas text-muted'
        }`}
      >
        {indice === undefined ? <UserX className="h-4 w-4" aria-hidden /> : indice + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-base font-black leading-none text-ink">{item.codigo}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
              BADGE_PRIORIDAD[item.prioridad] ?? 'bg-slate-600 text-white'
            }`}
          >
            {item.prioridadEtiqueta}
          </span>
        </div>
        <p className="mt-1 truncate text-sm font-bold text-ink">
          {item.nombrePersona ?? 'Sin identificación'}
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-muted">
          {ausente
            ? `Llamado ${horaCorta(item.fechaLlamado)}${
                item.ventanilla ? ` · ${item.ventanilla}` : ''
              }`
            : `Espera ${esperaTexto(item.esperaMin)}`}
        </p>
      </div>
      {onAsignar && (
        <button
          type="button"
          onClick={() => onAsignar(item)}
          disabled={asignarDeshabilitado}
          title={
            asignarDeshabilitado
              ? 'No hay ventanillas libres en este momento'
              : 'Asignar este turno a una ventanilla libre'
          }
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-xs font-black text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Monitor className="h-3.5 w-3.5" aria-hidden />
          Asignar
        </button>
      )}
    </div>
  );
}

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
  const [cola, setCola] = useState<KioscoCola | null>(null);
  const [colaAbierta, setColaAbierta] = useState(false);
  const [cargandoCola, setCargandoCola] = useState(false);
  const [errorCola, setErrorCola] = useState<string | null>(null);
  const [asignando, setAsignando] = useState<KioscoColaItem | null>(null);
  const [asignandoAccion, setAsignandoAccion] = useState(false);
  const [errorAsignacion, setErrorAsignacion] = useState<string | null>(null);
  const [mensajeAsignacion, setMensajeAsignacion] = useState<string | null>(null);
  const limpiado = useRef(false);

  const puedeOperar = usuario?.rol === 'KIOSCO' || usuario?.rol === 'ADMIN';

  const colasKiosco = useMemo(
    () =>
      GRUPOS_COLA.map((grupo) => ({
        ...grupo,
        items: (cola?.espera ?? []).filter((item) => item.prioridad === grupo.prioridad),
      })),
    [cola?.espera],
  );

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

  const cargarCola = useCallback(
    async (mostrarCarga = false) => {
      if (!token || !puedeOperar) {
        return;
      }
      if (mostrarCarga) {
        setCargandoCola(true);
      }
      try {
        const respuesta = await api.kioscoCola(token);
        setCola(respuesta);
        setErrorCola(null);
      } catch (e) {
        if (mostrarCarga) {
          setErrorCola(
            e instanceof ApiError && e.status === 404
              ? 'La cola del kiosco no está disponible. Reinicie el backend e intente de nuevo.'
              : mensajeError(e),
          );
        }
      } finally {
        if (mostrarCarga) {
          setCargandoCola(false);
        }
      }
    },
    [token, puedeOperar],
  );

  useEffect(() => {
    if (hydrated && authHydrated && puedeOperar) {
      cargar();
    }
  }, [hydrated, authHydrated, puedeOperar, cargar]);

  // Mantiene los contadores del kiosco al día sin bloquear el resto de la pantalla.
  useEffect(() => {
    if (!authHydrated || !token || !puedeOperar) {
      return;
    }
    void cargarCola();
    const id = setInterval(() => void cargarCola(), 8000);
    return () => clearInterval(id);
  }, [authHydrated, token, puedeOperar, cargarCola]);

  useEffect(() => {
    if (!colaAbierta) {
      return;
    }
    const alPresionar = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (asignando && !asignandoAccion) {
        setAsignando(null);
      } else if (!asignandoAccion) {
        setColaAbierta(false);
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', alPresionar);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', alPresionar);
    };
  }, [colaAbierta, asignando, asignandoAccion]);

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
    setCola(null);
    setColaAbierta(false);
    setCargandoCola(false);
    setErrorCola(null);
    setAsignando(null);
    setAsignandoAccion(false);
    setErrorAsignacion(null);
    setMensajeAsignacion(null);
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

  const abrirCola = () => {
    setColaAbierta(true);
    setAsignando(null);
    setErrorAsignacion(null);
    setMensajeAsignacion(null);
    void cargarCola(true);
  };

  const abrirAsignacion = (item: KioscoColaItem) => {
    if (!token || (cola?.ventanillasLibres?.length ?? 0) === 0) {
      setErrorAsignacion('No hay ventanillas libres en este momento.');
      return;
    }
    setAsignando(item);
    setErrorAsignacion(null);
    setMensajeAsignacion(null);
  };

  const asignarTurno = async (ventanillaId: number) => {
    if (!token || !asignando || asignandoAccion) {
      return;
    }
    const ventanilla = cola?.ventanillasLibres?.find((item) => item.id === ventanillaId);
    setAsignandoAccion(true);
    setErrorAsignacion(null);
    try {
      const respuesta = await api.kioscoAsignar(
        token,
        asignando.turnoId,
        ventanillaId,
      );
      setCola(respuesta);
      setMensajeAsignacion(
        `Turno ${asignando.codigo} asignado a ${
          ventanilla ? `${ventanilla.codigo} · ${ventanilla.nombre}` : 'la ventanilla'
        }.`,
      );
      setAsignando(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        return;
      }
      setErrorAsignacion(mensajeError(e));
    } finally {
      setAsignandoAccion(false);
    }
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

      <button
        type="button"
        onClick={abrirCola}
        className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/85 px-5 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:border-brand hover:text-brand"
      >
        <Users className="h-4 w-4 text-brand" aria-hidden />
        Ver cola del día
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-700">
          {cola ? `${cola.enEspera} en espera` : 'Consultando…'}
        </span>
        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-black text-rose-700">
          {cola
            ? `${cola.ausentes} ${cola.ausentes === 1 ? 'no asistió' : 'no asistieron'}`
            : '—'}
        </span>
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

      {colaAbierta && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cola-titulo"
          onClick={() => {
            setColaAbierta(false);
            setAsignando(null);
          }}
        >
          <div
            className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white text-left shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2
                  id="cola-titulo"
                  className="flex items-center gap-2 text-2xl font-black text-ink"
                >
                  <Users className="h-6 w-6 text-brand" aria-hidden />
                  Cola del día
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted">
                  Actualizada a las {horaConSegundos(cola?.actualizado)} · se actualiza
                  automáticamente cada 8 segundos.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void cargarCola(true)}
                  disabled={cargandoCola}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${cargandoCola ? 'animate-spin' : ''}`}
                    aria-hidden
                  />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => {
            setColaAbierta(false);
            setAsignando(null);
          }}
                  aria-label="Cerrar cola"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand hover:text-brand"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {errorCola && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {errorCola}
                </div>
              )}

              {mensajeAsignacion && (
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {mensajeAsignacion}
                </div>
              )}

              {errorAsignacion && !asignando && (
                <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {errorAsignacion}
                </div>
              )}

              <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-800">
                    <Monitor className="h-4 w-4" aria-hidden />
                    Ventanillas libres
                  </span>
                  {cola?.ventanillasLibres?.length ? (
                    cola.ventanillasLibres.map((ventanilla) => (
                      <span
                        key={ventanilla.id}
                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm"
                      >
                        {ventanilla.codigo} · {ventanilla.nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-semibold text-emerald-700/80">
                      Ninguna disponible en este momento
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-emerald-700/80">
                  Use «Asignar» en un turno en espera para llamarlo en una ventanilla
                  libre.
                </p>
              </section>

              <section className="overflow-hidden rounded-2xl border border-amber-100">
                <div className="flex items-center justify-between gap-3 bg-amber-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Clock3 className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-black text-ink">En espera</h3>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/70">
                        Aún no han sido llamados
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-amber-700 shadow-sm">
                    {cola?.enEspera ?? 0}
                  </span>
                </div>

                <div className="grid gap-3 p-3 lg:grid-cols-3">
                  {!cola && cargandoCola && (
                    <p className="py-8 text-center text-sm font-semibold text-muted lg:col-span-3">
                      Cargando cola…
                    </p>
                  )}

                  {colasKiosco.map((grupo) => (
                    <div
                      key={grupo.codigo}
                      className="overflow-hidden rounded-2xl border border-slate-100"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-black ${
                              BADGE_PRIORIDAD[grupo.prioridad] ?? 'bg-slate-600 text-white'
                            }`}
                          >
                            {grupo.codigo}
                          </span>
                          <div>
                            <p className="font-black text-ink">{grupo.nombre}</p>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                              {grupo.detalle}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-ink shadow-sm">
                          {grupo.items.length} en espera
                        </span>
                      </div>

                      <div className="max-h-[28vh] space-y-2 overflow-y-auto p-3">
                        {grupo.items.map((item, indice) => (
                          <FilaCola
                            key={item.turnoId}
                            item={item}
                            indice={indice}
                            onAsignar={abrirAsignacion}
                            asignarDeshabilitado={
                              (cola?.ventanillasLibres?.length ?? 0) === 0
                            }
                          />
                        ))}
                        {grupo.items.length === 0 && !errorCola && (
                          <p className="py-5 text-center text-sm font-semibold text-muted">
                            No hay turnos {grupo.nombre.toLowerCase()} en espera.
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-rose-100">
                <div className="flex items-center justify-between gap-3 bg-rose-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                      <UserX className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="font-black text-ink">No asistieron</h3>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-rose-700/70">
                        Llamados que no se presentaron
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-rose-700 shadow-sm">
                    {cola?.ausentes ?? 0}
                  </span>
                </div>
                <div className="grid max-h-[32vh] gap-2 overflow-y-auto p-3 md:grid-cols-2">
                  {!cola && cargandoCola && (
                    <p className="py-8 text-center text-sm font-semibold text-muted md:col-span-2">
                      Cargando cola…
                    </p>
                  )}
                  {cola?.ausentesHoy.map((item) => (
                    <FilaCola key={item.turnoId} item={item} ausente />
                  ))}
                  {cola && cola.ausentesHoy.length === 0 && !errorCola && (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted md:col-span-2">
                      <UserX className="h-10 w-10 text-slate-300" aria-hidden />
                      <p className="mt-2 text-sm font-semibold">
                        Nadie ha sido marcado como ausente.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <footer className="border-t border-slate-100 px-6 py-3 text-center text-xs font-semibold text-slate-400">
              Esta vista no muestra documentos ni teléfonos.
            </footer>
          </div>
        </div>
      )}

      {colaAbierta && asignando && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="asignar-titulo"
          onClick={() => {
            if (!asignandoAccion) {
              setAsignando(null);
            }
          }}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white text-left shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <h2
                  id="asignar-titulo"
                  className="flex items-center gap-2 text-2xl font-black text-ink"
                >
                  <Monitor className="h-6 w-6 text-brand" aria-hidden />
                  Asignar turno
                </h2>
                <p className="mt-1 text-sm font-semibold text-muted">
                  Turno{' '}
                  <span className="font-mono font-black text-ink">{asignando.codigo}</span>
                  {' · '}
                  {asignando.nombrePersona ?? 'Sin identificación'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!asignandoAccion) {
                    setAsignando(null);
                  }
                }}
                aria-label="Cerrar asignación"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand hover:text-brand disabled:opacity-50"
                disabled={asignandoAccion}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div className="p-6">
              <p className="text-sm font-semibold text-muted">
                Elija la ventanilla libre donde se llamará este turno.
              </p>

              {errorAsignacion && (
                <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {errorAsignacion}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {cola?.ventanillasLibres?.map((ventanilla) => (
                  <button
                    key={ventanilla.id}
                    type="button"
                    onClick={() => void asignarTurno(ventanilla.id)}
                    disabled={asignandoAccion}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-canvas px-4 py-3 text-left transition hover:border-brand hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                      <Monitor className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-lg font-black leading-none text-ink">
                        {ventanilla.codigo}
                      </span>
                      <span className="mt-1 block truncate text-sm font-semibold text-muted">
                        {ventanilla.nombre}
                      </span>
                    </span>
                  </button>
                ))}
                {(!cola || (cola.ventanillasLibres?.length ?? 0) === 0) && (
                  <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 sm:col-span-2">
                    No hay ventanillas libres. Finalice o marque ausente un turno para
                    liberar una ventanilla.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAsignando(null)}
                  disabled={asignandoAccion}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand disabled:opacity-70"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
