import { cn } from '@/lib/cn';

const TAMANOS = {
  sm: {
    caja: 'h-9 w-9',
    icono: 'h-9 w-9',
    titulo: 'text-xl',
    subtitulo: 'hidden',
  },
  md: {
    caja: 'h-12 w-12',
    icono: 'h-12 w-12',
    titulo: 'text-2xl',
    subtitulo: 'text-[9px]',
  },
  lg: {
    caja: 'h-16 w-16',
    icono: 'h-16 w-16',
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
      <span className={cn('flex shrink-0 items-center justify-center', t.caja)}>
        <img
          src={size === 'sm' ? '/logos/digiturnos-icon-simple.svg' : '/logos/digiturnos-icon.svg'}
          alt=""
          aria-hidden
          className={cn('block object-contain', t.icono)}
        />
      </span>
      <span className="text-left leading-none">
        <span
          className={cn(
            'block font-black tracking-tight text-ink print:text-black',
            t.titulo,
          )}
        >
          Sisbén<span className="text-brand print:text-black">Ágil</span>
        </span>
        {size !== 'sm' && (
          <span
            className={cn(
              'mt-1 block font-bold uppercase tracking-[0.28em] text-muted print:text-black',
              t.subtitulo,
            )}
          >
            Turnos SISBÉN
          </span>
        )}
      </span>
    </span>
  );
}
