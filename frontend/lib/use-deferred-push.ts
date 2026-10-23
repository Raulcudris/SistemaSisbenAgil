'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Navega después de que React haya confirmado los cambios de estado del
 * kiosco. Evita que la pantalla destino se monte con el estado anterior
 * (por ejemplo, sin persona o sin servicio) y redirija al inicio.
 */
export function useDeferredPush() {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);
  const navegado = useRef<string | null>(null);

  useEffect(() => {
    if (destino && navegado.current !== destino) {
      navegado.current = destino;
      router.push(destino);
    }
  }, [destino, router]);

  return useCallback((path: string) => setDestino(path), []);
}
