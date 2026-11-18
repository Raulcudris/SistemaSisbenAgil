# Agente local de impresión SisbénÁgil

Servicio HTTP que se ejecuta en el mismo equipo del kiosco. Recibe los datos del
ticket desde el frontend, genera un PDF de **72 mm × 210 mm** y lo envía a la
impresora de Windows sin mostrar el diálogo de impresión.

- Escucha solo en `127.0.0.1:17777` por defecto.
- Usa la impresora predeterminada de Windows o la definida en `PRINT_AGENT_PRINTER`.
- Procesa una impresión a la vez para no mezclar trabajos.
- No recibe ni imprime nombre, documento ni tiempo estimado.

## Requisitos

- Windows con la impresora instalada (XP-80C-USB con driver XP-80C).
- Node.js 18 o superior.
- La impresora debe estar configurada como predeterminada o indicada en `.env`.

## Instalación

```bat
cd printer-agent
npm install
```

## Configuración

Copie `.env.example` como `.env` solo si necesita cambiar algo:

| Variable | Por defecto | Descripción |
|---|---|---|
| `PRINT_AGENT_HOST` | `127.0.0.1` | Interfaz donde escucha el agente. |
| `PRINT_AGENT_PORT` | `17777` | Puerto HTTP local. |
| `PRINT_AGENT_PRINTER` | impresora predeterminada | Nombre exacto de la cola de Windows. |
| `PRINT_AGENT_ORIGINS` | localhost y red privada | Orígenes permitidos, separados por comas. `*` permite todos. |

Si cambia el puerto, actualice también `NEXT_PUBLIC_PRINT_AGENT_URL` en
`frontend/.env.local` y reinicie el frontend.

Por defecto el agente solo es accesible desde el mismo equipo. Si el navegador
del kiosco está en otra máquina, cambie `PRINT_AGENT_HOST` a `0.0.0.0`, abra el
puerto en el firewall y configure `NEXT_PUBLIC_PRINT_AGENT_URL` con la IP de este
equipo. Hágalo solo en una red de confianza.

## Inicio

Desde la raíz del proyecto:

```bat
scripts\iniciar-agente-impresion.bat
```

O directamente:

```bat
cd printer-agent
npm start
```

Deje la ventana abierta. Para detenerlo, cierre la ventana o pulse `Ctrl+C`.

## Prueba de impresión

```bat
cd printer-agent
npm run test:print
```

Envía un ticket de prueba a la impresora configurada. No crea turnos ni modifica
la base de datos.

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del agente, impresora activa y colas disponibles. |
| `GET` | `/printers` | Lista de impresoras y predeterminada. |
| `POST` | `/print` | Genera el PDF e imprime el ticket. |

Ejemplo de cuerpo para `POST /print`:

```json
{
  "codigo": "GN-001",
  "servicio": "SISBÉN",
  "prioridadEtiqueta": "General",
  "nivel": null,
  "personasDelante": 2,
  "fechaTexto": "22/10/2026, 10:30 a. m.",
  "mensaje": "Gracias por usar SisbénÁgil. Espere su turno en la sala.",
  "empresa": "SisbénÁgil",
  "sede": "Sede Principal"
}
```

Respuesta correcta:

```json
{
  "ok": true,
  "printer": "XP-80C-USB",
  "mensaje": "Ticket enviado a la impresora."
}
```

## Inicio automático en Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\instalar-agente-inicio.ps1
```

Crea un acceso directo minimizado en la carpeta de Inicio del usuario. Para
quitarlo, elimine el acceso directo **SisbénÁgil Agente de Impresion** de
`shell:startup`.

## Diagnóstico

- **No imprime y el agente responde 503:** revise que la impresora esté
  conectada, encendida y que el nombre en `PRINT_AGENT_PRINTER` coincida con
  `Get-Printer`.
- **El frontend muestra "Agente local no disponible":** el agente no está
  corriendo o el puerto no coincide. Abra `http://127.0.0.1:17777/health` en el
  navegador del kiosco.
- **Error de origen no permitido:** agregue el origen del frontend a
  `PRINT_AGENT_ORIGINS` o use la URL local del kiosco.
- **Papel con mucho espacio en blanco:** el PDF usa el mismo alto de 210 mm que
  el diseño anterior. Revise el tamaño de papel del driver.
- **Registro:** `printer-agent/agent.log`.

## Estructura

```
printer-agent/
  agent.js              Servidor HTTP y validación
  lib/printer.js        Cola de impresión y envío a Windows
  lib/ticket-pdf.js     Generación del PDF de 72 mm
  test-print.js         Ticket de prueba
  .env.example          Variables de configuración
```
