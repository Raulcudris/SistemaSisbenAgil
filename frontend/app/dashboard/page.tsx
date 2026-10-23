'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Monitor,
  RefreshCw,
  Timer,
  Tv,
  UserX,
  Users,
} from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useAuthGuard } from '@/lib/use-auth-guard';
import type { DashboardResumen, HoraResumen, Rol } from '@/lib/types';
import { EstadoBadge } from '@/components/EstadoBadge';
import { Loading } from '@/components/Loading';
import { StaffShell } from '@/components/StaffShell';
import { StatCard } from '@/components/StatCard';

const ROLES_ADMIN: Rol[] = ['ADMIN'];

const COLORES_TIPO: Record<string, string> = {
  PR: 'bg-brand text-white',
  GN: 'bg-slate-800 text-white',
  JR: 'bg-amber-500 text-white',
};

function fechaLocal(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hora(iso?: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function minutos(valor: number): string {
  return `${valor.toFixed(1)} min`;
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

function altura(valor: number, maximo: number): number {
  if (valor <= 0) {
    return 2;
  }
  return Math.max(6, Math.round((valor / maximo) * 100));
}

function GraficoHoras({ datos }: { datos: HoraResumen[] }) {
  const maximo = Math.max(1, ...datos.map((d) => Math.max(d.creados, d.atendidos)));

  return (
    <div className="mt-6">
      <div className="flex h-48 items-end gap-1">
        {datos.map((d) => (
          <div key={d.hora} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-40 w-full items-end justify-center gap-0.5">
              <span
                title={`${d.creados} creados`}
                className="w-2.5 rounded-t bg-slate-300"
                style={{ height: `${altura(d.creados, maximo)}%` }}
              />
              <span
                title={`${d.atendidos} atendidos`}
                className="w-2.5 rounded-t bg-brand"
                style={{ height: `${altura(d.atendidos, maximo)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-muted">
              {d.hora % 2 === 0 ? d.hora : ''}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs font-bold text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden /> Creados
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden /> Atendidos
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const listo = useAuthGuard(ROLES_ADMIN);
  const { token, cerrarSesion } = useAuth();

  const [fecha, setFecha] = useState(() => fechaLocal());
  const [resumen, setResumen] = useState<DashboardResumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  // Refresca el reloj de atención de las ventanillas ocupadas cada segundo.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!token) {
        return;
      }
      if (silencioso) {
        setRefrescando(true);
      } else {
        setCargando(true);
      }
      try {
        const data = await api.dashboard(token, fecha || undefined);
        setResumen(data);
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
        setRefrescando(false);
      }
    },
    [token, fecha, cerrarSesion, router],
  );

  useEffect(() => {
    if (!listo) {
      return;
    }
    cargar();
    const id = setInterval(() => cargar(true), 10000);
    return () => clearInterval(id);
  }, [listo, cargar]);

  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  return (
    <StaffShell
      title="Dashboard"
      subtitle="Operación de turnos SISBEN en tiempo real"
      actions={
        <>
          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Tv className="h-4 w-4" aria-hidden />
            Pantalla TV
          </a>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm">
            <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
            <span className="sr-only">Fecha</span>
            <input
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              className="bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => cargar(true)}
            disabled={refrescando}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-70"
          >
            <RefreshCw className={refrescando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
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
      {cargando && !resumen ? (
        <Loading label="Cargando indicadores…" />
      ) : error && !resumen ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-kiosk">
          <p className="text-lg font-bold text-ink">No se pudo cargar el dashboard</p>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button
            type="button"
            onClick={() => cargar()}
            className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
          >
            Reintentar
          </button>
        </div>
      ) : resumen ? (
        <>
          {error && (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-brand">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={<Activity className="h-5 w-5" />}
              label="Turnos del día"
              value={resumen.total}
              detail={`${resumen.llamados} llamados`}
              tone="slate"
            />
            <StatCard
              icon={<Clock3 className="h-5 w-5" />}
              label="En espera"
              value={resumen.enEspera}
              detail="Pendientes por llamar"
              tone="amber"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Atendidos"
              value={resumen.atendidos}
              detail="Cerrados en ventanilla"
              tone="emerald"
            />
            <StatCard
              icon={<UserX className="h-5 w-5" />}
              label="Ausentes"
              value={resumen.ausentes}
              detail={`${resumen.cancelados} cancelados`}
              tone="red"
            />
            <StatCard
              icon={<Timer className="h-5 w-5" />}
              label="Espera promedio"
              value={minutos(resumen.esperaPromedioMin)}
              detail="Desde la creación hasta el llamado"
              tone="blue"
            />
            <StatCard
              icon={<Timer className="h-5 w-5" />}
              label="Atención promedio"
              value={minutos(resumen.atencionPromedioMin)}
              detail="Desde el llamado hasta el cierre"
              tone="brand"
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <section className="rounded-3xl bg-white p-6 shadow-kiosk">
              <h2 className="text-xl font-black text-ink">Flujo por hora</h2>
              <p className="mt-1 text-sm text-muted">Turnos creados y atendidos entre 6:00 y 20:00.</p>
              <GraficoHoras datos={resumen.porHora} />
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-kiosk">
              <h2 className="text-xl font-black text-ink">Cola por tipo</h2>
              <p className="mt-1 text-sm text-muted">Prioritarios, generales y jurídicos.</p>
              <div className="mt-5 space-y-3">
                {resumen.colas.map((cola) => (
                  <div
                    key={cola.codigo}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-canvas px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${
                          COLORES_TIPO[cola.codigo] ?? 'bg-slate-800 text-white'
                        }`}
                      >
                        {cola.codigo}
                      </span>
                      <div>
                        <p className="text-sm font-black text-ink">{cola.nombre}</p>
                        <p className="text-xs font-semibold text-muted">
                          {cola.atendidos} atendidos hoy
                        </p>
                      </div>
                    </div>
                    <p className="text-3xl font-black text-ink">{cola.enEspera}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-kiosk">
            <h2 className="flex items-center gap-2 text-xl font-black text-ink">
              <Monitor className="h-5 w-5 text-brand" aria-hidden />
              Ventanillas
            </h2>
            <p className="mt-1 text-sm text-muted">
              {resumen.ventanillas.filter((v) => v.estado !== 'Ocupada').length} libres ·{' '}
              {resumen.ventanillas.filter((v) => v.estado === 'Ocupada').length} ocupadas
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-wide text-muted">
                    <th className="pb-3">Ventanilla</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Turno</th>
                    <th className="pb-3 text-right">Atendidos</th>
                    <th className="pb-3 text-right">Ausentes</th>
                    <th className="pb-3 text-right">Prom. atención</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.ventanillas.map((ventanilla) => (
                    <tr key={ventanilla.id}>
                      <td className="py-3 font-bold text-ink">{ventanilla.nombre}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                            ventanilla.estado === 'Ocupada'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {ventanilla.estado}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-ink">
                        {ventanilla.turnoActual ?? '—'}
                        {ventanilla.turnoActual && ventanilla.fechaLlamado && (
                          <span className="ml-2 font-sans text-xs font-semibold text-muted">
                            {duracion(transcurridoDesde(ventanilla.fechaLlamado))}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-bold text-ink">{ventanilla.atendidos}</td>
                      <td className="py-3 text-right font-bold text-ink">{ventanilla.ausentes}</td>
                      <td className="py-3 text-right font-bold text-ink">
                        {minutos(ventanilla.atencionPromedioMin)}
                      </td>
                    </tr>
                  ))}
                  {resumen.ventanillas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted">
                        No hay ventanillas activas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-kiosk">
            <h2 className="flex items-center gap-2 text-xl font-black text-ink">
              <Users className="h-5 w-5 text-brand" aria-hidden />
              Turnos recientes
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-wide text-muted">
                    <th className="pb-3">Turno</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Persona</th>
                    <th className="pb-3">Documento</th>
                    <th className="pb-3">Ventanilla</th>
                    <th className="pb-3">Creado</th>
                    <th className="pb-3">Fin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resumen.recientes.map((turno) => (
                    <tr key={turno.id}>
                      <td className="py-3 font-mono font-black text-ink">{turno.codigo}</td>
                      <td className="py-3 font-semibold text-muted">{turno.tipoEtiqueta}</td>
                      <td className="py-3">
                        <EstadoBadge estado={turno.estado} />
                      </td>
                      <td className="py-3 font-semibold text-ink">
                        {turno.nombrePersona ?? 'Sin identificación'}
                      </td>
                      <td className="py-3 text-muted">{turno.cedula ?? '—'}</td>
                      <td className="py-3 text-muted">{turno.ventanilla ?? '—'}</td>
                      <td className="py-3 text-muted">{hora(turno.fechaCreacion)}</td>
                      <td className="py-3 text-muted">{hora(turno.fechaSalida)}</td>
                    </tr>
                  ))}
                  {resumen.recientes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-muted">
                        Todavía no hay turnos para esta fecha.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </StaffShell>
  );
}
