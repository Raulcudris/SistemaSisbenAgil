'use strict';

const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
  quiet: true,
});

const { imprimirTicket } = require('./lib/printer');

const ticket = {
  codigo: 'TEST-001',
  servicio: 'SISBÉN',
  prioridadEtiqueta: 'Prueba de impresión',
  nivel: null,
  personasDelante: 0,
  fechaTexto: new Date().toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }),
  mensaje: 'Prueba del agente local de impresión. Gracias por usar SisbénÁgil.',
  empresa: 'SisbénÁgil',
  sede: 'Sede Principal',
};

imprimirTicket(ticket)
  .then((resultado) => {
    console.log(`Ticket de prueba enviado a ${resultado.printer}.`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
