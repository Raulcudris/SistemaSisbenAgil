'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { DoorOpen, Monitor, RefreshCw } from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ROLES_ADMIN } from '@/lib/roles';
import { useAuthGuard } from '@/lib/use-auth-guard';
import type { VentanillaAdmin } from '@/lib/types';
import { Loading } from '@/components/Loading';
import { StaffShell } from '@/components/StaffShell';

const INPUT =
  'w-full rounded-2xl border border-slate-200 bg-canvas px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:bg-white';

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}

export default function VentanillasAdminPage() {
  const router = useRouter();
  const listo = useAuthGuard(ROLES_ADMIN);
  const { token, cerrarSesion } = useAuth();

  const [ventanillas, setVentanillas] = useState<VentanillaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [creando, setCreando] = useState(false);
  const [accionando, setAccionando] = useState<number | null>(null);

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
        const data = await api.adminVentanillas(token);
        setVentanillas(data);
        if (!silencioso) {
          setError(null);
        }
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
    [token, cerrarSesion, router],
  );

  useEffect(() => {
    if (!listo || !token) {
      return;
    }
    cargar();
    const id = setInterval(() => cargar(true), 10000);
    return () => clearInterval(id);
  }, [listo, token, cargar]);

  const crear = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      return;
    }
    if (!codigo.trim() || !nombre.trim()) {
      setError('Escriba el código y el nombre de la ventanilla.');
      return;
    }
    setCreando(true);
    setError(null);
    setMensaje(null);
    try {
      const nueva = await api.adminCrearVentanilla(token, {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
      });
      setVentanillas((prev) =>
        [...prev, nueva].sort((a, b) => a.codigo.localeCompare(b.codigo, 'es')),
      );
      setCodigo('');
      setNombre('');
      setMensaje(`Ventanilla ${nueva.codigo} creada correctamente.`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setCreando(false);
    }
  };

  const alternar = async (ventanilla: VentanillaAdmin) => {
    if (!token) {
      return;
    }
    if (ventanilla.activa && ventanilla.estado === 'Ocupada') {
      setError('Finalice el turno en atención antes de desactivar esta ventanilla.');
      return;
    }
    if (
      ventanilla.activa &&
      !window.confirm(
        `¿Desactivar ${ventanilla.nombre}? Los asesores no podrán atender en ella hasta que la reactive.`,
      )
    ) {
      return;
    }
    setAccionando(ventanilla.id);
    setError(null);
    setMensaje(null);
    try {
      const actualizada = await api.adminActualizarVentanilla(token, ventanilla.id, {
        activa: !ventanilla.activa,
      });
      setVentanillas((prev) =>
        prev.map((item) => (item.id === actualizada.id ? actualizada : item)),
      );
      setMensaje(
        actualizada.activa
          ? `${actualizada.nombre} fue activada.`
          : `${actualizada.nombre} fue desactivada.`,
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/login');
        return;
      }
      setError(mensajeError(e));
    } finally {
      setAccionando(null);
    }
  };

  const activas = ventanillas.filter((ventanilla) => ventanilla.activa).length;
  const ocupadas = ventanillas.filter((ventanilla) => ventanilla.estado === 'Ocupada').length;
  const inactivas = ventanillas.length - activas;

  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loading label="Verificando sesión…" />
      </div>
    );
  }

  return (
    <StaffShell
      title="Ventanillas"
      subtitle="Cree ventanillas y actívelas o desactívelas según la operación del día"
      actions={
        <button
          type="button"
          onClick={() => cargar(true)}
          disabled={refrescando}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-muted shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-70"
        >
          <RefreshCw className={refrescando ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden />
          Actualizar
        </button>
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

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded-3xl bg-white p-6 shadow-kiosk">
          <h2 className="text-xl font-black text-ink">Nueva ventanilla</h2>
          <p className="mt-1 text-sm text-muted">
            El código se usa en la cola y en los reportes. Por ejemplo: V4.
          </p>

          <form onSubmit={crear} className="mt-5 space-y-4">
            <Campo label="Código">
              <input
                value={codigo}
                onChange={(event) => {
                  setCodigo(event.target.value.toUpperCase().slice(0, 20));
                  setError(null);
                }}
                required
                maxLength={20}
                placeholder="V4"
                className={`${INPUT} font-mono uppercase`}
              />
            </Campo>

            <Campo label="Nombre">
              <input
                value={nombre}
                onChange={(event) => {
                  setNombre(event.target.value);
                  setError(null);
                }}
                required
                maxLength={100}
                placeholder="Ventanilla 4"
                className={INPUT}
              />
            </Campo>

            <button
              type="submit"
              disabled={creando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-70"
            >
              <DoorOpen className="h-4 w-4" aria-hidden />
              {creando ? 'Creando…' : 'Crear ventanilla'}
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-canvas px-4 py-3 text-xs text-muted">
            <p className="font-bold text-ink">Estado actual</p>
            <p className="mt-1">
              {activas} activas · {ocupadas} ocupadas · {inactivas} inactivas
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-kiosk">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-black text-ink">
                <Monitor className="h-5 w-5 text-brand" aria-hidden />
                Ventanillas ({ventanillas.length})
              </h2>
              <p className="mt-1 text-sm text-muted">
                Una ventanilla ocupada debe finalizar su turno antes de desactivarse.
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase tracking-wide text-muted">
                  <th className="pb-3">Código</th>
                  <th className="pb-3">Nombre</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Operación</th>
                  <th className="pb-3 text-right">Atendidos hoy</th>
                  <th className="pb-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ventanillas.map((ventanilla) => (
                  <tr key={ventanilla.id}>
                    <td className="py-3 font-mono font-black text-ink">{ventanilla.codigo}</td>
                    <td className="py-3 font-bold text-ink">{ventanilla.nombre}</td>
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
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                          ventanilla.estado === 'Ocupada'
                            ? 'bg-sky-100 text-sky-700'
                            : ventanilla.estado === 'Libre'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ventanilla.estado}
                        {ventanilla.turnoActual && (
                          <span className="font-mono">{ventanilla.turnoActual}</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold text-ink">
                      {ventanilla.atendidosHoy}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => alternar(ventanilla)}
                          disabled={
                            accionando === ventanilla.id ||
                            (ventanilla.activa && ventanilla.estado === 'Ocupada')
                          }
                          title={
                            ventanilla.activa && ventanilla.estado === 'Ocupada'
                              ? 'Finalice el turno en atención antes de desactivarla'
                              : undefined
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            ventanilla.activa
                              ? 'bg-red-50 text-brand hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {ventanilla.activa ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ventanillas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted">
                      Todavía no hay ventanillas. Cree la primera con el formulario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </StaffShell>
  );
}
