'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Download,
  Monitor,
  RefreshCw,
  Search,
  Timer,
} from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ROLES_ADMIN } from '@/lib/roles';
import { useAuthGuard } from '@/lib/use-auth-guard';
import type { AtencionDetalle, AtencionesPage, VentanillaAdmin } from '@/lib/types';
import { Loading } from '@/components/Loading';
import { StaffShell } from '@/components/StaffShell';
import { StatCard } from '@/components/StatCard';

const TAMANO_PAGINA = 25;
const FECHA_MINIMA = '2000-01-01';

const INPUT =
  'w-full rounded-2xl border border-slate-200 bg-canvas px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:bg-white';

const TIPO_ESTILO: Record<string, string> = {
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

function sumarDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fechaLocal(fecha);
}

function inicioMes(): string {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`;
}

function fechaHora(iso?: string | null): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function duracion(a: AtencionDetalle): string {
  if (!a.fechaLlamado || !a.fechaSalida) {
    return '—';
  }
  return a.duracionMinutos > 0 ? `${a.duracionMinutos} min` : '< 1 min';
}

function rangoTexto(desde: string, hasta: string): string {
  if (desde === FECHA_MINIMA) {
    return `Todo el historial (hasta ${hasta})`;
  }
  return desde === hasta ? desde : `${desde} a ${hasta}`;
}

function sufijoArchivo(desde: string, hasta: string): string {
  if (desde === FECHA_MINIMA) {
    return `historico-${hasta}`;
  }
  return desde === hasta ? desde : `${desde}_${hasta}`;
}

export default function AtencionesRealizadasPage() {
  const router = useRouter();
  const listo = useAuthGuard(ROLES_ADMIN);
  const { token, cerrarSesion } = useAuth();

  const hoy = fechaLocal();
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [ventanillaId, setVentanillaId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [pagina, setPagina] = useState(0);
  const [datos, setDatos] = useState<AtencionesPage | null>(null);
  const [ventanillas, setVentanillas] = useState<VentanillaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const solicitud = useRef(0);

  const manejarError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    },
    [cerrarSesion, router],
  );

  useEffect(() => {
    if (!listo || !token) {
      return;
    }
    let activo = true;
    api
      .adminVentanillas(token)
      .then((data) => {
        if (activo) {
          setVentanillas(data);
        }
      })
      .catch((e) => {
        if (activo) {
          manejarError(e);
        }
      });
    return () => {
      activo = false;
    };
  }, [listo, token, manejarError]);

  const cargar = useCallback(async () => {
    if (!token) {
      return;
    }
    const id = ++solicitud.current;
    setCargando(true);
    setError(null);
    try {
      const data = await api.adminAtenciones(token, {
        fechaInicio,
        fechaFin,
        ventanillaId: ventanillaId ? Number(ventanillaId) : null,
        q: busquedaAplicada,
        page: pagina,
        size: TAMANO_PAGINA,
      });
      if (id !== solicitud.current) {
        return;
      }
      setDatos(data);
    } catch (e) {
      if (id !== solicitud.current) {
        return;
      }
      manejarError(e);
    } finally {
      if (id === solicitud.current) {
        setCargando(false);
      }
    }
  }, [
    token,
    fechaInicio,
    fechaFin,
    ventanillaId,
    busquedaAplicada,
    pagina,
    manejarError,
  ]);

  useEffect(() => {
    if (listo && token) {
      cargar();
    }
  }, [listo, token, cargar]);

  const aplicarBusqueda = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusquedaAplicada(busqueda.trim());
    setPagina(0);
    setMensaje(null);
  };

  const limpiar = () => {
    setFechaInicio(hoy);
    setFechaFin(hoy);
    setVentanillaId('');
    setBusqueda('');
    setBusquedaAplicada('');
    setPagina(0);
    setMensaje(null);
  };

  const aplicarRango = (inicio: string) => {
    setFechaInicio(inicio);
    setFechaFin(hoy);
    setPagina(0);
    setMensaje(null);
  };

  const rangosRapidos = [
    { etiqueta: 'Hoy', inicio: hoy },
    { etiqueta: '7 días', inicio: sumarDias(-6) },
    { etiqueta: 'Este mes', inicio: inicioMes() },
    { etiqueta: 'Todo', inicio: FECHA_MINIMA },
  ];

  const exportar = async () => {
    if (!token || exportando || !datos || datos.total === 0) {
      return;
    }
    setExportando(true);
    setError(null);
    setMensaje(null);
    try {
      const blob = await api.adminExportarAtenciones(token, {
        fechaInicio,
        fechaFin,
        ventanillaId: ventanillaId ? Number(ventanillaId) : null,
        q: busquedaAplicada,
      });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `atenciones-sisben-${sufijoArchivo(fechaInicio, fechaFin)}.csv`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMensaje(
        `Se exportaron ${datos.total} atenciones del rango ${rangoTexto(
          datos.fechaInicio,
          datos.fechaFin,
        )}.`,
      );
    } catch (e) {
      manejarError(e);
    } finally {
      setExportando(false);
    }
  };

  const inicioFila = datos && datos.total > 0 ? datos.page * datos.size + 1 : 0;
  const finFila = datos ? Math.min((datos.page + 1) * datos.size, datos.total) : 0;
  const hayFiltros =
    fechaInicio !== hoy ||
    fechaFin !== hoy ||
    ventanillaId !== '' ||
    busquedaAplicada !== '';

  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  return (
    <StaffShell
      title="Atenciones realizadas"
      subtitle="Consulta las personas atendidas, la ventanilla y el funcionario que realizó cada atención"
      actions={
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={exportar}
            disabled={!datos || datos.total === 0 || cargando || exportando}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-70"
          >
            <Download className="h-4 w-4" aria-hidden />
            {exportando ? 'Exportando…' : 'Exportar CSV'}
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

      <section className="rounded-3xl bg-white p-5 shadow-kiosk">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-ink">Filtros</h2>
            <p className="mt-1 text-sm text-muted">
              Solo se muestran atenciones finalizadas. La exportación incluye todos los
              registros que cumplan los filtros, no únicamente esta página.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-full border border-slate-200 bg-canvas p-1">
              {rangosRapidos.map((rango) => {
                const activo = fechaInicio === rango.inicio && fechaFin === hoy;
                return (
                  <button
                    key={rango.etiqueta}
                    type="button"
                    onClick={() => aplicarRango(rango.inicio)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      activo
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-muted hover:bg-white hover:text-brand'
                    }`}
                  >
                    {rango.etiqueta}
                  </button>
                );
              })}
            </div>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiar}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <form onSubmit={aplicarBusqueda} className="mt-4 grid gap-3 lg:grid-cols-12">
          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              Desde
            </span>
            <span className="inline-flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-canvas px-3 py-3 focus-within:border-brand focus-within:bg-white">
              <CalendarDays className="h-4 w-4 shrink-0 text-brand" aria-hidden />
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
                  setPagina(0);
                  setMensaje(null);
                }}
                className="w-full bg-transparent text-sm font-bold text-ink outline-none"
              />
            </span>
          </label>

          <label className="lg:col-span-2">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              Hasta
            </span>
            <span className="inline-flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-canvas px-3 py-3 focus-within:border-brand focus-within:bg-white">
              <CalendarDays className="h-4 w-4 shrink-0 text-brand" aria-hidden />
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
                  setPagina(0);
                  setMensaje(null);
                }}
                className="w-full bg-transparent text-sm font-bold text-ink outline-none"
              />
            </span>
          </label>

          <label className="lg:col-span-3">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              Ventanilla
            </span>
            <select
              value={ventanillaId}
              onChange={(event) => {
                setVentanillaId(event.target.value);
                setPagina(0);
                setMensaje(null);
              }}
              className={INPUT}
            >
              <option value="">Todas las ventanillas</option>
              {ventanillas.map((ventanilla) => (
                <option key={ventanilla.id} value={ventanilla.id}>
                  {ventanilla.codigo} · {ventanilla.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-3">
            <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.16em] text-muted">
              Buscar
            </span>
            <span className="inline-flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-canvas px-3 py-3 focus-within:border-brand focus-within:bg-white">
              <Search className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Nombre, cédula, turno o ventanilla"
                className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
              />
            </span>
          </label>

          <div className="flex items-end gap-2 lg:col-span-2">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              <Search className="h-4 w-4" aria-hidden />
              Buscar
            </button>
          </div>
        </form>
      </section>

      {cargando && !datos ? (
        <div className="mt-6 flex min-h-[40vh] items-center justify-center rounded-3xl bg-white shadow-kiosk">
          <Loading label="Cargando atenciones…" />
        </div>
      ) : !datos ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-kiosk">
          <p className="text-lg font-bold text-ink">No se pudo cargar la información.</p>
          <p className="mt-1 text-sm text-muted">Pulse Actualizar para intentarlo de nuevo.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<ClipboardList className="h-5 w-5" aria-hidden />}
              label="Atenciones"
              value={datos.total}
              detail={rangoTexto(datos.fechaInicio, datos.fechaFin)}
              tone="brand"
            />
            <StatCard
              icon={<Monitor className="h-5 w-5" aria-hidden />}
              label="Ventanillas"
              value={datos.totalVentanillas}
              detail="Con atenciones en el rango"
              tone="blue"
            />
            <StatCard
              icon={<Timer className="h-5 w-5" aria-hidden />}
              label="Promedio atención"
              value={
                datos.duracionPromedioMin > 0
                  ? `${datos.duracionPromedioMin.toFixed(1)} min`
                  : datos.total > 0
                    ? '< 1 min'
                    : '—'
              }
              detail="Desde el llamado hasta finalizar"
              tone="emerald"
            />
          </div>

          <section className="mt-6 rounded-3xl bg-white p-6 shadow-kiosk">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-ink">Detalle de atenciones</h2>
                <p className="mt-1 text-sm text-muted">
                  Personas atendidas, ventanilla, funcionario y tiempos de atención.
                </p>
              </div>
              <p className="rounded-full bg-canvas px-4 py-2 text-sm font-bold text-muted">
                {datos.total} {datos.total === 1 ? 'atención' : 'atenciones'}
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead>
                  <tr className="text-xs font-black uppercase tracking-wide text-muted">
                    <th className="pb-3">Turno</th>
                    <th className="pb-3">Persona atendida</th>
                    <th className="pb-3">Ventanilla</th>
                    <th className="pb-3">Atendió</th>
                    <th className="pb-3">Kiosco</th>
                    <th className="pb-3">Llamado</th>
                    <th className="pb-3">Finalizado</th>
                    <th className="pb-3 text-right">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {datos.items.map((atencion) => {
                    const documento = [atencion.tipoDocumento, atencion.cedula]
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <tr key={atencion.turnoId} className="align-top">
                        <td className="py-3 pr-4">
                          <p className="font-mono text-base font-black text-brand-dark">
                            {atencion.codigo}
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                              TIPO_ESTILO[atencion.tipo] ?? 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {atencion.tipoEtiqueta}
                          </span>
                          {atencion.motivoPrioridad && (
                            <p className="mt-1 text-xs font-semibold text-amber-700">
                              {atencion.motivoPrioridad}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-bold text-ink">
                            {atencion.nombrePersona ?? 'Sin persona registrada'}
                          </p>
                          <p className="text-xs font-semibold text-muted">
                            {documento || 'Sin documento'}
                          </p>
                          {atencion.telefono && (
                            <p className="text-xs font-semibold text-muted">
                              Tel. {atencion.telefono}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-bold text-ink">
                            {atencion.ventanillaNombre ?? 'Sin ventanilla'}
                          </p>
                          <p className="text-xs font-semibold text-brand">
                            {atencion.ventanillaCodigo ?? '—'}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-bold text-ink">
                            {atencion.atendidoPorNombre ?? 'Sin funcionario'}
                          </p>
                          <p className="text-xs font-semibold text-muted">
                            {atencion.atendidoPorUsername
                              ? `@${atencion.atendidoPorUsername}`
                              : '—'}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <p className="font-semibold text-ink">
                            {atencion.creadoPorNombre ?? '—'}
                          </p>
                          <p className="text-xs font-semibold text-muted">
                            {atencion.creadoPorUsername
                              ? `@${atencion.creadoPorUsername}`
                              : 'Sin operador'}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold text-muted">
                          {fechaHora(atencion.fechaLlamado)}
                        </td>
                        <td className="py-3 pr-4 text-xs font-semibold text-muted">
                          {fechaHora(atencion.fechaSalida)}
                        </td>
                        <td className="py-3 text-right text-sm font-bold text-ink">
                          {duracion(atencion)}
                        </td>
                      </tr>
                    );
                  })}
                  {datos.items.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center">
                        <p className="text-lg font-bold text-ink">
                          No hay atenciones para estos filtros.
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          Pruebe con otro rango de fechas, otra ventanilla o limpie la
                          búsqueda.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-muted">
                {datos.total > 0
                  ? `Mostrando ${inicioFila}–${finFila} de ${datos.total} atenciones`
                  : 'Sin atenciones para mostrar'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((actual) => Math.max(0, actual - 1))}
                  disabled={cargando || datos.page <= 0}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm font-bold text-ink">
                  Página {datos.totalPaginas === 0 ? 0 : datos.page + 1} de{' '}
                  {datos.totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPagina((actual) => actual + 1)}
                  disabled={cargando || datos.page + 1 >= datos.totalPaginas}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </StaffShell>
  );
}
