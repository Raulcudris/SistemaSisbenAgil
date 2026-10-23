import type { Ticket } from '@/lib/types';
import { BrandLogo } from './BrandLogo';

export function TicketView({ ticket }: { ticket: Ticket }) {
  return (
    <div className="ticket-print mx-auto w-[80mm] max-w-full bg-white p-4 text-center text-black shadow-kiosk">
      <div className="mb-2 flex justify-center">
        <BrandLogo size="sm" />
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.3em] text-black">Turno</p>
      <p className="mt-1 text-5xl font-black leading-none tracking-tight">{ticket.codigo}</p>

      {/* Datos visibles en pantalla, ocultos en el ticket impreso. */}
      {ticket.nombrePersona && (
        <p className="mt-2 text-sm font-semibold print:hidden">{ticket.nombrePersona}</p>
      )}

      {ticket.cedula && (
        <p className="mt-1 text-xs print:hidden">
          {ticket.tipoDocumento ? `${ticket.tipoDocumento} ${ticket.cedula}` : ticket.cedula}
        </p>
      )}

      <p className="mt-1.5 text-sm font-bold uppercase">{ticket.servicio}</p>
      <p className="text-[11px]">{ticket.prioridadEtiqueta}</p>
      {ticket.nivel && <p className="text-[11px]">Nivel: {ticket.nivel}</p>}

      <div className="my-2 border-t border-dashed border-slate-400" />

      <p className="text-[11px]">Personas antes: {ticket.personasDelante}</p>
      <p className="text-[11px] print:hidden">Tiempo estimado: {ticket.tiempoEstimadoMin} min</p>

      <div className="my-2 border-t border-dashed border-slate-400" />

      <p className="text-xs">{ticket.fechaTexto}</p>
      <p className="mt-1.5 text-xs font-medium leading-snug">{ticket.mensaje}</p>
      <p className="mt-2 text-[11px] font-semibold text-black">
        {ticket.empresa} · {ticket.sede}
      </p>
      <p className="mt-0.5 text-[11px] font-bold text-black">Turnos SISBEN</p>
    </div>
  );
}
