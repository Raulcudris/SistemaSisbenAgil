import { Ticket } from 'lucide-react';
import { cn } from '@/lib/cn';

const TAMANOS = {
  sm: {
    caja: 'h-9 w-9 rounded-xl',
    icono: 'h-5 w-5',
    titulo: 'text-xl',
    subtitulo: 'hidden',
  },
  md: {
    caja: 'h-12 w-12 rounded-2xl',
    icono: 'h-6 w-6',
    titulo: 'text-2xl',
    subtitulo: 'text-[9px]',
  },
  lg: {
    caja: 'h-16 w-16 rounded-3xl',
    icono: 'h-9 w-9',
    titulo: 'text-4xl md:text-5xl',
    subtitulo: 'text-[11px] md:text-xs',
  },
} as const;

interface BrandLogoProps {
  size?: keyof typeof TAMANOS;
  className?: string;
}

export function BrandLogo({ size = 'md', className }: BrandLogoProps) {
  const t = TAMANOS[size];

  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-brand text-white shadow-sm print:bg-black',
          t.caja,
        )}
      >
        <Ticket className={t.icono} strokeWidth={2.2} aria-hidden />
      </span>
      <span className="text-left leading-none">
        <span
          className={cn(
            'block font-black tracking-tight text-ink print:text-black',
            t.titulo,
          )}
        >
          Sisben<span className="text-brand print:text-black">Agil</span>
        </span>
        {size !== 'sm' && (
          <span
            className={cn(
              'mt-1 block font-bold uppercase tracking-[0.28em] text-muted print:text-black',
              t.subtitulo,
            )}
          >
            Turnos SISBEN
          </span>
        )}
      </span>
    </span>
  );
}
