import { cn } from '@/lib/cn';

const ESTILOS: Record<string, string> = {
  ESPERA: 'bg-amber-100 text-amber-700',
  LLAMADO: 'bg-sky-100 text-sky-700',
  ATENDIDO: 'bg-emerald-100 text-emerald-700',
  AUSENTE: 'bg-red-100 text-brand',
  CANCELADO: 'bg-slate-200 text-slate-600',
};

const TEXTOS: Record<string, string> = {
  ESPERA: 'En espera',
  LLAMADO: 'Llamado',
  ATENDIDO: 'Atendido',
  AUSENTE: 'Ausente',
  CANCELADO: 'Cancelado',
};

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide',
        ESTILOS[estado] ?? 'bg-slate-100 text-slate-600',
      )}
    >
      {TEXTOS[estado] ?? estado}
    </span>
  );
}
