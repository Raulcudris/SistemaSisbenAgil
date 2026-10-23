'use client';

import { ArrowRight, Layers } from 'lucide-react';
import type { Servicio } from '@/lib/types';
import { ServiceIcon } from './ServiceIcon';

interface ServiceCardProps {
  servicio: Servicio;
  onSelect: (servicio: Servicio) => void;
}

export function ServiceCard({ servicio, onSelect }: ServiceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(servicio)}
      className="group flex min-h-[170px] w-full flex-col justify-between rounded-3xl border-2 border-transparent bg-white p-6 text-left shadow-kiosk transition hover:-translate-y-1 hover:border-brand/30 hover:shadow-card focus-visible:border-brand focus-visible:outline-none active:translate-y-0"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: servicio.color }}
        >
          <ServiceIcon name={servicio.icono} className="h-9 w-9" />
        </span>
        {servicio.tieneSubservicios && (
          <span className="flex items-center gap-1 rounded-full bg-brand-light px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-dark">
            <Layers className="h-4 w-4" aria-hidden />
            Opciones
          </span>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-2xl font-extrabold leading-tight text-ink">{servicio.nombre}</h3>
        <p className="mt-2 flex items-center gap-1 text-sm font-semibold text-muted transition group-hover:text-brand">
          {servicio.tieneSubservicios ? 'Elegir opción' : 'Tomar turno'}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
        </p>
      </div>
    </button>
  );
}
