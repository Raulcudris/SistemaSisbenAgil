'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';
import { panelDe } from './roles';
import type { Rol } from './types';

const TODOS: Rol[] = ['ADMIN', 'ASESOR'];

/**
 * Protege una pantalla de funcionarios. Espera a que la sesión esté
 * hidratada, redirige al login si no hay sesión y al panel que corresponda
 * si el rol no tiene permiso. Devuelve true cuando se puede renderizar.
 */
export function useAuthGuard(roles: Rol[] = TODOS): boolean {
  const router = useRouter();
  const { hydrated, usuario } = useAuth();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!usuario) {
      router.replace('/login');
      return;
    }
    if (!roles.includes(usuario.rol)) {
      router.replace(panelDe(usuario.rol));
    }
  }, [hydrated, usuario, roles, router]);

  return hydrated && usuario !== null && roles.includes(usuario.rol);
}
