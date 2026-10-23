import type { Ticket } from './types';

const AGENT_URL = (
  process.env.NEXT_PUBLIC_PRINT_AGENT_URL ?? 'http://127.0.0.1:17777'
).replace(/\/+$/, '');

const TIMEOUT_MS = 15000;

export interface PrintAgentResponse {
  ok: boolean;
  printer?: string;
  mensaje?: string;
  error?: string;
}

export class PrintAgentError extends Error {
  readonly noDisponible: boolean;
  readonly timeout: boolean;

  constructor(mensaje: string, noDisponible: boolean, timeout = false) {
    super(mensaje);
    this.name = 'PrintAgentError';
    this.noDisponible = noDisponible;
    this.timeout = timeout;
  }
}

export async function imprimirTicketAgente(
  ticket: Ticket,
): Promise<PrintAgentResponse> {
  const controller = new AbortController();
  const temporizador = globalThis.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let response: Response;

    try {
      response = await fetch(`${AGENT_URL}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: ticket.codigo,
          servicio: ticket.servicio,
          prioridadEtiqueta: ticket.prioridadEtiqueta,
          nivel: ticket.nivel ?? null,
          personasDelante: ticket.personasDelante,
          fechaTexto: ticket.fechaTexto,
          mensaje: ticket.mensaje,
          empresa: ticket.empresa,
          sede: ticket.sede,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const esTimeout = error instanceof DOMException && error.name === 'AbortError';
      throw new PrintAgentError(
        esTimeout
          ? 'El agente de impresión no respondió a tiempo.'
          : 'No se pudo conectar con el agente de impresión local.',
        true,
        esTimeout,
      );
    }

    let body: PrintAgentResponse | null = null;
    try {
      body = (await response.json()) as PrintAgentResponse;
    } catch {
      // El agente siempre responde JSON; si no, se usa el mensaje genérico.
    }

    if (!response.ok) {
      throw new PrintAgentError(
        body?.error ?? 'El agente de impresión no pudo imprimir el ticket.',
        false,
      );
    }

    return body ?? { ok: true };
  } finally {
    globalThis.clearTimeout(temporizador);
  }
}
