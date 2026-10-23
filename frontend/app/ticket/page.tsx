'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Home, Printer } from 'lucide-react';
import { useKiosk } from '@/lib/kiosk-context';
import { KioskShell } from '@/components/KioskShell';
import { Loading } from '@/components/Loading';
import { TicketView } from '@/components/TicketView';
import { PrintAgentError, imprimirTicketAgente } from '@/lib/print-agent';
import { useGuard } from '@/lib/use-guard';

const SEGUNDOS_INACTIVIDAD = 20;

export default function TicketPage() {
  const router = useRouter();
  const { state, hydrated, reset } = useKiosk();
  const ticket = state.ticket;

  const [segundos, setSegundos] = useState(SEGUNDOS_INACTIVIDAD);
  const [enviando, setEnviando] = useState(false);
  const [avisoImpresion, setAvisoImpresion] = useState<{
    texto: string;
    tono: 'ok' | 'aviso' | 'error';
  } | null>(null);

  const listo = useGuard(hydrated, Boolean(ticket));

  const finalizar = useCallback(() => {
    reset();
    router.replace('/');
  }, [reset, router]);

  useEffect(() => {
    if (!listo || enviando) {
      return;
    }
    const id = setInterval(() => {
      setSegundos((actual) => (actual > 0 ? actual - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [listo, enviando]);

  useEffect(() => {
    if (listo && !enviando && segundos <= 0) {
      finalizar();
    }
  }, [listo, enviando, segundos, finalizar]);

  if (!listo || !ticket) {
    return (
      <KioskShell>
        <Loading />
      </KioskShell>
    );
  }

  const imprimir = async () => {
    if (enviando) {
      return;
    }

    setEnviando(true);
    setAvisoImpresion(null);
    setSegundos(SEGUNDOS_INACTIVIDAD);

    try {
      const resultado = await imprimirTicketAgente(ticket);
      setAvisoImpresion({
        texto: `Ticket enviado a ${resultado.printer ?? 'la impresora'}.`,
        tono: 'ok',
      });
    } catch (error) {
      if (error instanceof PrintAgentError && error.noDisponible) {
        if (error.timeout) {
          setAvisoImpresion({
            texto:
              'El agente tardó en responder. Revise la impresora antes de volver a imprimir.',
            tono: 'error',
          });
        } else {
          setAvisoImpresion({
            texto:
              'Agente local no disponible. Se usará la impresión del navegador.',
            tono: 'aviso',
          });
          try {
            window.print();
          } catch {
            // Sin impresora disponible.
          }
        }
      } else {
        setAvisoImpresion({
          texto:
            error instanceof Error
              ? error.message
              : 'No se pudo imprimir el ticket.',
          tono: 'error',
        });
      }
    } finally {
      setEnviando(false);
      setSegundos(SEGUNDOS_INACTIVIDAD);
    }
  };

  return (
    <KioskShell
      center={false}
      title="Su turno está listo"
      subtitle="Guarde el ticket y espere su llamado"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col-reverse items-center justify-center gap-10 lg:flex-row lg:items-start">
        <div className="no-print flex w-full max-w-md flex-col items-center gap-6 lg:items-start">
          <span className="flex items-center gap-3 rounded-full bg-emerald-100 px-5 py-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
            Turno generado
          </span>

          <div className="w-full rounded-3xl bg-white p-7 text-center shadow-kiosk lg:text-left">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted">
              Su número
            </p>
            <p className="mt-1 text-6xl font-black tracking-tight text-brand">
              {ticket.codigo}
            </p>
            <p className="mt-3 text-xl font-bold text-ink">{ticket.servicio}</p>
            <p className="text-base text-muted">
              {ticket.prioridadEtiqueta}
              {ticket.nivel ? ` · ${ticket.nivel}` : ''}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Personas antes
                </p>
                <p className="text-2xl font-black text-ink">{ticket.personasDelante}</p>
              </div>
              <div className="rounded-2xl bg-canvas px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Espera aprox.
                </p>
                <p className="text-2xl font-black text-ink">{ticket.tiempoEstimadoMin} min</p>
              </div>
            </div>

            {ticket.canal === 'SMS' && (
              <p className="mt-4 rounded-2xl bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark">
                Enviamos una copia del turno a su celular.
              </p>
            )}
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={imprimir}
              disabled={enviando}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-4 text-lg font-bold text-white shadow-card transition hover:bg-brand-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Printer className="h-5 w-5" aria-hidden />
              {enviando ? 'Enviando…' : 'Imprimir turno'}
            </button>
            <button
              type="button"
              onClick={finalizar}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-4 text-lg font-bold text-ink transition hover:border-brand hover:text-brand active:scale-[0.99]"
            >
              <Home className="h-5 w-5" aria-hidden />
              Finalizar
            </button>
          </div>

          {avisoImpresion && (
            <p
              role="status"
              className={`text-center text-sm font-semibold lg:text-left ${
                avisoImpresion.tono === 'ok'
                  ? 'text-emerald-600'
                  : avisoImpresion.tono === 'aviso'
                    ? 'text-amber-600'
                    : 'text-rose-600'
              }`}
            >
              {avisoImpresion.texto}
            </p>
          )}

          <p className="text-center text-sm text-muted lg:text-left">
            Volviendo al inicio en {segundos} s
          </p>
        </div>

        <div className="w-full max-w-[340px]">
          <TicketView ticket={ticket} />
        </div>
      </div>
    </KioskShell>
  );
}
