'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { print, getDefaultPrinter, getPrinters } = require('pdf-to-printer');
const { crearPdfTicket } = require('./ticket-pdf');

let cola = Promise.resolve();

function encolar(tarea) {
  const resultado = cola.then(tarea, tarea);
  cola = resultado.catch(() => {});
  return resultado;
}

async function resolverImpresora() {
  const configurada = (process.env.PRINT_AGENT_PRINTER || '').trim();
  if (configurada) {
    const impresoras = await getPrinters();
    const existe = impresoras.some((impresora) => impresora.name === configurada);
    if (!existe) {
      throw new Error(`La impresora "${configurada}" no está instalada en Windows.`);
    }
    return configurada;
  }

  const predeterminada = await getDefaultPrinter();
  if (!predeterminada?.name) {
    throw new Error('No hay una impresora predeterminada configurada en Windows.');
  }
  return predeterminada.name;
}

/**
 * Genera el PDF y lo envía a la cola de impresión de Windows.
 * Las solicitudes se procesan de una en una para no mezclar trabajos.
 */
async function imprimirTicket(ticket) {
  return encolar(async () => {
    const impresora = await resolverImpresora();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sisbenagil-print-'));
    const nombreArchivo = `${ticket.codigo.replace(/[^A-Za-z0-9-]/g, '') || 'turno'}-${Date.now()}.pdf`;
    const archivo = path.join(dir, nombreArchivo);

    try {
      await crearPdfTicket(ticket, archivo);
      await print(archivo, {
        printer: impresora,
        silent: true,
        printDialog: false,
        copies: 1,
      });
      return { printer: impresora };
    } finally {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {
        // Windows puede tardar un instante en liberar el PDF; se limpia luego.
      });
    }
  });
}

async function estadoImpresoras() {
  const [predeterminada, impresoras] = await Promise.all([
    getDefaultPrinter(),
    getPrinters(),
  ]);
  return {
    defaultPrinter: predeterminada?.name ?? null,
    printers: impresoras.map((impresora) => impresora.name),
  };
}

module.exports = {
  imprimirTicket,
  estadoImpresoras,
};
