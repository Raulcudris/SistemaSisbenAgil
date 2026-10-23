import type {
  ApiErrorBody,
  AtencionesPage,
  DashboardResumen,
  KioskConfig,
  LoginResponse,
  MotivoPrioridad,
  Nivel,
  Persona,
  ReporteDia,
  Rol,
  Servicio,
  SesionResponse,
  Ticket,
  TipoDocumento,
  TvResumen,
  UsuarioAdmin,
  VentanillaAdmin,
  VentanillaEstado,
  VentanillaResumen,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8088/api';

export class ApiError extends Error {
  readonly codigo: string;
  readonly status: number;
  readonly detalles?: Record<string, string>;

  constructor(mensaje: string, codigo: string, status: number, detalles?: Record<string, string>) {
    super(mensaje);
    this.name = 'ApiError';
    this.codigo = codigo;
    this.status = status;
    this.detalles = detalles;
  }
}

async function request<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      cache: 'no-store',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.',
      'SIN_CONEXION',
      0,
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // respuesta sin JSON
    }
    throw new ApiError(
      body?.mensaje ?? 'Ocurrió un error inesperado',
      body?.codigo ?? 'ERROR',
      response.status,
      body?.detalles,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function requestBlob(path: string, token: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Verifique que el backend esté en ejecución.',
      'SIN_CONEXION',
      0,
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      // respuesta sin JSON
    }
    throw new ApiError(
      body?.mensaje ?? 'Ocurrió un error inesperado',
      body?.codigo ?? 'ERROR',
      response.status,
      body?.detalles,
    );
  }
  return response.blob();
}

interface AtencionesQuery {
  fechaInicio?: string;
  fechaFin?: string;
  ventanillaId?: number | null;
  q?: string;
  page?: number;
  size?: number;
}

function queryAtenciones(params: AtencionesQuery): string {
  const search = new URLSearchParams();
  if (params.fechaInicio) {
    search.set('fechaInicio', params.fechaInicio);
  }
  if (params.fechaFin) {
    search.set('fechaFin', params.fechaFin);
  }
  if (params.ventanillaId) {
    search.set('ventanillaId', String(params.ventanillaId));
  }
  const texto = params.q?.trim();
  if (texto) {
    search.set('q', texto);
  }
  if (params.page !== undefined) {
    search.set('page', String(params.page));
  }
  if (params.size !== undefined) {
    search.set('size', String(params.size));
  }
  return search.toString();
}

export const api = {
  config: () => request<KioskConfig>('/config'),

  servicios: () => request<Servicio[]>('/servicios'),

  subservicios: (servicioId: number) =>
    request<Servicio[]>(`/servicios/${servicioId}/subservicios`),

  niveles: () => request<Nivel[]>('/niveles'),

  async buscarPersona(cedula: string): Promise<Persona | null> {
    try {
      return await request<Persona>(`/personas/buscar?cedula=${encodeURIComponent(cedula)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  registrarPersona: (data: {
    cedula: string;
    tipoDocumento: TipoDocumento;
    nombreCompleto: string;
    telefono?: string;
  }) =>
    request<Persona>('/personas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  actualizarTelefono: (personaId: number, telefono: string) =>
    request<Persona>(`/personas/${personaId}/telefono`, {
      method: 'PATCH',
      body: JSON.stringify({ telefono }),
    }),

  crearTurno: (
    data: {
      servicioId: number;
      personaId: number | null;
      prioridad: number | null;
      motivoPrioridad: MotivoPrioridad | null;
      nivel: string | null;
      canal: 'TURNO' | 'SMS';
    },
    token: string,
  ) =>
    request<Ticket>(
      '/turnos',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      token,
    ),

  ticket: (turnoId: number) => request<Ticket>(`/turnos/${turnoId}/ticket`),

  /* ---- Pantalla de sala de espera (pública) ---- */

  tv: () => request<TvResumen>('/tv'),

  /* ---- Acceso funcionarios ---- */

  login: (username: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  sesion: (token: string) => request<SesionResponse>('/auth/me', undefined, token),

  /* ---- Dashboard ---- */

  dashboard: (token: string, fecha?: string) =>
    request<DashboardResumen>(
      `/dashboard/resumen${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''}`,
      undefined,
      token,
    ),

  /* ---- Administración (solo ADMIN) ---- */

  adminUsuarios: (token: string) =>
    request<UsuarioAdmin[]>('/admin/usuarios', undefined, token),

  adminCrearUsuario: (
    token: string,
    data: { username: string; password: string; nombre: string; rol: Rol },
  ) =>
    request<UsuarioAdmin>(
      '/admin/usuarios',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),

  adminActualizarUsuario: (
    token: string,
    id: number,
    data: {
      nombre?: string;
      username?: string;
      rol?: Rol;
      password?: string;
      activo?: boolean;
    },
  ) =>
    request<UsuarioAdmin>(
      `/admin/usuarios/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      token,
    ),

  adminEliminarUsuario: (token: string, id: number) =>
    request<void>(
      `/admin/usuarios/${id}`,
      { method: 'DELETE' },
      token,
    ),

  adminVentanillas: (token: string) =>
    request<VentanillaAdmin[]>('/admin/ventanillas', undefined, token),

  adminCrearVentanilla: (
    token: string,
    data: { codigo: string; nombre: string },
  ) =>
    request<VentanillaAdmin>(
      '/admin/ventanillas',
      { method: 'POST', body: JSON.stringify(data) },
      token,
    ),

  adminActualizarVentanilla: (
    token: string,
    id: number,
    data: { nombre?: string; activa?: boolean },
  ) =>
    request<VentanillaAdmin>(
      `/admin/ventanillas/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      token,
    ),

  adminReportes: (token: string, fechaInicio?: string, fechaFin?: string) => {
    const params = new URLSearchParams();
    if (fechaInicio) {
      params.set('fechaInicio', fechaInicio);
    }
    if (fechaFin) {
      params.set('fechaFin', fechaFin);
    }
    const query = params.toString();
    return request<ReporteDia>(
      `/admin/reportes${query ? `?${query}` : ''}`,
      undefined,
      token,
    );
  },

  adminAtenciones: (token: string, params: AtencionesQuery) => {
    const query = queryAtenciones(params);
    return request<AtencionesPage>(
      `/admin/reportes/atenciones${query ? `?${query}` : ''}`,
      undefined,
      token,
    );
  },

  adminExportarAtenciones: (token: string, params: AtencionesQuery) => {
    const query = queryAtenciones(params);
    return requestBlob(
      `/admin/reportes/atenciones/export${query ? `?${query}` : ''}`,
      token,
    );
  },

  /* ---- Ventanilla ---- */

  ventanillaEstado: (token: string, ventanillaId: number) =>
    request<VentanillaEstado>(`/ventanilla/estado?ventanillaId=${ventanillaId}`, undefined, token),

  ventanillaVentanillas: (token: string) =>
    request<VentanillaResumen[]>('/ventanilla/ventanillas', undefined, token),

  ventanillaLlamar: (token: string, ventanillaId: number, turnoId?: number) =>
    request<VentanillaEstado>(
      `/ventanilla/llamar?ventanillaId=${ventanillaId}${turnoId ? `&turnoId=${turnoId}` : ''}`,
      { method: 'POST' },
      token,
    ),

  ventanillaAtender: (token: string, ventanillaId: number, turnoId: number) =>
    request<VentanillaEstado>(
      `/ventanilla/turnos/${turnoId}/atender?ventanillaId=${ventanillaId}`,
      { method: 'POST' },
      token,
    ),

  ventanillaAusente: (token: string, ventanillaId: number, turnoId: number) =>
    request<VentanillaEstado>(
      `/ventanilla/turnos/${turnoId}/ausente?ventanillaId=${ventanillaId}`,
      { method: 'POST' },
      token,
    ),

  ventanillaRellamar: (token: string, ventanillaId: number, turnoId: number) =>
    request<VentanillaEstado>(
      `/ventanilla/turnos/${turnoId}/rellamar?ventanillaId=${ventanillaId}`,
      { method: 'POST' },
      token,
    ),
};

export function mensajeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Ocurrió un error inesperado';
}
