export type Canal = 'TURNO' | 'SMS';

export type MotivoPrioridad = 'EMBARAZADA' | 'ADULTO_MAYOR' | 'DISCAPACITADO';

export type TipoDocumento = 'CC' | 'TI' | 'RC' | 'CE' | 'PA' | 'PEP';

export interface KioskConfig {
  empresaId: number;
  empresa: string;
  sedeId: number;
  sede: string;
  permitirTerminos: boolean;
  permitirCedula: boolean;
  permitirNombre: boolean;
  permitirTercerNivel: boolean;
  smsHabilitado: boolean;
  mensajeTicket: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  prefijo: string;
  color: string;
  icono?: string | null;
  tieneSubservicios: boolean;
  seleccionaPrioridad: boolean;
  requiereCita: boolean;
}

export interface NivelSubopcion {
  id: number;
  nombre: string;
}

export interface Nivel {
  id: number;
  nombre: string;
  subopciones: NivelSubopcion[];
}

export interface Persona {
  id: number;
  cedula: string;
  tipoDocumento?: TipoDocumento | null;
  nombreCompleto: string;
  telefono?: string | null;
}

export interface Ticket {
  turnoId: number;
  codigo: string;
  servicioId: number;
  servicio: string;
  prioridad: number;
  prioridadEtiqueta: string;
  nivel?: string | null;
  nombrePersona?: string | null;
  cedula?: string | null;
  tipoDocumento?: TipoDocumento | null;
  fecha: string;
  fechaTexto: string;
  personasDelante: number;
  tiempoEstimadoMin: number;
  mensaje: string;
  empresa: string;
  sede: string;
  canal: Canal;
}

export interface ApiErrorBody {
  codigo: string;
  mensaje: string;
  timestamp?: string;
  detalles?: Record<string, string>;
}

/* ---- Acceso funcionarios, dashboard y ventanilla ---- */

export type Rol = 'ADMIN' | 'ASESOR' | 'KIOSCO';

export interface UsuarioSesion {
  id: number;
  username: string;
  nombre: string;
  rol: Rol;
}

export interface Ventanilla {
  id: number;
  codigo: string;
  nombre: string;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioSesion;
  ventanillas: Ventanilla[];
}

export interface SesionResponse {
  usuario: UsuarioSesion;
  ventanillas: Ventanilla[];
}

export interface TurnoAtencion {
  id: number;
  codigo: string;
  prioridad: number;
  prioridadEtiqueta: string;
  estado: string;
  nombrePersona?: string | null;
  cedula?: string | null;
  tipoDocumento?: TipoDocumento | null;
  fechaCreacion: string;
  fechaLlamado?: string | null;
  fechaSalida?: string | null;
  llamados: number;
  ventanilla?: string | null;
}

export interface ColaItem {
  id: number;
  codigo: string;
  prioridad: number;
  prioridadEtiqueta: string;
  nombrePersona?: string | null;
  cedula?: string | null;
  tipoDocumento?: TipoDocumento | null;
  fechaCreacion: string;
  esperaMin: number;
}

export interface VentanillaEstado {
  ventanillaId: number;
  ventanilla: string;
  actual?: TurnoAtencion | null;
  enEspera: number;
  prioritariosEnEspera: number;
  generalesEnEspera: number;
  juridicosEnEspera: number;
  llamadosHoy: number;
  atendidosHoy: number;
  ausentesHoy: number;
  siguientes: ColaItem[];
  recientes: TurnoAtencion[];
}

export interface ColaTipo {
  codigo: string;
  nombre: string;
  enEspera: number;
  atendidos: number;
}

export interface HoraResumen {
  hora: number;
  creados: number;
  atendidos: number;
}

export interface VentanillaResumen {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  turnoActual?: string | null;
  fechaLlamado?: string | null;
  atendidos: number;
  ausentes: number;
  atencionPromedioMin: number;
}

export interface TurnoResumen {
  id: number;
  codigo: string;
  tipo: string;
  tipoEtiqueta: string;
  estado: string;
  nombrePersona?: string | null;
  cedula?: string | null;
  ventanilla?: string | null;
  fechaCreacion: string;
  fechaLlamado?: string | null;
  fechaSalida?: string | null;
  llamados: number;
}

export interface DashboardResumen {
  fecha: string;
  total: number;
  enEspera: number;
  llamados: number;
  atendidos: number;
  ausentes: number;
  cancelados: number;
  esperaPromedioMin: number;
  atencionPromedioMin: number;
  colas: ColaTipo[];
  porHora: HoraResumen[];
  ventanillas: VentanillaResumen[];
  recientes: TurnoResumen[];
}

/* ---- Administración: usuarios, ventanillas y reportes ---- */

export interface UsuarioAdmin {
  id: number;
  username: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
}

export interface VentanillaAdmin {
  id: number;
  codigo: string;
  nombre: string;
  activa: boolean;
  estado: 'Libre' | 'Ocupada' | 'Inactiva' | string;
  turnoActual?: string | null;
  atendidosHoy: number;
}

export interface ReporteTotales {
  total: number;
  enEspera: number;
  llamados: number;
  atendidos: number;
  ausentes: number;
  cancelados: number;
}

export interface ReporteVentanilla {
  id: number;
  codigo: string;
  nombre: string;
  activa: boolean;
  llamados: number;
  atendidos: number;
  ausentes: number;
  atencionPromedioMin: number;
}

export interface ReporteKiosco {
  usuarioId?: number | null;
  username: string;
  nombre: string;
  activo: boolean;
  generados: number;
  enEspera: number;
  enAtencion: number;
  atendidos: number;
  ausentes: number;
  cancelados: number;
}

export interface ReporteDia {
  fechaInicio: string;
  fechaFin: string;
  totales: ReporteTotales;
  porVentanilla: ReporteVentanilla[];
  porKiosco: ReporteKiosco[];
}

export interface AtencionDetalle {
  turnoId: number;
  codigo: string;
  prioridad: number;
  tipo: string;
  tipoEtiqueta: string;
  motivoPrioridad?: string | null;
  estado: string;
  fechaOperacion: string;
  fechaCreacion: string;
  fechaLlamado?: string | null;
  fechaSalida?: string | null;
  duracionMinutos: number;
  llamados: number;
  personaId?: number | null;
  cedula?: string | null;
  tipoDocumento?: string | null;
  tipoDocumentoEtiqueta?: string | null;
  nombrePersona?: string | null;
  telefono?: string | null;
  ventanillaId?: number | null;
  ventanillaCodigo?: string | null;
  ventanillaNombre?: string | null;
  atendidoPorId?: number | null;
  atendidoPorNombre?: string | null;
  atendidoPorUsername?: string | null;
  creadoPorId?: number | null;
  creadoPorNombre?: string | null;
  creadoPorUsername?: string | null;
}

export interface AtencionesPage {
  fechaInicio: string;
  fechaFin: string;
  page: number;
  size: number;
  total: number;
  totalPaginas: number;
  totalVentanillas: number;
  duracionPromedioMin: number;
  items: AtencionDetalle[];
}

/* ---- Pantalla de sala de espera (TV) ---- */

export interface TvLlamado {
  turnoId: number;
  codigo: string;
  nombrePersona?: string | null;
  prioridad: number;
  prioridadEtiqueta: string;
  ventanilla: string;
  ventanillaCodigo?: string | null;
  fechaLlamado: string;
  llamados: number;
}

export interface TvResumen {
  actualizado: string;
  enEspera: number;
  llamados: TvLlamado[];
}
