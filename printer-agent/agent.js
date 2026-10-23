'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
  quiet: true,
});

const { getDefaultPrinter, getPrinters } = require('pdf-to-printer');
const { estadoImpresoras, imprimirTicket } = require('./lib/printer');

const VERSION = require('./package.json').version;
const HOST = process.env.PRINT_AGENT_HOST || '127.0.0.1';
const PORT = Number(process.env.PRINT_AGENT_PORT || 17777);
const MAX_BODY = 64 * 1024;
const LOG_PATH = path.join(__dirname, 'agent.log');

function log(...partes) {
  const linea = `[${new Date().toISOString()}] ${partes.join(' ')}`;
  console.log(linea);
  try {
    fs.appendFileSync(LOG_PATH, `${linea}\n`, 'utf8');
  } catch {
    // Si no se puede escribir el log, la consola sigue funcionando.
  }
}

function responderJson(res, status, datos) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(datos));
}

function esOrigenPermitido(origin) {
  if (!origin) {
    return true;
  }

  const configurados = (process.env.PRINT_AGENT_ORIGINS || '')
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);

  if (configurados.includes('*') || configurados.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
      return true;
    }
    if (/^10\./.test(host) || /^192\.168\./.test(host)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return true;
    }
  } catch {
    // Origen inválido.
  }

  return false;
}

function aplicarCors(req, res) {
  const origin = req.headers.origin;
  if (origin && esOrigenPermitido(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function leerJson(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let total = 0;
    let fallado = false;

    req.on('data', (parte) => {
      if (fallado) {
        return;
      }
      total += parte.length;
      if (total > MAX_BODY) {
        fallado = true;
        reject(new Error('El cuerpo de la solicitud es demasiado grande.'));
        req.resume();
        return;
      }
      partes.push(parte);
    });

    req.on('end', () => {
      if (fallado) {
        return;
      }
      try {
        const texto = Buffer.concat(partes).toString('utf8') || '{}';
        resolve(JSON.parse(texto));
      } catch {
        reject(new Error('El JSON de la solicitud no es válido.'));
      }
    });

    req.on('error', (error) => {
      if (!fallado) {
        fallado = true;
        reject(error);
      }
    });
  });
}

function texto(valor, maximo) {
  if (typeof valor !== 'string') {
    return '';
  }
  return valor
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, maximo);
}

function normalizarTicket(body) {
  const codigo = texto(body.codigo, 20);
  if (!codigo) {
    throw new Error('El código del turno es obligatorio.');
  }

  const personas = Number(body.personasDelante);
  return {
    codigo,
    servicio: texto(body.servicio, 150) || 'SISBEN',
    prioridadEtiqueta: texto(body.prioridadEtiqueta, 50) || 'General',
    nivel: texto(body.nivel, 120) || null,
    personasDelante: Number.isFinite(personas)
      ? Math.max(0, Math.trunc(personas))
      : 0,
    fechaTexto: texto(body.fechaTexto, 100) || new Date().toLocaleString('es-CO'),
    mensaje: texto(body.mensaje, 300),
    empresa: texto(body.empresa, 100) || 'SisbenAgil',
    sede: texto(body.sede, 100),
  };
}

const server = http.createServer(async (req, res) => {
  aplicarCors(req, res);

  const origin = req.headers.origin;
  if (origin && !esOrigenPermitido(origin)) {
    responderJson(res, 403, {
      ok: false,
      error: 'Origen no permitido por el agente de impresión.',
    });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    try {
      const estado = await estadoImpresoras();
      const configurada = (process.env.PRINT_AGENT_PRINTER || '').trim();
      const activa = configurada || estado.defaultPrinter;
      responderJson(res, 200, {
        ok: Boolean(activa),
        version: VERSION,
        uptimeSeg: Math.round(process.uptime()),
        printer: activa,
        defaultPrinter: estado.defaultPrinter,
        printers: estado.printers,
      });
    } catch (error) {
      responderJson(res, 503, {
        ok: false,
        error: error instanceof Error ? error.message : 'No se pudieron consultar las impresoras.',
      });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/printers') {
    try {
      const estado = await estadoImpresoras();
      responderJson(res, 200, { ok: true, ...estado });
    } catch (error) {
      responderJson(res, 503, {
        ok: false,
        error: error instanceof Error ? error.message : 'No se pudieron consultar las impresoras.',
      });
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/print') {
    try {
      const body = await leerJson(req);
      const ticket = normalizarTicket(body);
      const resultado = await imprimirTicket(ticket);
      log(`Ticket ${ticket.codigo} enviado a ${resultado.printer}.`);
      responderJson(res, 200, {
        ok: true,
        printer: resultado.printer,
        mensaje: 'Ticket enviado a la impresora.',
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'No se pudo imprimir el ticket.';
      log(`Error al imprimir: ${mensaje}`);
      const esSolicitudInvalida = /obligatorio|JSON|demasiado grande/i.test(mensaje);
      responderJson(res, esSolicitudInvalida ? 400 : 503, {
        ok: false,
        error: mensaje,
      });
    }
    return;
  }

  responderJson(res, 404, { ok: false, error: 'Ruta no encontrada.' });
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    log(`El puerto ${PORT} ya está en uso. ¿El agente ya está ejecutándose?`);
  } else {
    log('Error del servidor:', error instanceof Error ? error.stack : String(error));
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  log(`Agente de impresión SisbenAgil v${VERSION} en http://${HOST}:${PORT}`);
  log(`Node ${process.version} · ${process.platform}`);
  getDefaultPrinter()
    .then((impresora) => {
      log(`Impresora predeterminada: ${impresora?.name ?? 'no configurada'}`);
    })
    .catch((error) => {
      log(`No se pudo consultar la impresora predeterminada: ${error.message}`);
    });
  getPrinters()
    .then((impresoras) => {
      log(`Impresoras disponibles: ${impresoras.map((p) => p.name).join(', ') || 'ninguna'}`);
    })
    .catch(() => {
      // El detalle ya se muestra en /health.
    });
});

for (const senal of ['SIGINT', 'SIGTERM']) {
  process.on(senal, () => {
    log(`Recibida señal ${senal}. Cerrando agente...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

process.on('unhandledRejection', (motivo) => {
  log('Promesa rechazada sin manejar:', motivo instanceof Error ? motivo.stack : String(motivo));
});
