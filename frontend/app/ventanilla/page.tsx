'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Lock,
  Megaphone,
  Monitor,
  RefreshCw,
  Search,
  Timer,
  UserX,
  Users,
} from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useAuthGuard } from '@/lib/use-auth-guard';
import type { Rol, VentanillaEstado, VentanillaResumen } from '@/lib/types';
import { EstadoBadge } from '@/components/EstadoBadge';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';
import { StaffShell } from '@/components/StaffShell';
import { StatCard } from '@/components/StatCard';

const ROLES_VENTANILLA: Rol[] = ['ADMIN', 'ASESOR'];

const COLORES_TIPO: Record<number, string> = {
  1: 'bg-brand text-white',
  2: 'bg-slate-800 text-white',
  3: 'bg-amber-500 text-white',
};

function hora(iso?: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function espera(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h} h ${m} min`;
}

function duracion(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function transcurridoDesde(iso?: string | null): number {
  if (!iso) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

export default function VentanillaPage() {
  const router = useRouter();
  const listo = useAuthGuard(ROLES_VENTANILLA);
  const {
    token,
    usuario,
    ventanillaId,
    ventanillas,
    seleccionarVentanilla,
    cerrarSesion,
  } = useAuth();

  const esAsesor = usuario?.rol === 'ASESOR';
  const requiereSeleccion = esAsesor && !ventanillaId;

  const [estado, setEstado] = useState<VentanillaEstado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarAusente, setConfirmarAusente] = useState(false);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [filtro, setFiltro] = useState('');
  const [transcurrido, setTranscurrido] = useState(0);
  const [ventanillasResumen, setVentanillasResumen] = useState<VentanillaResumen[]>([]);

  // El admin puede cambiar de ventanilla; el asesor elige la suya.
  useEffect(() => {
    if (listo && usuario?.rol === 'ADMIN' && !ventanillaId && ventanillas.length > 0) {
      seleccionarVentanilla(ventanillas[0].id);
    }
  }, [listo, usuario, ventanillaId, ventanillas, seleccionarVentanilla]);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!token || !ventanillaId) {
        return;
      }
      if (!silencioso) {
        setCargando(true);
      }
      try {
        const data = await api.ventanillaEstado(token, ventanillaId);
        setEstado(data);
        setError(null);
        setActualizado(new Date());
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          cerrarSesion();
          router.replace('/login');
          return;
        }
        setError(mensajeError(e));
      } finally {
        setCargando(false);
      }
    },
    [token, ventanillaId, cerrarSesion, router],
  );

  useEffect(() => {
    if (!listo || !ventanillaId) {
      return;
    }
    cargar();
    const id = setInterval(() => cargar(true), 5000);
    return () => clearInterval(id);
  }, [listo, ventanillaId, cargar]);

  // Lista de ventanillas con su estado para que el asesor elija la suya.
  const cargarVentanillas = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const data = await api.ventanillaVentanillas(token);
      setVentanillasResumen(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    }
  }, [token, cerrarSesion, router]);

  useEffect(() => {
    if (!listo || !requiereSeleccion) {
      return;
    }
    cargarVentanillas();
    const id = setInterval(cargarVentanillas, 5000);
    return () => clearInterval(id);
  }, [listo, requiereSeleccion, cargarVentanillas]);

  // Cronómetro de atención: cuenta desde el llamado del turno actual.
  const inicioAtencion = estado?.actual?.fechaLlamado ?? null;
  useEffect(() => {
    if (!inicioAtencion) {
      setTranscurrido(0);
      return;
    }
    const inicio = new Date(inicioAtencion).getTime();
    const tick = () => setTranscurrido(Math.max(0, Math.floor((Date.now() - inicio) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inicioAtencion]);

  const siguientesFiltrados = useMemo(() => {
    const lista = estado?.siguientes ?? [];
    const q = filtro.trim().toLowerCase();
    if (!q) {
      return lista;
    }
    return lista.filter(
      (item) =>
        item.codigo.toLowerCase().includes(q) ||
        (item.nombrePersona ?? '').toLowerCase().includes(q) ||
        (item.cedula ?? '').toLowerCase().includes(q),
    );
  }, [estado?.siguientes, filtro]);

  const accion = async (
    tipo: 'llamar' | 'atender' | 'ausente' | 'rellamar',
    turnoId?: number,
  ) => {
    if (!token || !ventanillaId || accionando) {
      return;
    }
    setAccionando(true);
    setError(null);
    try {
      const actual = estado?.actual;
      let data: VentanillaEstado;
      if (tipo === 'llamar') {
        data = await api.ventanillaLlamar(token, ventanillaId, turnoId);
      } else if (tipo === 'atender' && actual) {
        data = await api.ventanillaAtender(token, ventanillaId, actual.id);
      } else if (tipo === 'ausente' && actual) {
        data = await api.ventanillaAusente(token, ventanillaId, actual.id);
      } else if (tipo === 'rellamar' && actual) {
        data = await api.ventanillaRellamar(token, ventanillaId, actual.id);
      } else {
        return;
      }
      setEstado(data);
      setActualizado(new Date());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setAccionando(false);
    }
  };

  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  if (requiereSeleccion) {
    const libres = ventanillasResumen.filter((v) => v.estado !== 'Ocupada').length;
    return (
      <StaffShell
        title="Seleccione su ventanilla"
        subtitle="Elija una sola vez; quedará fija durante toda su sesión."
      >
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm">
            <Monitor className="h-4 w-4 text-brand" aria-hidden />
            {ventanillasResumen.length} ventanillas activas
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            {libres} disponibles
          </span>
          <button
            type="button"
            onClick={cargarVentanillas}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm transition hover:border-brand hover:text-brand"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Actualizar
          </button>
        </div>

        {ventanillasResumen.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-kiosk">
            <p className="text-lg font-bold text-ink">No hay ventanillas activas</p>
            <p className="mt-2 text-sm text-muted">
              Solicite al administrador que habilite una ventanilla para su sede.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {ventanillasResumen.map((v) => {
              const ocupada = v.estado === 'Ocupada';
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => seleccionarVentanilla(v.id)}
                  className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-kiosk transition hover:-translate-y-0.5 hover:border-brand hover:shadow-card"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand">
                      <Monitor className="h-6 w-6" aria-hidden />
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                        ocupada ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {ocupada ? 'Ocupada' : 'Libre'}
                    </span>
                  </div>

                  <p className="mt-4 text-xl font-black text-ink">{v.nombre}</p>
                  <p className="text-sm font-semibold text-muted">{v.codigo}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-2xl bg-canvas px-3 py-2 text-center">
                      <p className="text-lg font-black text-ink">{v.atendidos}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Atendidos
                      </p>
                    </div>
                    <div className="rounded-2xl bg-canvas px-3 py-2 text-center">
                      <p className="text-lg font-black text-ink">{v.ausentes}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        Ausentes
                      </p>
                    </div>
                  </div>

                  {ocupada ? (
                    <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
                      Atendiendo {v.turnoActual ?? 'un turno'} ·{' '}
                      {duracion(transcurridoDesde(v.fechaLlamado))}
                    </p>
                  ) : (
                    <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      Disponible para atender
                    </p>
                  )}

                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-brand">
                    <Lock className="h-4 w-4" aria-hidden />
                    Usar esta ventanilla
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p className="mt-5 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          Si elige una ventanilla ocupada, al ingresar verá el turno pendiente y podrá
          finalizarlo antes de atender a la siguiente persona.
        </p>
      </StaffShell>
    );
  }

  return (
    <StaffShell
      title="Ventanilla"
      subtitle={
        estado?.ventanilla
          ? `${estado.ventanilla} · atención de turnos SISBEN`
          : 'Atención de turnos SISBEN'
      }
      mostrarVentanilla
      actions={
        <>
          <button
            type="button"
            onClick={() => cargar(true)}
            disabled={!ventanillaId}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-70"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Actualizar
          </button>
          {actualizado && (
            <span className="text-xs font-semibold text-muted">
              Actualizado {actualizado.toLocaleTimeString('es-CO')}
            </span>
          )}
        </>
      }
    >
      {!ventanillaId ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-kiosk">
          <p className="text-lg font-bold text-ink">No tiene una ventanilla asignada</p>
          <p className="mt-2 text-sm text-muted">
            Solicite al administrador que habilite una ventanilla para su sede.
          </p>
        </div>
      ) : cargando && !estado ? (
        <Loading label="Cargando la cola…" />
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section>
              {estado?.actual ? (
                <div className="rounded-3xl bg-ink p-7 text-white shadow-card">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-black uppercase tracking-[0.25em] text-white/70">
                      En atención
                    </span>
                    <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-black tracking-wide">
                      {estado.actual.prioridadEtiqueta}
                    </span>
                  </div>

                  <p className="mt-4 text-7xl font-black leading-none tracking-tight md:text-8xl">
                    {estado.actual.codigo}
                  </p>

                  <p className="mt-4 text-lg font-bold">
                    {estado.actual.nombrePersona ?? 'Sin identificación'}
                  </p>
                  <p className="text-sm text-white/70">
                    {estado.actual.tipoDocumento && estado.actual.cedula
                      ? `${estado.actual.tipoDocumento} ${estado.actual.cedula}`
                      : 'Documento no registrado'}
                  </p>

                  <div className="mt-5 flex items-center gap-4 rounded-2xl bg-white/10 px-5 py-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                      <Timer className="h-6 w-6" aria-hidden />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                        Tiempo atendiendo
                      </p>
                      <p className="font-mono text-4xl font-black leading-none tabular-nums">
                        {duracion(transcurrido)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
                    <span>Llamado a las {hora(estado.actual.fechaLlamado)}</span>
                    <span>{estado.actual.llamados} llamado(s)</span>
                    <span>Creado a las {hora(estado.actual.fechaCreacion)}</span>
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => accion('atender')}
                      disabled={accionando}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-black text-white transition hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-70"
                    >
                      <CheckCircle2 className="h-5 w-5" aria-hidden />
                      Finalizar atención
                    </button>
                    <button
                      type="button"
                      onClick={() => accion('rellamar')}
                      disabled={accionando}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-black text-white transition hover:bg-amber-600 active:scale-[0.99] disabled:opacity-70"
                    >
                      <Megaphone className="h-5 w-5" aria-hidden />
                      Rellamar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarAusente(true)}
                      disabled={accionando}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 px-4 py-3.5 text-sm font-black text-white transition hover:bg-white/10 active:scale-[0.99] disabled:opacity-70"
                    >
                      <UserX className="h-5 w-5" aria-hidden />
                      No asistió
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center shadow-kiosk">
                  <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-light text-brand">
                    <Monitor className="h-10 w-10" aria-hidden />
                  </span>
                  <h2 className="mt-5 text-3xl font-black text-ink">Sin turno en atención</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                    Elija una persona de la cola para llamarla, o presione “Llamar siguiente”.
                    Los prioritarios pasan primero.
                  </p>
                  <button
                    type="button"
                    onClick={() => accion('llamar')}
                    disabled={accionando || (estado?.enEspera ?? 0) === 0}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-base font-black text-white shadow-lg transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60"
                  >
                    <Megaphone className="h-5 w-5" aria-hidden />
                    {accionando ? 'Llamando…' : 'Llamar siguiente'}
                  </button>
                  {(estado?.enEspera ?? 0) === 0 && (
                    <p className="mt-3 text-sm font-semibold text-muted">
                      No hay turnos en espera en este momento.
                    </p>
                  )}
                </div>
              )}
            </section>

            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                  icon={<Clock3 className="h-5 w-5" />}
                  label="En espera"
                  value={estado?.enEspera ?? 0}
                  tone="amber"
                />
                <StatCard
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  label="Atendidos hoy"
                  value={estado?.atendidosHoy ?? 0}
                  tone="emerald"
                />
                <StatCard
                  icon={<Megaphone className="h-5 w-5" />}
                  label="Llamados hoy"
                  value={estado?.llamadosHoy ?? 0}
                  tone="blue"
                />
                <StatCard
                  icon={<UserX className="h-5 w-5" />}
                  label="Ausentes hoy"
                  value={estado?.ausentesHoy ?? 0}
                  tone="red"
                />
              </div>

              <section className="rounded-3xl bg-white p-6 shadow-kiosk">
                <h2 className="flex items-center gap-2 text-lg font-black text-ink">
                  <Users className="h-5 w-5 text-brand" aria-hidden />
                  Cola por tipo
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { codigo: 'PR', nombre: 'Prioritarios', valor: estado?.prioritariosEnEspera ?? 0, prioridad: 1 },
                    { codigo: 'GN', nombre: 'Generales', valor: estado?.generalesEnEspera ?? 0, prioridad: 2 },
                    { codigo: 'JR', nombre: 'Jurídicos', valor: estado?.juridicosEnEspera ?? 0, prioridad: 3 },
                  ].map((item) => (
                    <div
                      key={item.codigo}
                      className="rounded-2xl border border-slate-100 bg-canvas p-3 text-center"
                    >
                      <span
                        className={`mx-auto flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-black ${
                          COLORES_TIPO[item.prioridad]
                        }`}
                      >
                        {item.codigo}
                      </span>
                      <p className="mt-2 text-2xl font-black text-ink">{item.valor}</p>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                        {item.nombre}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl bg-white p-6 shadow-kiosk">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-ink">Siguientes en la cola</h2>
                  <span className="text-xs font-bold text-muted">
                    {estado?.enEspera ?? 0} en espera
                  </span>
                </div>

                <label className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 focus-within:border-brand">
                  <Search className="h-4 w-4 text-muted" aria-hidden />
                  <span className="sr-only">Buscar en la cola</span>
                  <input
                    type="text"
                    value={filtro}
                    onChange={(event) => setFiltro(event.target.value)}
                    placeholder="Buscar por turno, nombre o documento"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                  />
                </label>

                <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {siguientesFiltrados.map((item, indice) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-black text-muted">
                          {indice + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-mono text-base font-black text-ink">{item.codigo}</p>
                          <p className="truncate text-xs font-semibold text-muted">
                            {item.nombrePersona ?? 'Sin identificación'}
                            {item.tipoDocumento && item.cedula
                              ? ` · ${item.tipoDocumento} ${item.cedula}`
                              : ''}
                          </p>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                            {item.prioridadEtiqueta} · Espera {espera(item.esperaMin)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => accion('llamar', item.id)}
                        disabled={accionando || Boolean(estado?.actual)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-black text-white transition hover:bg-brand-dark disabled:opacity-50"
                      >
                        <Megaphone className="h-4 w-4" aria-hidden />
                        Llamar
                      </button>
                    </div>
                  ))}

                  {(!estado || estado.siguientes.length === 0) && (
                    <p className="py-4 text-center text-sm text-muted">
                      No hay turnos en espera.
                    </p>
                  )}
                  {estado &&
                    estado.siguientes.length > 0 &&
                    siguientesFiltrados.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted">
                        Sin resultados para “{filtro}”.
                      </p>
                    )}
                </div>
              </section>
            </div>
          </div>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-kiosk">
            <h2 className="text-xl font-black text-ink">Historial de esta ventanilla</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-wide text-muted">
                    <th className="pb-3">Turno</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Persona</th>
                    <th className="pb-3">Creado</th>
                    <th className="pb-3">Llamado</th>
                    <th className="pb-3">Fin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estado?.recientes.map((turno) => (
                    <tr key={turno.id}>
                      <td className="py-3 font-mono font-black text-ink">{turno.codigo}</td>
                      <td className="py-3 font-semibold text-muted">
                        {turno.prioridadEtiqueta}
                      </td>
                      <td className="py-3">
                        <EstadoBadge estado={turno.estado} />
                      </td>
                      <td className="py-3 font-semibold text-ink">
                        {turno.nombrePersona ?? 'Sin identificación'}
                      </td>
                      <td className="py-3 text-muted">{hora(turno.fechaCreacion)}</td>
                      <td className="py-3 text-muted">{hora(turno.fechaLlamado)}</td>
                      <td className="py-3 text-muted">{hora(turno.fechaSalida)}</td>
                    </tr>
                  ))}
                  {(!estado || estado.recientes.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted">
                        Todavía no hay turnos atendidos en esta ventanilla.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Modal
        open={confirmarAusente}
        tone="error"
        title="¿Marcar el turno como ausente?"
        message={
          estado?.actual
            ? `El turno ${estado.actual.codigo} pasará a ausente y no se podrá atender después.`
            : undefined
        }
        actionLabel="Sí, marcar ausente"
        onAction={() => accion('ausente')}
        onClose={() => setConfirmarAusente(false)}
      />

      <Modal
        open={Boolean(error)}
        tone="error"
        title="No se pudo completar la acción"
        message={error ?? undefined}
        actionLabel="Entendido"
        onClose={() => setError(null)}
      />
    </StaffShell>
  );
}
