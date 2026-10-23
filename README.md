# SisbenAgil

Kiosco de autoservicio para la asignación de turnos de **SISBEN**, construido
con **Spring Boot 3 / Java 17** y **Next.js**, sobre **MySQL 8**.

```
SisbenAgil/
├── backend/            API REST (Spring Boot 3, Java 17, Flyway, JPA)
├── frontend/           Kiosco (Next.js App Router, TypeScript, Tailwind)
├── printer-agent/      Agente local de impresión (Node.js)
└── docker-compose.yml  MySQL 8 para desarrollo
```

## 1. Requisitos

| Herramienta | Versión |
|---|---|
| JDK | 17+ |
| Maven | 3.9+ (o usar `backend/mvnw`) |
| Node.js | 20+ |
| Docker | opcional, para MySQL |

## 2. Puesta en marcha

```bash
# 1) Base de datos
docker compose up -d

# 2) Backend (http://localhost:8088)
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run

# 3) Frontend (http://localhost:3001)
cd frontend
npm install
npm run dev -- -p 3001
```

Para imprimir sin el diálogo del navegador, instale y arranque el agente local
en el equipo del kiosco (ver sección 6.1).

Credenciales de desarrollo (MySQL en el puerto **3307**):

```
base de datos : dispensamaster
usuario       : dispensamaster
contraseña    : dispensamaster
root          : root
```

Flyway crea el esquema y carga datos de demostración automáticamente
(`backend/src/main/resources/db/migration`).

Documentación interactiva de la API: <http://localhost:8088/swagger-ui.html>

## 3. Variables de entorno

Backend (`application.yml`, todas con valor por defecto):

| Variable | Default |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `3307` |
| `DB_NAME` | `dispensamaster` |
| `DB_USER` | `dispensamaster` |
| `DB_PASSWORD` | `dispensamaster` |
| `APP_KIOSK_EMPRESA_ID` | `1` |
| `APP_KIOSK_SEDE_ID` | `1` |
| `APP_CORS_ALLOWED_ORIGIN_PATTERNS` | `http://localhost:[*]`, `http://127.0.0.1:[*]`, `https://localhost:[*]`, `http://192.168.*.*:[*]`, `http://10.*.*.*:[*]`, `http://172.*.*.*:[*]` |
| `APP_JWT_SECRET` | `sisbenagil-dev-secret-change-me-before-production-2026` (cámbielo en producción; mínimo 32 caracteres) |
| `APP_JWT_HOURS` | `12` |

Frontend:

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8088/api` |
| `NEXT_PUBLIC_PRINT_AGENT_URL` | `http://127.0.0.1:17777` |

### Acceso desde otro equipo de la red

Si el kiosco se abre desde otra máquina o tablet, `localhost` apunta al
dispositivo, no al servidor. En ese caso cree `frontend/.env.local` con la IP
del servidor:

```bash
NEXT_PUBLIC_API_URL=http://192.168.1.18:8088/api
```

El backend ya acepta orígenes de la red local (`192.168.*`, `10.*`, `172.*`) en
cualquier puerto. Para restringirlos, defina `APP_CORS_ALLOWED_ORIGIN_PATTERNS`
con la lista exacta separada por comas. Las variables `NEXT_PUBLIC_*` se
incorporan al compilar, así que reinicie `npm run dev` después de cambiarlas.

## 4. Flujo del kiosco

```
/               Acceso del operador de kiosco y bienvenida
/cedula         Tipo y número de documento, nombre (teclado físico o en pantalla)
/prioridades    General (GN), Prioritario (PR) o Jurídico (JR)
/ticket         Ticket de 80 mm con botón Imprimir
```

Antes de generar turnos, el operador del kiosco inicia sesión en `/` con su
usuario y contraseña. El inicio muestra el nombre del operador y el botón
**Cambiar** cierra esa sesión. Cada turno guarda el operador que lo creó
(`turno.creador_id`), lo que alimenta el reporte por kiosco. El enlace
**Acceso funcionarios** sigue disponible para el personal administrativo.

En `/cedula` el usuario selecciona el tipo de documento (`CC`, `TI`, `RC`, `CE`,
`PA` o `PEP`), digita el número y presiona **Enter**. Si el documento ya existe,
el sistema completa el campo y muestra en pantalla el **nombre y apellido**
registrados; si es nuevo, habilita el nombre para escribir y crear la persona.
El nombre siempre se guarda y se muestra en **mayúsculas**, y puede corregirse
en el campo antes de continuar. Después se carga automáticamente el único
servicio (SISBEN) y se pasa a la selección del tipo de turno.

En `/prioridades` el usuario elige:

| Tipo | Código | Motivo |
|---|---|---|
| General | `GN-001` | Atención en orden de llegada |
| Prioritario | `PR-001` | Embarazada, Adulto mayor o Discapacitado |
| Jurídico | `JR-001` | Atención y orientación jurídica |

Los turnos generales, prioritarios y jurídicos tienen **consecutivos
independientes** por día. El motivo prioritario se guarda en
`turno.motivo_prioridad` y se imprime en el ticket. Al confirmar, el kiosco navega
a `/ticket`, donde el usuario pulsa **Imprimir turno** para enviar el ticket a la
impresora.

Reglas de negocio relevantes:

- **Numeración atómica por servicio y tipo** (`contador_turno`), sin turnos
  duplicados con varios kioscos concurrentes.
- Solo existe el servicio **SISBEN**; los servicios del kiosco genérico
  anterior quedaron eliminados lógicamente en la migración `V3`.
- `cont_max = 0` significa **sin límite**.
- El tipo de documento (`CC`, `TI`, `RC`, `CE`, `PA`, `PEP`) se guarda en
  `persona.tipo_documento` y se muestra en el ticket.
- El flujo del kiosco no solicita términos, canal, servicio ni teléfono.
- El SMS sigue existiendo en el backend como punto de extensión
  (`LogSmsGateway`), pero no se ofrece en el flujo actual.

### Acceso funcionarios

El personal entra por el enlace discreto **Acceso funcionarios** en la esquina
inferior derecha del inicio del kiosco, o directamente en `/login`.

Los operadores de kiosco no usan este acceso: inician sesión directamente en `/`
y su usuario queda registrado como creador de cada turno. El botón **Cambiar**
en el inicio del kiosco cierra la sesión del operador. Si un administrador inicia
sesión desde el acceso del kiosco, se le redirige al dashboard; desde las
pantallas de administración puede volver al kiosco con el enlace del logo.

```
/login          Usuario y contraseña (JWT)
/dashboard      Indicadores operativos del día (solo ADMIN)
/dashboard/usuarios     Crear, editar nombre y usuario de acceso, activar/desactivar y eliminar usuarios (solo ADMIN)
/dashboard/ventanillas  Crear y activar/desactivar ventanillas (solo ADMIN)
/dashboard/reportes     Reporte por rango de fechas por ventanilla y kiosco (solo ADMIN)
/dashboard/atenciones   Detalle de personas atendidas, ventanilla y exportación CSV (solo ADMIN)
/ventanilla     Llamar, atender, rellamar y marcar ausente (ADMIN y ASESOR)
/tv             Pantalla pública de sala de espera con turnos y voz
```

Al iniciar sesión, el **asesor elige su ventanilla una sola vez** y queda fija
durante toda la sesión; el administrador puede cambiarla desde el encabezado. La
ventanilla muestra un **cronómetro** desde el llamado del turno actual y permite
**elegir cualquier persona de la cola** (con búsqueda por turno, nombre o
documento) además de “Llamar siguiente”. El botón **Finalizar atención** cierra el
turno y deja la ventanilla libre.

Credenciales iniciales de desarrollo (migraciones `V5` y `V6`):

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `asesor` | `asesor123` | ASESOR |
| `asesor2` | `asesor123` | ASESOR |
| `kiosco` | `kiosco123` | KIOSCO |

**Cambie estas contraseñas y `APP_JWT_SECRET` antes de usar el sistema en
producción.** El dashboard muestra turnos del día, cola por tipo, flujo por hora,
estado de cada ventanilla y los turnos recientes; se actualiza automáticamente cada
10 segundos. La ventanilla consulta la cola cada 5 segundos y bloquea el siguiente
turno con `FOR UPDATE SKIP LOCKED` para que dos ventanillas no llamen el mismo
turno.

### Administración y reportes

El administrador puede crear usuarios desde `/dashboard/usuarios`:

| Rol | Uso |
|---|---|
| `ASESOR` | Atiende ventanillas. |
| `KIOSCO` | Inicia sesión en el kiosco y genera turnos. |
| `ADMIN` | Accede al dashboard y a la administración. |

Cada usuario tiene nombre, usuario de acceso y contraseña. Se puede **editar el
nombre y el usuario de acceso**, **activar/desactivar**, **cambiar la contraseña**
y **eliminar**. La
eliminación es lógica: el usuario desaparece de la lista y no puede iniciar
sesión, pero sus turnos históricos se conservan. No se puede desactivar o
eliminar a sí mismo, al último administrador activo ni a un asesor que tenga un
turno en atención. Los usuarios desactivados no pueden iniciar sesión.

En `/dashboard/ventanillas` se crean ventanillas (código y nombre) y se
activan/desactivan. Una ventanilla ocupada debe finalizar su turno antes de
desactivarse; las ventanillas inactivas no aparecen en la ventanilla de los
asesores.

En `/dashboard/reportes` se elige una **fecha inicial y una fecha final** y se
obtiene:

- Totales del rango: generados, en espera, en atención, atendidos, ausentes y cancelados.
- Actividad por ventanilla: llamados, atendidos, ausentes y tiempo promedio de atención.
- Turnos generados por cada operador de kiosco, con su estado y usuario.
- Exportación a CSV (separador `;`, compatible con Excel en español).

Los turnos creados antes de la migración `V6` no tienen operador y aparecen en
el reporte como **Sin operador (histórico)**.

En `/dashboard/atenciones` se consulta el **detalle de las personas atendidas**.
Se puede filtrar por rango de fechas, ventanilla y texto (nombre, cédula, turno,
ventanilla, funcionario o kiosco). Cada fila muestra la persona, su documento, la
ventanilla que la atendió, el funcionario, el operador de kiosco que generó el
turno y los tiempos de llamado/finalización. La exportación CSV incluye **todos
los registros filtrados**, no solo la página visible, con separador `;` y BOM
para abrir correctamente en Excel.

### Pantalla de sala de espera (TV)

`/tv` es pública (no requiere JWT) y está pensada para un televisor o monitor en
la sala. Muestra el último llamado en grande con el **nombre y apellido** de la
persona, los llamados anteriores y el número de personas en espera; se actualiza
cada 3 segundos. No muestra documentos ni teléfonos.

La primera vez hay que pulsar **“Toque la pantalla para habilitar el sonido”**
(los navegadores exigen una interacción para reproducir audio). Después, el sonido
queda **activo por defecto y se recuerda entre recargas**; cualquier toque o tecla
en la pantalla lo vuelve a habilitar si el navegador lo bloqueó.

Para que suene **desde el arranque sin pulsar nada**, use el lanzador
`scripts\iniciar-tv.bat`: abre Chrome o Edge en modo kiosco con
`--autoplay-policy=no-user-gesture-required`, apuntando a `/tv`.

Cada nuevo llamado suena una campana de dos tonos y se anuncia **dos veces** por voz
en español: “Turno prioritario 001. Pase a Ventanilla 1. Repito, turno prioritario
001. Pase a Ventanilla 1.” El botón **Repetir** vuelve a anunciar el último turno, el
de pantalla completa lo deja fijo en el TV y **Silenciar** lo apaga (la preferencia
se guarda). Use Chrome o Edge para la síntesis de voz.

### Orden de la cola

El orden es **prioritarios (PR) primero** y, después, generales (GN) y jurídicos
(JR) por orden de llegada. Cualquier ventanilla puede atender los tres tipos. Un
turno en estado `LLAMADO` ocupa la ventanilla hasta que se marque `ATENDIDO` o
`AUSENTE`; el botón **Rellamar** vuelve a llamar el mismo turno.

## 5. API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/config` | Configuración del kiosco (banderas y textos) |
| GET | `/api/servicios` | Servicios visibles y vigentes |
| GET | `/api/servicios/{id}/subservicios` | Hijos de un servicio compuesto |
| GET | `/api/niveles` | Opciones y subopciones del tercer nivel |
| GET | `/api/personas/buscar?cedula=` | Búsqueda de persona |
| POST | `/api/personas` | Registro / recuperación de persona |
| PATCH | `/api/personas/{id}/telefono` | Actualiza celular |
| POST | `/api/turnos` | Crea el turno (KIOSCO/ADMIN; requiere Bearer token) |
| GET | `/api/turnos/{id}/ticket` | Recupera un ticket existente |
| GET | `/api/tv` | Llamados y en espera para la pantalla TV (público) |
| POST | `/api/auth/login` | Inicia sesión y devuelve el JWT |
| GET | `/api/auth/me` | Valida la sesión actual |
| GET | `/api/dashboard/resumen?fecha=` | Indicadores diarios (ADMIN) |
| GET | `/api/admin/usuarios` | Lista los usuarios (ADMIN) |
| POST | `/api/admin/usuarios` | Crea un usuario (ADMIN) |
| PATCH | `/api/admin/usuarios/{id}` | Actualiza nombre, usuario de acceso, rol, contraseña o estado (ADMIN) |
| DELETE | `/api/admin/usuarios/{id}` | Elimina lógicamente un usuario (ADMIN) |
| GET | `/api/admin/ventanillas` | Lista todas las ventanillas (ADMIN) |
| POST | `/api/admin/ventanillas` | Crea una ventanilla (ADMIN) |
| PATCH | `/api/admin/ventanillas/{id}` | Actualiza nombre o estado (ADMIN) |
| GET | `/api/admin/reportes?fechaInicio=&fechaFin=` | Reporte por rango por ventanilla y kiosco (ADMIN; también acepta `fecha` para un solo día) |
| GET | `/api/admin/reportes/atenciones?fechaInicio=&fechaFin=&ventanillaId=&q=&page=&size=` | Detalle paginado de atenciones finalizadas (ADMIN) |
| GET | `/api/admin/reportes/atenciones/export?fechaInicio=&fechaFin=&ventanillaId=&q=` | Exporta a CSV todas las atenciones filtradas (ADMIN) |
| GET | `/api/ventanilla/ventanillas` | Ventanillas con estado libre/ocupada |
| GET | `/api/ventanilla/estado?ventanillaId=` | Estado y cola de la ventanilla |
| POST | `/api/ventanilla/llamar?ventanillaId=&turnoId=` | Llama el siguiente turno o uno elegido |
| POST | `/api/ventanilla/turnos/{id}/atender?ventanillaId=` | Marca el turno como atendido |
| POST | `/api/ventanilla/turnos/{id}/ausente?ventanillaId=` | Marca el turno como ausente |
| POST | `/api/ventanilla/turnos/{id}/rellamar?ventanillaId=` | Vuelve a llamar el turno |
| GET | `/actuator/health` | Healthcheck |

Las rutas `/api/admin/**` y `/api/dashboard/**` requieren rol ADMIN;
`/api/ventanilla/**` requiere ADMIN o ASESOR. `POST /api/turnos` requiere un token
de KIOSCO o ADMIN; el resto del flujo público del kiosco no requiere sesión.

Ejemplo (use el `id` que devuelve `GET /api/servicios`; en una base nueva es `100`):

```bash
# 1) Token del operador de kiosco (o de un administrador)
curl -X POST http://localhost:8088/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"kiosco","password":"kiosco123"}'

# 2) Use el token devuelto en el campo "token"
TOKEN="<token>"

# Turno general GN
curl -X POST http://localhost:8088/api/turnos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"servicioId":100,"personaId":1,"prioridad":2,"canal":"TURNO"}'

# Turno prioritario PR (Embarazada)
curl -X POST http://localhost:8088/api/turnos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"servicioId":100,"personaId":1,"prioridad":1,"motivoPrioridad":"EMBARAZADA","canal":"TURNO"}'

# Turno jurídico JR
curl -X POST http://localhost:8088/api/turnos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"servicioId":100,"personaId":1,"prioridad":3,"canal":"TURNO"}'
```

Motivos válidos: `EMBARAZADA`, `ADULTO_MAYOR`, `DISCAPACITADO`. La prioridad `3`
corresponde al turno jurídico (`JR`) y no requiere motivo.

El registro de persona (`POST /api/personas`) acepta `tipoDocumento` (`CC`, `TI`,
`RC`, `CE`, `PA` o `PEP`), `cedula`, `nombreCompleto` y `telefono` opcional. La
cédula sigue siendo la clave única de la persona dentro de la empresa y sede.

## 6. Impresión

El ticket se imprime en una **XPrinter XP-T80A** (etiqueta T80A), de 80 mm, USB
y comandos ESC/POS. El área imprimible de **72 mm × 210 mm** se configura con el
driver **XP-80C** en la cola **XP-80C-USB** (`USB002`); el ticket usa un bloque
de **68 mm** centrado. El ticket impreso omite el nombre, el documento y el
tiempo estimado; esos datos solo se muestran en pantalla.

### 6.1 Agente local de impresión (recomendado)

El frontend envía el ticket al **agente local** que corre en el mismo equipo del
kiosco. El agente genera un PDF de 72 mm × 210 mm y lo envía a la cola de
Windows sin mostrar el diálogo de impresión. Funciona desde Chrome, Edge o
cualquier navegador, siempre que el agente esté activo.

Instalación (una sola vez), desde la raíz del proyecto:

```
cd printer-agent
npm install
```

Inicio del agente:

```
scripts\iniciar-agente-impresion.bat
```

Ese lanzador instala las dependencias si faltan, inicia el agente en
`http://127.0.0.1:17777` y deja una ventana con el registro. Para probar la
impresora sin generar un turno real:

```
cd printer-agent
npm run test:print
```

El agente usa la impresora predeterminada de Windows. Para fijar otra cola,
copie `printer-agent\.env.example` como `printer-agent\.env` y ajuste
`PRINT_AGENT_PRINTER`. También puede cambiar el puerto con `PRINT_AGENT_PORT`;
en ese caso actualice `NEXT_PUBLIC_PRINT_AGENT_URL` en `frontend\.env.local` y
reinicie el frontend.

El frontend usa `NEXT_PUBLIC_PRINT_AGENT_URL` (por defecto
`http://127.0.0.1:17777`). El botón **Imprimir turno** intenta primero el agente.
Si el agente no está activo, usa `window.print()` como respaldo; si el kiosco se
abrió con `--kiosk-printing`, ese respaldo también imprime sin diálogo. Si el
agente responde con un error de impresora, no se reintenta por el navegador para
evitar duplicados.

Para iniciar el agente y el kiosco juntos, use el lanzador normal del kiosco:

```
scripts\iniciar-kiosco.bat
```

Ese lanzador comprueba si el agente está activo; si no lo está, lo inicia
minimizado y luego abre el navegador. `scripts\iniciar-kiosco-con-agente.bat`
hace exactamente lo mismo y se conserva como alias explícito.

Para que el agente arranque automáticamente al iniciar sesión en Windows:

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\instalar-agente-inicio.ps1
```

El agente escucha solo en `127.0.0.1` (no queda expuesto a la red). Por defecto
acepta peticiones de `localhost` y de direcciones de red privada; se puede
restringir o ampliar con `PRINT_AGENT_ORIGINS` en `printer-agent\.env`. El
registro se guarda en `printer-agent\agent.log`.

El navegador del kiosco debe ejecutarse en el mismo equipo del agente para usar
`127.0.0.1`. Si el navegador está en otro equipo, configure
`PRINT_AGENT_HOST=0.0.0.0`, abra el puerto en el firewall y use la IP del equipo
de la impresora en `NEXT_PUBLIC_PRINT_AGENT_URL`; hágalo solo en una red de
confianza.

### 6.2 Configuración de la impresora

Deje en Windows:

- Impresora: **XP-80C-USB** (driver **XP-80C**), predeterminada.
- Papel: **80(72.1) x 210 mm** (o el formulario de 72 mm configurado).
- Cuchilla: **Option1**; `SavePaperMode=TopAndBottom`.
- Márgenes: **Ninguno**.
- Encabezados y pies de página: **desactivados**.
- Escala: **100 %**.
- Gráficos de fondo: **activados**.

El espacio en blanco antes del logo no lo genera el CSS. Las pruebas RAW y las
pruebas con la cola **XP-80C-USB** imprimen en el borde superior; el hueco de
unos 30 mm aparecía con el driver genérico **POS-80C**. Usar la cola XP-80C-USB.
Si aun así aparece, revise el offset/avance de la impresora y el tamaño de papel
del driver.

### 6.3 Impresión desde el navegador (respaldo)

Si no se usa el agente, el botón **Imprimir turno** recurre a `window.print()`.
Para abrir el kiosco sin iniciar el agente y que el respaldo imprima sin
diálogo, use:

```
scripts\iniciar-kiosco.bat -SinAgente
```

Ese lanzador abre Chrome o Edge con `--kiosk-printing`, en modo kiosco y con un
perfil propio, y envía el ticket a la impresora predeterminada de Windows. La
primera vez conviene configurar la impresora con:

```
scripts\iniciar-kiosco.bat -Configurar
```

Esa opción abre una ventana normal para generar un turno de prueba y ajustar la
cola, el papel y los márgenes una sola vez. Después cierre esa ventana y abra
`scripts\iniciar-kiosco.bat` para trabajar con impresión directa.

También se puede iniciar manualmente (ajuste el puerto si el frontend corre en
otro):

```
chrome --kiosk-printing --kiosk http://localhost:3001
```

Sin el agente y sin `--kiosk-printing`, el navegador siempre muestra el diálogo
de impresión y JavaScript no puede omitirlo. El agente y el lanzador deben
ejecutarse en la misma máquina donde está conectada la impresora.

## 7. Equivalencias con el sistema legado

| Legacy (PHP) | SisbenAgil |
|---|---|
| `Servidor.php?accion=CargarServicios` | `GET /api/servicios` |
| `accion=CargarSubservicios` | `GET /api/servicios/{id}/subservicios` |
| `accion=BuscarPersona` | `GET /api/personas/buscar` |
| `accion=RegistrarPaciente` | `POST /api/personas` |
| `accion=RegistrarTelPaciente` | `PATCH /api/personas/{id}/telefono` |
| `accion=SacarTurno` | `POST /api/turnos` (token KIOSCO/ADMIN) |
| `accion=CancelarTurno` | `POST /api/turnos/{id}/cancelar` (fase 2) |
| `accion=PrevisualTurno` | eliminado (nunca se usó) |
| `auditoria` + `tablatemporal` | `turno` |
| `servicio.Secuencia` + `reiniciar` | `contador_turno` (por día) |
| `smsatril` | `configuracion` |
| `relacionservicios` | `relacion_servicio` |
| `opciones_idr` / `sub_opciones_id` | `nivel_opcion` / `nivel_subopcion` |

## 8. Integraciones pendientes (interfaces listas)

- `SmsGateway` → hoy `LogSmsGateway` (solo registra en log). Implementar LabsMobile
  cuando se requiera.
- Registraduría / nube: no incluidas en esta fase.
- Panel de asesor: **implementado** con autenticación JWT, dashboard operativo,
  ventanilla (llamar / atender / ausente / rellamar), pantalla TV con voz,
  administración de usuarios y ventanillas, y reportes por rango de fechas por
  ventanilla y por operador de kiosco. La actualización en vivo usa sondeo
  periódico; se puede migrar a SSE/WebSocket cuando se requiera.

## 9. Siguientes pasos sugeridos

1. Migrar el sondeo periódico a SSE/WebSocket para actualizaciones instantáneas.
2. Integración real de SMS y sincronización con la nube.
3. Tests de integración con Testcontainers para la numeración concurrente.
4. Despliegue con Docker multi-stage y variables de entorno seguras.
