'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Monitor,
  RefreshCw,
  Ticket,
  UserX,
  Users,
  XCircle,
} from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ROLES_ADMIN } from '@/lib/roles';
import { useAuthGuard } from '@/lib/use-auth-guard';
import type { ReporteDia } from '@/lib/types';
import { Loading } from '@/components/Loading';
import { StaffShell } from '@/components/StaffShell';
import { StatCard } from '@/components/StatCard';

function fechaLocal(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function celda(valor: string | number): string {
  return `"${String(valor).replace(/"/g, '""')}"`;
}

function minutos(valor: number, atendidos: number): string {
  if (atendidos <= 0) {
    return '—';
  }
  return valor > 0 ? `${valor.toFixed(1)} min` : '< 1 min';
}

export default function ReportesPage() {
  const router = useRouter();
  const listo = useAuthGuard(ROLES_ADMIN);
  const { token, cerrarSesion } = useAuth();

  const hoy = fechaLocal();
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [reporte, setReporte] = useState<ReporteDia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const solicitud = useRef(0);

  const cargar = useCallback(async () => {
    if (!token) {
      return;
    }
    const id = ++solicitud.current;
    setCargando(true);
    setError(null);
    try {
      const data = await api.adminReportes(token, fechaInicio, fechaFin);
      if (id !== solicitud.current) {
        return;
      }
      setReporte(data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      if (id !== solicitud.current) {
        return;
      }
      setError(mensajeError(e));
    } finally {
      if (id === solicitud.current) {
        setCargando(false);
      }
    }
  }, [token, fechaInicio, fechaFin, cerrarSesion, router]);

  useEffect(() => {
    if (listo && token) {
      cargar();
    }
  }, [listo, token, cargar]);

  const exportarCsv = () => {
    if (!reporte) {
      return;
    }
    const filas: string[][] = [];
    filas.push(['Reporte SISBÉN']);
    filas.push(['Desde', reporte.fechaInicio]);
    filas.push(['Hasta', reporte.fechaFin]);
    filas.push([]);
    filas.push(['Totales']);
    filas.push([
      'Turnos generados',
      'En espera',
      'Llamados sin finalizar',
      'Atendidos',
      'Ausentes',
      'Cancelados',
    ]);
    filas.push([
      reporte.totales.total,
      reporte.totales.enEspera,
      reporte.totales.llamados,
      reporte.totales.atendidos,
      reporte.totales.ausentes,
      reporte.totales.cancelados,
    ].map(String));
    filas.push([]);
    filas.push(['Por ventanilla']);
    filas.push([
      'Código',
      'Ventanilla',
      'Activa',
      'Llamados',
      'Atendidos',
      'Ausentes',
      'Atención promedio (min)',
    ]);
    reporte.porVentanilla.forEach((ventanilla) => {
      filas.push([
        ventanilla.codigo,
        ventanilla.nombre,
        ventanilla.activa ? 'Sí' : 'No',
        String(ventanilla.llamados),
        String(ventanilla.atendidos),
        String(ventanilla.ausentes),
        ventanilla.atendidos > 0 ? ventanilla.atencionPromedioMin.toFixed(1) : '',
      ]);
    });
    filas.push([]);
    filas.push(['Por kiosco']);
    filas.push([
      'Usuario',
      'Operador',
      'Activo',
      'Generados',
      'En espera',
      'Llamados sin finalizar',
      'Atendidos',
      'Ausentes',
      'Cancelados',
    ]);
    reporte.porKiosco.forEach((kiosco) => {
      filas.push([
        kiosco.username,
        kiosco.nombre,
        kiosco.usuarioId ? (kiosco.activo ? 'Sí' : 'No') : 'Histórico',
        String(kiosco.generados),
        String(kiosco.enEspera),
        String(kiosco.enAtencion),
        String(kiosco.atendidos),
        String(kiosco.ausentes),
        String(kiosco.cancelados),
      ]);
    });

    const csv = filas.map((fila) => fila.map(celda).join(';')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    const sufijo =
      reporte.fechaInicio === reporte.fechaFin
        ? reporte.fechaInicio
        : `${reporte.fechaInicio}_${reporte.fechaFin}`;
    enlace.href = url;
    enlace.download = `reporte-sisben-${sufijo}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMensaje(
      `Reporte de ${reporte.fechaInicio} a ${reporte.fechaFin} descargado en CSV.`,
    );
  };

  const rangoTexto = reporte
    ? reporte.fechaInicio === reporte.fechaFin
      ? reporte.fechaInicio
      : `${reporte.fechaInicio} a ${reporte.fechaFin}`
    : '';

  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  return (
    <StaffShell
      title="Reportes por rango"
      subtitle="Atenciones y turnos por ventanilla y operador de kiosco"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-muted shadow-sm">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <span className="text-[10px] uppercase tracking-wide">Desde</span>
            <input
              type="date"
              value={fechaInicio}
              max={hoy}
              onChange={(event) => {
                const valor = event.target.value || hoy;
                setFechaInicio(valor);
                if (valor > fechaFin) {
                  setFechaFin(valor);
                }
                setMensaje(null);
              }}
              className="bg-transparent text-sm font-bold text-ink outline-none"
            />
          </label>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-muted shadow-sm">
            <CalendarDays className="h-4 w-4" aria-hidden />
            <span className="text-[10px] uppercase tracking-wide">Hasta</span>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio}
              max={hoy}
              onChange={(event) => {
                const valor = event.target.value || hoy;
                setFechaFin(valor);
                if (valor < fechaInicio) {
                  setFechaInicio(valor);
                }
                setMensaje(null);
              }}
              className="bg-transparent text-sm font-bold text-ink outline-none"
            />
          </label>
          <button
            type="button"
            onClick={cargar}
            disabled={cargando}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-70"
          >
            <RefreshCw className={cargando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
            Actualizar
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            disabled={!reporte || cargando}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-70"
          >
            <Download className="h-4 w-4" aria-hidden />
            CSV
          </button>
        </div>
      }
    >
      {mensaje && (
        <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {mensaje}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-brand">
          {error}
        </p>
      )}

      {cargando && !reporte ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-3xl bg-white shadow-kiosk">
          <Loading label="Cargando reporte…" />
        </div>
      ) : !reporte ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-kiosk">
          <p className="text-lg font-bold text-ink">No hay información para mostrar.</p>
          <p className="mt-1 text-sm text-muted">Seleccione otro rango o actualice el reporte.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              icon={<Ticket className="h-5 w-5" aria-hidden />}
              label="Turnos generados"
              value={reporte.totales.total}
              detail={rangoTexto}
              tone="brand"
            />
            <StatCard
              icon={<Clock3 className="h-5 w-5" aria-hidden />}
              label="En espera"
              value={reporte.totales.enEspera}
              detail="Pendientes de llamar"
              tone="amber"
            />
            <StatCard
              icon={<Users className="h-5 w-5" aria-hidden />}
              label="Llamados"
              value={reporte.totales.llamados}
              detail="Sin finalizar"
              tone="blue"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
              label="Atendidos"
              value={reporte.totales.atendidos}
              detail="Atenciones finalizadas"
              tone="emerald"
            />
            <StatCard
              icon={<UserX className="h-5 w-5" aria-hidden />}
              label="Ausentes"
              value={reporte.totales.ausentes}
              detail="No se presentaron"
              tone="red"
            />
            <StatCard
              icon={<XCircle className="h-5 w-5" aria-hidden />}
              label="Cancelados"
              value={reporte.totales.cancelados}
              detail="Turnos anulados"
              tone="slate"
            />
          </div>

          <div className="mt-6 grid gap-6">
            <section className="rounded-3xl bg-white p-6 shadow-kiosk">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black text-ink">
                    <Monitor className="h-5 w-5 text-brand" aria-hidden />
                    Por ventanilla
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Turnos llamados, atendidos y ausentes en cada ventanilla durante el
                    rango seleccionado. «Llamados» acumula todos los turnos que pasaron
                    por la ventanilla.
                  </p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-black uppercase tracking-wide text-muted">
                      <th className="pb-3">Ventanilla</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3 text-right">Llamados</th>
                      <th className="pb-3 text-right">Atendidos</th>
                      <th className="pb-3 text-right">Ausentes</th>
                      <th className="pb-3 text-right">Prom. atención</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reporte.porVentanilla.map((ventanilla) => (
                      <tr key={ventanilla.id}>
                        <td className="py-3">
                          <p className="font-bold text-ink">
                            <span className="mr-2 font-mono text-brand-dark">
                              {ventanilla.codigo}
                            </span>
                            {ventanilla.nombre}
                          </p>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              ventanilla.activa
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {ventanilla.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-ink">
                          {ventanilla.llamados}
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-700">
                          {ventanilla.atendidos}
                        </td>
                        <td className="py-3 text-right font-bold text-brand">
                          {ventanilla.ausentes}
                        </td>
                        <td className="py-3 text-right font-semibold text-muted">
                          {minutos(ventanilla.atencionPromedioMin, ventanilla.atendidos)}
                        </td>
                      </tr>
                    ))}
                    {reporte.porVentanilla.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted">
                          No hay ventanillas registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-kiosk">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-ink">
                  <Users className="h-5 w-5 text-brand" aria-hidden />
                  Por kiosco
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Turnos generados por cada operador durante el rango seleccionado.
                </p>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead>
                    <tr className="text-xs font-black uppercase tracking-wide text-muted">
                      <th className="pb-3">Operador</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3 text-right">Generados</th>
                      <th className="pb-3 text-right">En espera</th>
                      <th className="pb-3 text-right">Llamados</th>
                      <th className="pb-3 text-right">Atendidos</th>
                      <th className="pb-3 text-right">Ausentes</th>
                      <th className="pb-3 text-right">Cancelados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reporte.porKiosco.map((kiosco, indice) => (
                      <tr key={`${kiosco.usuarioId ?? 'sin'}-${indice}`}>
                        <td className="py-3">
                          <p className="font-bold text-ink">{kiosco.nombre}</p>
                          <p className="text-xs font-semibold text-muted">
                            {kiosco.usuarioId ? kiosco.username : 'Sin usuario'}
                          </p>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              !kiosco.usuarioId
                                ? 'bg-slate-100 text-slate-500'
                                : kiosco.activo
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {!kiosco.usuarioId
                              ? 'Histórico'
                              : kiosco.activo
                                ? 'Activo'
                                : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 text-right text-base font-black text-brand-dark">
                          {kiosco.generados}
                        </td>
                        <td className="py-3 text-right font-bold text-amber-700">
                          {kiosco.enEspera}
                        </td>
                        <td className="py-3 text-right font-bold text-sky-700">
                          {kiosco.enAtencion}
                        </td>
                        <td className="py-3 text-right font-bold text-emerald-700">
                          {kiosco.atendidos}
                        </td>
                        <td className="py-3 text-right font-bold text-brand">
                          {kiosco.ausentes}
                        </td>
                        <td className="py-3 text-right font-semibold text-muted">
                          {kiosco.cancelados}
                        </td>
                      </tr>
                    ))}
                    {reporte.porKiosco.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-muted">
                          No hay turnos generados en este rango.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs font-medium text-muted">
                Los turnos creados antes de habilitar el acceso de kiosco aparecen como
                «Sin operador (histórico)».
              </p>
            </section>
          </div>
        </>
      )}
    </StaffShell>
  );
}
