'use strict';

const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
  quiet: true,
});

const { imprimirTicket } = require('./lib/printer');

const ticket = {
  codigo: 'TEST-001',
  servicio: 'SISBEN',
  prioridadEtiqueta: 'Prueba de impresión',
  nivel: null,
  personasDelante: 0,
  fechaTexto: new Date().toLocaleString('es-CO'),
  mensaje: 'Prueba del agente local de impresión. Gracias por usar SisbenAgil.',
  empresa: 'SisbenAgil',
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
