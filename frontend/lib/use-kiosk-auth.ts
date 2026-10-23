'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

/**
 * Protege las pantallas del kiosco. Solo ADMIN o KIOSCO pueden generar
 * turnos; un asesor es redirigido al inicio del kiosco.
 */
export function useKioskAuth(): boolean {
  const router = useRouter();
  const { hydrated, usuario } = useAuth();
  const autorizado = Boolean(
    usuario && (usuario.rol === 'KIOSCO' || usuario.rol === 'ADMIN'),
  );

  useEffect(() => {
    if (hydrated && !autorizado) {
      router.replace('/');
    }
  }, [hydrated, autorizado, router]);

  return hydrated && autorizado;
}
