'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Espera a que el estado del kiosco esté hidratado y, si no se cumple la
 * condición, redirige. Devuelve true cuando la pantalla puede renderizarse.
 */
export function useGuard(ready: boolean, condition: boolean, target = '/'): boolean {
  const router = useRouter();

  useEffect(() => {
    if (ready && !condition) {
      router.replace(target);
    }
  }, [ready, condition, target, router]);

  return ready && condition;
}
