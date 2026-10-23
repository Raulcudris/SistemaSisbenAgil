import type { Rol } from './types';

/** Pantalla inicial según el rol autenticado. */
export function panelDe(rol: Rol): string {
  switch (rol) {
    case 'ADMIN':
      return '/dashboard';
    case 'ASESOR':
      return '/ventanilla';
    default:
      return '/';
  }
}

export const ROLES_ADMIN: Rol[] = ['ADMIN'];
