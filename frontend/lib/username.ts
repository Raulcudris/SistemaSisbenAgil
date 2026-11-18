export const USERNAME_MIN = 4;
export const USERNAME_MAX = 60;
export const USERNAME_REGEX = /^[a-zA-Z0-9._-]{4,60}$/;
export const USERNAME_PATTERN = '[a-zA-Z0-9._-]{4,60}';

export const USERNAME_MENSAJE =
  'El usuario debe tener entre 4 y 60 caracteres: letras, números, punto, guion o guion bajo.';

export const USERNAME_AYUDA =
  'Entre 4 y 60 caracteres. Use letras, números, punto (.), guion (-) o guion bajo (_).';

export type UsernameValidation =
  | { valido: true; username: string; mensaje: null }
  | { valido: false; username: string; mensaje: string };

/**
 * Normaliza y valida el usuario de acceso con la misma regla del backend:
 * 4 a 60 caracteres, solo letras, números, punto, guion o guion bajo.
 */
export function validarUsername(valor: string): UsernameValidation {
  const username = valor.trim();

  if (!username) {
    return {
      valido: false,
      username,
      mensaje: 'Escriba un usuario de acceso.',
    };
  }

  if (username.length < USERNAME_MIN) {
    return {
      valido: false,
      username,
      mensaje: `El usuario debe tener al menos ${USERNAME_MIN} caracteres.`,
    };
  }

  if (username.length > USERNAME_MAX) {
    return {
      valido: false,
      username,
      mensaje: `El usuario no puede superar los ${USERNAME_MAX} caracteres.`,
    };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valido: false,
      username,
      mensaje: `${USERNAME_MENSAJE} No use espacios ni tildes.`,
    };
  }

  return { valido: true, username, mensaje: null };
}
