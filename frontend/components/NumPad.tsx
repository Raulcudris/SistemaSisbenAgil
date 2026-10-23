'use client';

import { Delete } from 'lucide-react';

interface NumPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  disabled?: boolean;
}

const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function NumPad({ onDigit, onBackspace, onClear, disabled = false }: NumPadProps) {
  const base =
    'flex h-20 items-center justify-center rounded-2xl border border-slate-200 bg-white text-3xl font-bold text-ink shadow-kiosk transition hover:border-brand hover:text-brand active:scale-95 disabled:opacity-40';

  return (
    <div className="grid w-full max-w-sm grid-cols-3 gap-3">
      {DIGITOS.map((digito) => (
        <button
          key={digito}
          type="button"
          className={base}
          onClick={() => onDigit(digito)}
          disabled={disabled}
        >
          {digito}
        </button>
      ))}

      <button
        type="button"
        className={`${base} bg-brand-light text-brand-dark hover:text-brand-dark`}
        onClick={onClear}
        disabled={disabled || !onClear}
        aria-label="Limpiar"
      >
        C
      </button>

      <button
        type="button"
        className={base}
        onClick={() => onDigit('0')}
        disabled={disabled}
      >
        0
      </button>

      <button
        type="button"
        className={base}
        onClick={onBackspace}
        disabled={disabled}
        aria-label="Borrar último dígito"
      >
        <Delete className="h-8 w-8" aria-hidden />
      </button>
    </div>
  );
}
