'use client';

import { Delete } from 'lucide-react';

interface LetterPadProps {
  onLetter: (letter: string) => void;
  onSpace: () => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const FILAS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function LetterPad({
  onLetter,
  onSpace,
  onBackspace,
  disabled = false,
}: LetterPadProps) {
  const tecla =
    'flex h-14 min-w-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-bold text-ink shadow-sm transition hover:border-brand hover:text-brand active:scale-95 disabled:opacity-40 md:h-16 md:text-2xl';

  return (
    <div className="flex w-full max-w-4xl flex-col gap-2">
      {FILAS.map((fila) => (
        <div key={fila.join('')} className="flex w-full justify-center gap-2">
          {fila.map((letra) => (
            <button
              key={letra}
              type="button"
              className={tecla}
              onClick={() => onLetter(letra)}
              disabled={disabled}
            >
              {letra}
            </button>
          ))}
        </div>
      ))}

      <div className="mt-1 flex w-full justify-center gap-2">
        <button
          type="button"
          className={`${tecla} max-w-[45%] flex-[2]`}
          onClick={onSpace}
          disabled={disabled}
        >
          Espacio
        </button>
        <button
          type="button"
          className={`${tecla} max-w-[25%]`}
          onClick={onBackspace}
          disabled={disabled}
          aria-label="Borrar"
        >
          <Delete className="h-7 w-7" aria-hidden />
        </button>
      </div>
    </div>
  );
}
