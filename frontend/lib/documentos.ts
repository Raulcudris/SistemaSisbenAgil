import type { TipoDocumento } from './types';

export const TIPOS_DOCUMENTO: { value: TipoDocumento; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'RC', label: 'Registro civil' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'PEP', label: 'Permiso Especial' },
];

export function documentoAlfanumerico(tipo: TipoDocumento): boolean {
  return tipo === 'PA';
}
