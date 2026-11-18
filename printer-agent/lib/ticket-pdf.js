'use strict';

const fs = require('node:fs');
const PDFDocument = require('pdfkit');

const MM = 72 / 25.4;
const PAGE_WIDTH = 72 * MM;
const PAGE_HEIGHT = 210 * MM;
const MARGIN_X = 2 * MM;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

function mm(valor) {
  return valor * MM;
}

function linea(doc, y, discontinua) {
  doc.save();
  doc.moveTo(MARGIN_X, y)
    .lineTo(PAGE_WIDTH - MARGIN_X, y)
    .lineWidth(0.5)
    .strokeColor('#9ca3af');

  if (discontinua) {
    doc.dash(1.5, { space: 1.5 });
  }

  doc.stroke();
  doc.restore();
}

/**
 * Genera el PDF de 72 mm x 210 mm que se envía a la impresora térmica.
 * No incluye nombre, documento ni tiempo estimado.
 */
async function crearPdfTicket(ticket, rutaSalida) {
  const doc = new PDFDocument({
    size: [PAGE_WIDTH, PAGE_HEIGHT],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: true,
    info: {
      Title: `Turno ${ticket.codigo}`,
      Author: 'SisbénÁgil',
      Subject: 'Ticket de turno SISBÉN',
    },
  });

  const stream = fs.createWriteStream(rutaSalida);
  doc.pipe(stream);
  const finalizado = new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  let y = mm(4);

  const centrar = (texto, opciones = {}) => {
    doc.text(texto, MARGIN_X, y, {
      width: CONTENT_WIDTH,
      align: 'center',
      ...opciones,
    });
    y = doc.y;
  };

  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(18);
  centrar('SisbénÁgil');

  y += mm(0.5);
  doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#4b5563');
  centrar('TURNOS SISBÉN', { characterSpacing: 1.2 });

  y += mm(3);
  linea(doc, y, false);
  y += mm(4);

  doc.fillColor('#374151').font('Helvetica-Bold').fontSize(7);
  centrar('TURNO', { characterSpacing: 2 });

  y += mm(1);
  doc.fillColor('#000000').font('Helvetica-Bold').fontSize(34);
  centrar(ticket.codigo);

  y += mm(2);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
  centrar(ticket.servicio);

  y += mm(0.5);
  doc.font('Helvetica').fontSize(8);
  centrar(ticket.prioridadEtiqueta);

  if (ticket.nivel) {
    y += mm(0.5);
    centrar(`Nivel: ${ticket.nivel}`);
  }

  y += mm(3);
  linea(doc, y, true);
  y += mm(3);

  doc.fillColor('#111827').font('Helvetica').fontSize(8.5);
  doc.text(`Personas antes: ${ticket.personasDelante}`, MARGIN_X, y, {
    width: CONTENT_WIDTH,
    align: 'left',
  });
  y = doc.y + mm(3);

  linea(doc, y, true);
  y += mm(3);

  doc.font('Helvetica').fontSize(8).fillColor('#111827');
  centrar(ticket.fechaTexto);

  if (ticket.mensaje) {
    y += mm(1);
    doc.font('Helvetica').fontSize(8).fillColor('#111827');
    centrar(ticket.mensaje, { lineGap: 1 });
  }

  y += mm(2);
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#000000');
  centrar([ticket.empresa, ticket.sede].filter(Boolean).join(' · '));

  y += mm(0.5);
  doc.font('Helvetica-Bold').fontSize(7);
  centrar('Turnos SISBÉN');

  doc.end();
  await finalizado;
  return rutaSalida;
}

module.exports = {
  crearPdfTicket,
  PAGE_WIDTH,
  PAGE_HEIGHT,
};
