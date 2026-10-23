'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
  Accessibility,
  ArrowRight,
  Heart,
  Scale,
  Ticket,
  UserRound,
  Users,
} from 'lucide-react';
import { api, ApiError, mensajeError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useKiosk } from '@/lib/kiosk-context';
import type { MotivoPrioridad } from '@/lib/types';
import { KioskShell } from '@/components/KioskShell';
import { Loading } from '@/components/Loading';
import { Modal } from '@/components/Modal';
import { ServiceIcon } from '@/components/ServiceIcon';
import { useDeferredPush } from '@/lib/use-deferred-push';
import { useGuard } from '@/lib/use-guard';
import { useKioskAuth } from '@/lib/use-kiosk-auth';

const PRIORIDAD = {
  PRIORITARIO: 1,
  GENERAL: 2,
  JURIDICO: 3,
} as const;

interface ErrorTurno {
  codigo: string;
  titulo: string;
  mensaje: string;
  fatal: boolean;
}

export default function PrioridadesPage() {
  const router = useRouter();
  const go = useDeferredPush();
  const autenticado = useKioskAuth();
  const { token, cerrarSesion } = useAuth();
  const { state, hydrated, update, reset } = useKiosk();
  const config = state.config;
  const servicio = state.servicio;
  const persona = state.persona;

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<ErrorTurno | null>(null);

  const listo = useGuard(hydrated, Boolean(config) && Boolean(servicio));

  const finalizar = useCallback(() => {
    reset();
    router.replace('/');
  }, [reset, router]);

  if (!autenticado || !listo || !config || !servicio) {
    return (
      <KioskShell>
        <Loading />
      </KioskShell>
    );
  }

  const tomarTurno = async (prioridad?: number, motivo?: MotivoPrioridad) => {
    if (enviando) {
      return;
    }
    if (!token) {
      cerrarSesion();
      router.replace('/');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const ticket = await api.crearTurno(
        {
          servicioId: servicio.id,
          personaId: persona?.id ?? null,
          prioridad: servicio.seleccionaPrioridad ? (prioridad ?? null) : null,
          motivoPrioridad: servicio.seleccionaPrioridad ? (motivo ?? null) : null,
          nivel: state.nivel,
          canal: state.canal,
        },
        token,
      );
      update({ ticket });
      go('/ticket');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        cerrarSesion();
        router.replace('/');
        return;
      }
      const codigo = e instanceof ApiError ? e.codigo : 'ERROR';
      const mensaje = mensajeError(e);

      if (codigo === 'SIN_CITA') {
        setError({
          codigo,
          titulo: 'No se encontró una cita',
          mensaje,
          fatal: true,
        });
      } else if (codigo === 'LIMITE_ALCANZADO') {
        setError({
          codigo,
          titulo: 'Límite de turnos alcanzado',
          mensaje,
          fatal: true,
        });
      } else if (codigo === 'FUERA_DE_HORARIO') {
        setError({
          codigo,
          titulo: 'Servicio fuera de horario',
          mensaje,
          fatal: true,
        });
      } else {
        setError({
          codigo,
          titulo: 'No se pudo generar el turno',
          mensaje,
          fatal: false,
        });
      }
    } finally {
      setEnviando(false);
    }
  };

  const nombre =
    persona?.nombreCompleto && persona.nombreCompleto !== 'Sin Registro'
      ? persona.nombreCompleto
      : 'Sin identificación';

  return (
    <KioskShell
      center={false}
      title={servicio.seleccionaPrioridad ? 'Seleccione su turno' : 'Confirmar turno'}
      subtitle={servicio.nombre}
      backHref="/cedula"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex flex-col items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-kiosk sm:flex-row">
          <div className="flex items-center gap-4">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
              style={{ backgroundColor: servicio.color }}
            >
              <ServiceIcon name={servicio.icono} className="h-9 w-9" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
                Servicio
              </p>
              <p className="text-2xl font-black text-ink">{servicio.nombre}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-muted">
            <span className="flex items-center gap-2 rounded-full bg-canvas px-4 py-2">
              <UserRound className="h-4 w-4" aria-hidden />
              {nombre}
            </span>
          </div>
        </div>

        {servicio.seleccionaPrioridad ? (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <button
              type="button"
              onClick={() => tomarTurno(PRIORIDAD.GENERAL)}
              disabled={enviando}
              className="group flex min-h-[300px] flex-col justify-between rounded-3xl bg-ink p-8 text-left text-white shadow-kiosk transition hover:-translate-y-1 hover:shadow-card active:translate-y-0 disabled:opacity-60"
            >
              <span className="flex items-center justify-between gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Users className="h-9 w-9" aria-hidden />
                </span>
                <span className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-black tracking-[0.2em]">
                  GN
                </span>
              </span>
              <span>
                <span className="block text-4xl font-black">General</span>
                <span className="mt-2 block text-base text-white/70">
                  Atención en el orden habitual de llegada.
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/90">
                Tomar turno <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </button>

            <div className="rounded-3xl bg-white p-7 shadow-kiosk">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
                    <Accessibility className="h-8 w-8" aria-hidden />
                  </span>
                  <div>
                    <p className="text-2xl font-black text-ink">Prioritario</p>
                    <p className="text-sm text-muted">Seleccione el motivo</p>
                  </div>
                </div>
                <span className="rounded-full bg-brand px-4 py-1.5 text-sm font-black tracking-[0.2em] text-white">
                  PR
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => tomarTurno(PRIORIDAD.PRIORITARIO, 'EMBARAZADA')}
                  disabled={enviando}
                  className="group flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-canvas px-4 py-5 text-center transition hover:border-brand hover:bg-brand-light active:scale-[0.98] disabled:opacity-60"
                >
                  <Heart className="h-8 w-8 text-brand" aria-hidden />
                  <span className="text-base font-bold text-ink">Embarazada</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Turno PR
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => tomarTurno(PRIORIDAD.PRIORITARIO, 'ADULTO_MAYOR')}
                  disabled={enviando}
                  className="group flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-canvas px-4 py-5 text-center transition hover:border-brand hover:bg-brand-light active:scale-[0.98] disabled:opacity-60"
                >
                  <Users className="h-8 w-8 text-brand" aria-hidden />
                  <span className="text-base font-bold text-ink">Adulto mayor</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Turno PR
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => tomarTurno(PRIORIDAD.PRIORITARIO, 'DISCAPACITADO')}
                  disabled={enviando}
                  className="group flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-canvas px-4 py-5 text-center transition hover:border-brand hover:bg-brand-light active:scale-[0.98] disabled:opacity-60"
                >
                  <Accessibility className="h-8 w-8 text-brand" aria-hidden />
                  <span className="text-base font-bold text-ink">Discapacitado</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Turno PR
                  </span>
                </button>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-muted">
                Los turnos prioritarios se atienden antes que los turnos generales.
              </p>
            </div>
            </div>

            <button
              type="button"
              onClick={() => tomarTurno(PRIORIDAD.JURIDICO)}
              disabled={enviando}
              className="group mt-6 flex w-full flex-col items-start justify-between gap-5 rounded-3xl border-2 border-slate-200 bg-white p-7 text-left shadow-kiosk transition hover:-translate-y-1 hover:border-brand hover:shadow-card active:translate-y-0 disabled:opacity-60 sm:flex-row sm:items-center sm:p-8"
            >
              <span className="flex items-center gap-5">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-ink text-white">
                  <Scale className="h-9 w-9" aria-hidden />
                </span>
                <span>
                  <span className="flex flex-wrap items-center gap-3">
                    <span className="text-3xl font-black text-ink">Jurídico</span>
                    <span className="rounded-full bg-ink px-4 py-1.5 text-sm font-black tracking-[0.2em] text-white">
                      JR
                    </span>
                  </span>
                  <span className="mt-1 block text-base text-muted">
                    Atención y orientación jurídica.
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink">
                Tomar turno <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
            <p className="mt-3 text-center text-xs text-muted">
              El turno jurídico tiene numeración independiente (JR-001).
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => tomarTurno()}
            disabled={enviando}
            className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl bg-brand px-8 py-12 text-white shadow-card transition hover:bg-brand-dark active:scale-[0.99] disabled:opacity-60"
          >
            <Ticket className="h-14 w-14" aria-hidden />
            <span className="text-3xl font-black">Tomar turno</span>
            <span className="text-base font-medium text-white/80">
              Se generará un turno {servicio.requiereCita ? 'con cita' : 'general'} para este servicio
            </span>
          </button>
        )}
      </div>

      {enviando && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <Loading label="Generando su turno…" />
        </div>
      )}

      <Modal
        open={Boolean(error)}
        tone={error?.fatal ? 'error' : 'info'}
        title={error?.titulo ?? ''}
        message={error?.mensaje}
        actionLabel={error?.fatal ? 'Volver al inicio' : 'Entendido'}
        onAction={error?.fatal ? finalizar : undefined}
        onClose={() => setError(null)}
      />
    </KioskShell>
  );
}
