# SisbénÁgil

Kiosco de autoservicio para la asignación de turnos de **SISBÉN**, construido
con **Spring Boot 3 / Java 17** y **Next.js**, sobre **MySQL 8**.

```
SisbénÁgil/
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
# 1) Base de datos (--wait espera a que MySQL esté listo para conexiones)
docker compose up -d --wait

# 2) Backend (http://localhost:8088)
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run

# 3) Frontend (http://localhost:3001)
cd frontend
npm install
npm run dev -- -p 3001
```

> En el primer arranque MySQL crea los archivos de datos y puede tardar unos
> 20-30 s en aceptar conexiones. Si el backend se inicia antes, Spring Boot
> falla con `Unable to start web server` / `entityManagerFactory`. Espere a que
> el contenedor aparezca como `healthy` (`docker compose ps`) o use `--wait`.

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
| `DB_INIT_FAIL_TIMEOUT_MS` | `60000` (espera máxima al conectar al arrancar) |
| `APP_KIOSK_EMPRESA_ID` | `1` |
| `APP_KIOSK_SEDE_ID` | `1` |
| `APP_CORS_ALLOWED_ORIGIN_PATTERNS` | `http://localhost:[*]`, `http://127.0.0.1:[*]`, `https://localhost:[*]`, `http://192.168.*.*:[*]`, `http://10.*.*.*:[*]`, `http://172.*.*.*:[*]` |
| `APP_JWT_SECRET` | `sisbenagil-dev-secret-change-me-before-production-2026` (cámbielo en producción; mínimo 32 caracteres) |
| `APP_JWT_HOURS` | `12` |

Frontend:

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` (relativo; Next.js lo reenvía al backend) |
| `NEXT_PUBLIC_PRINT_AGENT_URL` | `http://127.0.0.1:17777` |

### Acceso desde otro equipo de la red

El frontend llama a `/api` en su propio origen y Next.js reenvía la petición al
backend (`API_INTERNAL_URL`, por defecto `http://localhost:8088`). Por eso el
kiosco funciona igual desde `localhost` que desde la IP del servidor, sin
recompilar ni configurar direcciones.

Solo si desea que el navegador llame **directamente** al backend (sin proxy),
defina en `frontend/.env.local`:

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

El inicio incluye el botón **Ver cola del día**, con los contadores de turnos
en espera y personas que no asistieron. Al abrirlo se muestran tres filas por
tipo (**Prioritarios**, **Generales** y **Jurídicos**) actualizadas cada 8
segundos, con turno, nombre y tiempo de espera. Debajo aparece la lista
**No asistieron**, con turno, nombre, hora del llamado y ventanilla. Esta vista
de apoyo no muestra documentos ni teléfonos.

En la misma ventana, la parte superior muestra las **ventanillas libres**. El
operador puede pulsar **Asignar** en cualquier turno en espera y elegir una de
esas ventanillas: el turno pasa a `LLAMADO` en la ventanilla seleccionada, como
si el asesor lo hubiera llamado. Si no hay ventanillas libres, el botón queda
deshabilitado.

En `/cedula` el usuario selecciona el tipo de documento (`CC`, `TI`, `RC`, `CE`,
`PA` o `PEP`), digita el número y presiona **Enter**. Si el documento ya existe,
el sistema completa el campo y muestra en pantalla el **nombre y apellido**
registrados; si es nuevo, habilita el nombre para escribir y crear la persona.
El nombre siempre se guarda y se muestra en **mayúsculas**, solo admite letras,
espacios, apóstrofos y guiones (no números), y puede corregirse en el campo antes
de continuar. Después se carga automáticamente el único
servicio (SISBÉN) y se pasa a la selección del tipo de turno.

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
- Solo existe el servicio **SISBÉN**; los servicios del kiosco genérico
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
/dashboard/ventanillas  Crear, editar y activar/desactivar ventanillas (solo ADMIN)
/dashboard/reportes     Reporte por rango de fechas por ventanilla y kiosco (solo ADMIN)
/dashboard/atenciones   Detalle de personas atendidas, ventanilla y exportación CSV (solo ADMIN)
/ventanilla     Llamar, iniciar/finalizar atención, rellamar y marcar ausente (ADMIN y ASESOR)
/tv             Pantalla pública de sala de espera con turnos y voz
```

Al iniciar sesión, el **asesor elige su ventanilla una sola vez** y queda fija
durante toda la sesión; el administrador puede cambiarla desde el encabezado. La
ventanilla muestra un **cronómetro** desde que se pulsa **Iniciar atención** y permite
**elegir cualquier persona de la cola** (con búsqueda por turno, nombre o
documento) además de “Llamar siguiente”. La cola se muestra en tres filas separadas
(**Prioritarios**, **Generales** y **Jurídicos**) con turno, persona, documento y
tiempo de espera; desde cada fila se puede llamar un turno. **Iniciar atención**
comienza el conteo; **Finalizar atención** cierra el turno y deja la ventanilla libre.
Si una persona no asistió, el turno queda en el historial como `AUSENTE`; cuando
regrese, el asesor puede pulsar **Rellamar** en esa fila (con la ventanilla libre)
para volver a llamarla y atenderla.

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

Cada usuario tiene nombre, usuario de acceso y contraseña. El usuario de acceso
debe tener entre 4 y 60 caracteres y solo puede contener letras, números, punto
(`.`), guion (`-`) o guion bajo (`_`); no se permiten espacios ni tildes. Se puede
**editar el nombre y el usuario de acceso**, **activar/desactivar**, **cambiar la
contraseña** y **eliminar**. La
eliminación es lógica: el usuario desaparece de la lista y no puede iniciar
sesión, pero sus turnos históricos se conservan. No se puede desactivar o
eliminar a sí mismo, al último administrador activo ni a un asesor que tenga un
turno activo (llamado o en atención). Los usuarios desactivados no pueden iniciar sesión.

En `/dashboard/ventanillas` se crean ventanillas (código y nombre) y se
activan/desactivan. Cada ventanilla se puede **editar** para cambiar su código y
su nombre; el código es único por sede y acepta hasta 20 letras, números o
guiones. Una ventanilla ocupada debe finalizar o marcar ausente su turno activo
antes de desactivarse; las ventanillas inactivas no aparecen en la ventanilla de
los asesores.

En `/dashboard/reportes` se elige una **fecha inicial y una fecha final** y se
obtiene:

- Totales del rango: generados, en espera, llamados sin finalizar, atendidos, ausentes y cancelados.
- Actividad por ventanilla: llamados, atendidos, ausentes y tiempo promedio de atención.
- Turnos generados por cada operador de kiosco, con su estado y usuario.
- Exportación a CSV (separador `;`, compatible con Excel en español).

Los turnos creados antes de la migración `V6` no tienen operador y aparecen en
el reporte como **Sin operador (histórico)**.

En `/dashboard/atenciones` se consulta el **detalle de las personas atendidas**.
Se puede filtrar por rango de fechas, ventanilla y texto (nombre, cédula, turno,
ventanilla, funcionario o kiosco). Cada fila muestra la persona, su documento, la
ventanilla que la atendió, el funcionario, el operador de kiosco que generó el
turno y los tiempos de llamado, inicio de atención y finalización. La exportación CSV incluye **todos
los registros filtrados**, no solo la página visible, con separador `;` y BOM
para abrir correctamente en Excel.

### Pantalla de sala de espera (TV)

`/tv` es pública (no requiere JWT) y está pensada para un televisor o monitor en
la sala. Muestra el último llamado en grande con el **nombre y apellido** de la
persona, los llamados anteriores en un panel más amplio y el número de personas
en espera. La tipografía es grande para que se lea desde lejos y la pantalla se
actualiza cada segundo. No muestra documentos ni teléfonos.

La primera vez hay que pulsar **“Toque la pantalla para habilitar el sonido”**
(los navegadores exigen una interacción para reproducir audio). Después, el sonido
queda **activo por defecto y se recuerda entre recargas**; cualquier toque o tecla
en la pantalla lo vuelve a habilitar si el navegador lo bloqueó.

Para que suene **desde el arranque sin pulsar nada**, use el lanzador
`scripts\iniciar-tv.bat`: abre Chrome o Edge en modo kiosco con
`--autoplay-policy=no-user-gesture-required`, apuntando a `/tv`.

Cada nuevo llamado suena una campana de dos tonos y se anuncia **dos veces** por voz
en español con el **nombre completo** de la persona. Por ejemplo, para `GN-010` y
ventanilla 22: “Turno G N diez. Miguel David Suarez. Diríjase a ventanilla
número veintidós. Repito. Turno G N diez. Miguel David Suarez. Diríjase a
ventanilla número veintidós.” El prefijo se lee con sus letras (`GN` → G N,
`PR` → P R, `JR` → J R) y los números se leen en palabras (10 = diez,
22 = veintidós, 33 = treinta y tres), no dígito por dígito, y los nombres se
normalizan para que la voz los pronuncie de corrido. Entre un llamado y el siguiente
hay una pausa de **5 segundos** para que las voces no se encimen. El botón
**Repetir** vuelve a anunciar el último turno, el botón de pantalla completa lo deja
fijo en el TV y **Silenciar** lo apaga (la preferencia se guarda). Use Chrome o Edge
para la síntesis de voz; la pantalla usa la **primera voz española disponible** en
el navegador, la misma que se utilizaba antes de los ajustes de pronunciación.

Si hay **varios televisores** abriendo `/tv`, todos calculan la hora del anuncio
con la hora del servidor. Así el mismo llamado suena al mismo tiempo en todos y no
se escucha primero en uno y después repetido en el otro. Para que la sincronización
funcione, los televisores deben estar encendidos y con la página abierta antes de
que se realice el llamado.

### Orden de la cola

El orden es **prioritarios (PR) primero** y, después, generales (GN) y jurídicos
(JR) por orden de llegada. Cualquier ventanilla puede atender los tres tipos. Al
llamar, el turno queda en `LLAMADO` y ocupa la ventanilla, pero el cronómetro de
atención **no inicia**: el asesor debe pulsar **Iniciar atención** cuando la persona
llegue. Desde ese momento puede **Finalizar atención**; **Rellamar** está disponible
mientras no se haya iniciado y **No asistió** en cualquier momento. Si el turno
quedó `AUSENTE`, **Rellamar** aparece en el historial para recuperarlo cuando la
persona regrese. El turno se libera al finalizar o marcarlo ausente.

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
| GET | `/api/kiosco/cola` | Turnos en espera, ausentes y ventanillas libres del día (KIOSCO/ADMIN) |
| POST | `/api/kiosco/asignar?turnoId=&ventanillaId=` | Asigna un turno en espera a una ventanilla libre (KIOSCO/ADMIN) |
| POST | `/api/auth/login` | Inicia sesión y devuelve el JWT |
| GET | `/api/auth/me` | Valida la sesión actual |
| GET | `/api/dashboard/resumen?fecha=` | Indicadores diarios (ADMIN) |
| GET | `/api/admin/usuarios` | Lista los usuarios (ADMIN) |
| POST | `/api/admin/usuarios` | Crea un usuario (ADMIN) |
| PATCH | `/api/admin/usuarios/{id}` | Actualiza nombre, usuario de acceso, rol, contraseña o estado (ADMIN) |
| DELETE | `/api/admin/usuarios/{id}` | Elimina lógicamente un usuario (ADMIN) |
| GET | `/api/admin/ventanillas` | Lista todas las ventanillas (ADMIN) |
| POST | `/api/admin/ventanillas` | Crea una ventanilla (ADMIN) |
| PATCH | `/api/admin/ventanillas/{id}` | Actualiza código, nombre o estado (ADMIN) |
| GET | `/api/admin/reportes?fechaInicio=&fechaFin=` | Reporte por rango por ventanilla y kiosco (ADMIN; también acepta `fecha` para un solo día) |
| GET | `/api/admin/reportes/atenciones?fechaInicio=&fechaFin=&ventanillaId=&q=&page=&size=` | Detalle paginado de atenciones finalizadas (ADMIN) |
| GET | `/api/admin/reportes/atenciones/export?fechaInicio=&fechaFin=&ventanillaId=&q=` | Exporta a CSV todas las atenciones filtradas (ADMIN) |
| GET | `/api/ventanilla/ventanillas` | Ventanillas con estado libre/ocupada |
| GET | `/api/ventanilla/estado?ventanillaId=` | Estado y cola de la ventanilla |
| POST | `/api/ventanilla/llamar?ventanillaId=&turnoId=` | Llama el siguiente turno o uno elegido |
| POST | `/api/ventanilla/turnos/{id}/iniciar-atencion?ventanillaId=` | Inicia el cronómetro de atención |
| POST | `/api/ventanilla/turnos/{id}/atender?ventanillaId=` | Finaliza la atención (requiere haberla iniciado) |
| POST | `/api/ventanilla/turnos/{id}/ausente?ventanillaId=` | Marca el turno como ausente |
| POST | `/api/ventanilla/turnos/{id}/rellamar?ventanillaId=` | Vuelve a llamar un turno llamado o ausente (antes de iniciar la atención) |
| GET | `/actuator/health` | Healthcheck |

Las rutas `/api/admin/**` y `/api/dashboard/**` requieren rol ADMIN;
`/api/ventanilla/**` requiere ADMIN o ASESOR y `/api/kiosco/**` requiere ADMIN o
KIOSCO. `POST /api/turnos` requiere un token de KIOSCO o ADMIN; el resto del flujo
público del kiosco no requiere sesión.

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

| Legacy (PHP) | SisbénÁgil |
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

## 10. Despliegue con Docker en un servidor local

El archivo `docker-compose.prod.yml` levanta cuatro contenedores: MySQL, el
servicio de copias de seguridad, el backend y el frontend. Solo se publican dos
puertos en el host, ninguno de los que ya están ocupados en el servidor (80,
3000, 6095, 8069, 8080, 2404):

| Servicio | Puerto host | Puerto contenedor |
|---|---|---|
| frontend (kiosco, dashboard, TV) | **3001** | 3000 |
| backend (API y Swagger) | **8088** | 8088 |
| backup (copias de la base) | *no se publica* | — |
| MySQL | *no se publica* | 3306 |

MySQL queda aislado en la red interna de Docker, así que no choca con el
contenedor de desarrollo que usa el puerto 3307 ni queda expuesto a la red.

Hay dos archivos según dónde se ejecute:

| Archivo | Uso |
|---|---|
| `docker-compose.prod.yml` | Equipo de desarrollo: compila backend y frontend (`--build`). |
| `docker-compose.server.yml` | Servidor: descarga las imágenes ya publicadas en Docker Hub. |

El flujo completo de publicación y despliegue está en la **sección 11**.

### Independencia respecto a la aplicación de Sisbén (`appsisben`)

Digiturno es un stack **totalmente independiente**. No comparte código, base de
datos, red, volumen, contenedores ni imágenes con `appsisben`. Lo único común es
el host con Docker y los puertos, que se eligen libres.

En el servidor ya corre `appsisben` con esta ocupación:

| Recurso | appsisben | Digiturno | ¿Comparten? |
|---|---|---|---|
| Proyecto Compose | `appsisben` | `digiturno` | No |
| Red | `appsisben_appsisben-network` | `digiturno_default` | No |
| Volumen MySQL | `appsisben_mysql_data` | `digiturno_mysql_data` | No |
| Base de datos | `app_sisben_web_candidate` | `dispensamaster` (MySQL propio) | No |
| Backend | `backend:6095` | `digiturno-backend:8088` | No |
| Frontend | `frontend:3000` | `digiturno-frontend:3000` | No |
| Proxy | Nginx `appsisben-proxy` en 8097 | *no usa el Nginx de appsisben* | No |
| MySQL en el host | `127.0.0.1:3307` | *no publica puerto* | No |
| Imágenes | `raulcudris/appsisben-*` | `raulcudris/digiturno-*` | No |

Por tanto:

- **No se toca ni se modifica** el compose, el Nginx, la base ni los
  contenedores de `appsisben`.
- Digiturno no se conecta a la red de appsisben ni comparte su MySQL.
- Se entra directo a `http://IP_DEL_SERVIDOR:3001`; no depende del proxy 8097.
- Cada stack se actualiza, reinicia o elimina por separado.
- Si se elimina Digiturno con `docker compose down -v`, appsisben sigue intacto.

Antes de desplegar, ejecute la verificación automática:

```powershell
scripts\verificar-conflictos.ps1 -ComposeFile docker-compose.server.yml
```

Comprueba que 3001 y 8088 estén libres, que no choquen con los puertos de
appsisben y que no existan contenedores, red o volumen previos con conflicto.
Si aparece un choque, cambie `FRONTEND_PORT` o `BACKEND_PORT` en `.env`.

> **Base de datos propia**: Digiturno usa su propio contenedor MySQL (`mysql:8.0`)
> con base `dispensamaster` y sus propias credenciales. No reutiliza
> `app_sisben_web_candidate`, ni el usuario `appsisben`, ni su contraseña.
> No publique este MySQL en 3307: ese puerto ya está tomado por appsisben.

> **Recursos del host**: al convivir con appsisben habrá dos MySQL, dos JVM y dos
> servidores Next.js. Reserve al menos ~2 GB de RAM adicionales y compruébelo con
> `docker stats`. Es el único recurso compartido.

### 10.1 Preparar el entorno

```powershell
Copy-Item .env.example .env
```

Edite `.env` y cambie como mínimo:

- `DB_PASSWORD` y `MYSQL_ROOT_PASSWORD`
- `APP_JWT_SECRET` (32 caracteres o más; puede generar uno con `openssl rand -base64 48`)

Si necesita otros puertos, cambie `FRONTEND_PORT` y `BACKEND_PORT`.

### 10.2 Construir y levantar

```powershell
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

`--build` compila las dos imágenes a partir de `backend/Dockerfile` y
`frontend/Dockerfile`. El orden está controlado con healthchecks: el backend
espera a que MySQL esté sano y el frontend espera a que el backend responda.

### 10.3 Direcciones de acceso

Reemplace `IP_DEL_SERVIDOR` por la IP del equipo (por ejemplo `192.168.1.50`):

| Pantalla | URL |
|---|---|
| Kiosco | `http://IP_DEL_SERVIDOR:3001` |
| Acceso funcionarios | `http://IP_DEL_SERVIDOR:3001/login` |
| Dashboard | `http://IP_DEL_SERVIDOR:3001/dashboard` |
| Ventanilla | `http://IP_DEL_SERVIDOR:3001/ventanilla` |
| Pantalla TV | `http://IP_DEL_SERVIDOR:3001/tv` |
| API / Swagger | `http://IP_DEL_SERVIDOR:8088/swagger-ui.html` |

El navegador solo habla con el puerto 3001; Next.js reenvía `/api` al backend
dentro de la red de Docker. Por eso no hay que configurar la IP en el frontend.

### 10.4 Abrir el firewall del servidor

En Windows (PowerShell como administrador):

```powershell
New-NetFirewallRule -DisplayName "SisbenAgil frontend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
New-NetFirewallRule -DisplayName "SisbenAgil backend" -Direction Inbound -Protocol TCP -LocalPort 8088 -Action Allow
```

En Linux con `ufw`:

```bash
sudo ufw allow 3001/tcp
sudo ufw allow 8088/tcp
```

### 10.5 Operación

```powershell
# Estado y salud de los contenedores
docker compose -f docker-compose.prod.yml ps

# Logs en vivo
docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar sin reconstruir
docker compose -f docker-compose.prod.yml restart

# Detener (conserva la base de datos)
docker compose -f docker-compose.prod.yml down

# Detener y borrar también los datos (¡destructivo!)
docker compose -f docker-compose.prod.yml down -v

# Copias de seguridad: ver la sección 10.7
scripts\backup-db.ps1
```

Para actualizar el código: `git pull`, luego
`docker compose -f docker-compose.prod.yml --env-file .env up -d --build`.
Flyway aplica las migraciones nuevas al arrancar el backend.

### 10.6 Agente de impresión (equipo del kiosco)

El agente (`printer-agent`) **no va en el servidor ni en un contenedor**: usa la
cola de impresión de Windows y el driver de la impresora física. Se ejecuta en
el mismo PC donde está conectada la impresora (el kiosco).

1. Copie la carpeta `printer-agent` al PC del kiosco (o todo el proyecto).
2. Instale Node.js 18 o superior.
3. Instale dependencias y arranque:

   ```powershell
   cd printer-agent
   npm install --omit=dev
   Copy-Item .env.example .env   # solo si necesita cambiar algo
   npm start
   ```

4. Compruebe el estado en el navegador del kiosco:
   `http://127.0.0.1:17777/health` (debe listar la impresora).
5. Pruebe un ticket:

   ```powershell
   npm run test:print
   ```

6. Arranque el navegador del kiosco apuntando al **servidor**:

   ```powershell
   scripts\iniciar-kiosco.bat -Url http://IP_DEL_SERVIDOR:3001
   ```

7. Para que arranque con Windows:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\instalar-agente-inicio.ps1
   ```

El agente escucha en `127.0.0.1:17777` del kiosco. Por eso `127.0.0.1` en el
navegador del kiosco apunta al agente local aunque el frontend esté en el
servidor. No abra ese puerto al firewall salvo que el navegador del kiosco se
ejecute en otra máquina.

### 10.7 Copias de seguridad de la base de datos

El servicio `digiturno-backup` (imagen `mysql:8.0`) ejecuta `mysqldump` contra la base y
guarda el resultado comprimido en la carpeta `backups/` del servidor, que está
montada en el contenedor como `/backups`. Los archivos sobreviven a
`docker compose down` y a la recreación de la base.

Cada copia se llama `dispensamaster_AAAA-MM-DD_HH-MM-SS.sql.gz` y se genera con
`--single-transaction`, así que **no bloquea** el kiosco mientras se ejecuta.

#### Copias automáticas

Por defecto se ejecuta **una copia diaria a las 02:00** (zona `America/Bogota`)
y se conservan **14 días**. Se configura en `.env`:

```ini
BACKUP_SCHEDULE_TIME=02:00
BACKUP_RETENTION_DAYS=14
```

Al superar la retención, las copias más antiguas se eliminan automáticamente.
El servicio queda esperando entre copia y copia, sin consumir recursos
apreciables.

#### Copia manual (inmediata)

```powershell
scripts\backup-db.ps1
```

Equivale a:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env exec -T digiturno-backup /scripts/backup-mysql.sh
```

Al terminar se muestra el archivo creado y las últimas copias disponibles.

#### Ver y verificar las copias

```powershell
# Listar copias
Get-ChildItem backups\*.sql.gz | Sort-Object LastWriteTime -Descending

# Comprobar que el archivo no está corrupto
docker compose -f docker-compose.prod.yml --env-file .env exec -T digiturno-backup sh -c "gunzip -t /backups/ARCHIVO.sql.gz && echo OK"
```

#### Restaurar una copia

```powershell
scripts\restore-db.ps1 -Archivo backups\dispensamaster_2026-11-17_02-00-00.sql.gz
```

Pide confirmación escribiendo `SI`. Para automatizar (sin pregunta):

```powershell
scripts\restore-db.ps1 -Archivo backups\dispensamaster_2026-11-17_02-00-00.sql.gz -Force
```

La restauración reemplaza el contenido de la base. Después conviene reiniciar el
backend para descartar conexiones con metadatos antiguos:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env restart digiturno-backend
```

#### Guardar las copias fuera del servidor

La carpeta `backups/` está en el mismo disco del servidor: si el disco falla, se
pierden también las copias. Copie periódicamente los archivos a otro equipo o a
una unidad de red, por ejemplo con el Programador de tareas de Windows:

```powershell
robocopy C:\React\DispensaMasterV2\backups \\SERVIDOR-NAS\respaldo\sisbenagil *.sql.gz /S /R:1 /W:1
```

Las copias contienen datos personales y hashes de contraseñas: protéjalas con
los permisos adecuados y no las suba a repositorios ni servicios públicos.

## 11. Publicar imágenes en Docker Hub y desplegar en el servidor

Flujo: en el equipo de desarrollo se construyen y publican las imágenes; en el
servidor solo se descargan y se levantan. Así el servidor **no necesita Maven,
Node.js ni el código fuente**.

### 11.1 Requisitos

- Docker Desktop funcionando en el equipo de desarrollo.
- Cuenta de Docker Hub (la del proyecto es `raulcudris`).
- Sesión iniciada: `docker login`.
- En `.env`:

  ```ini
  DOCKERHUB_USERNAME=raulcudris
  BACKEND_VERSION=2.0.3
  FRONTEND_VERSION=2.0.3
  ```

Los repositorios `digiturno-backend` y `digiturno-frontend` se crean solos en el
primer `push`. Pueden ser públicos o privados; si son privados, el servidor
también debe hacer `docker login`.

### 11.2 Construir y publicar

> Guía manual paso a paso (comandos de Maven, Next.js, `docker build` y
> `docker push`): [`README-BUILD-DOCKERHUB.md`](README-BUILD-DOCKERHUB.md).

```powershell
docker login
scripts\publicar-imagenes.ps1
```

El script:

1. Construye backend y frontend con `docker-compose.prod.yml`.
2. Etiqueta las imágenes con la versión de `.env` y con `latest`.
3. Publica en Docker Hub:

   ```
   raulcudris/digiturno-backend:2.0.3
   raulcudris/digiturno-backend:latest
   raulcudris/digiturno-frontend:2.0.3
   raulcudris/digiturno-frontend:latest
   ```

Para una versión nueva:

```powershell
scripts\publicar-imagenes.ps1 -Version 2.0.3
```

y actualice `BACKEND_VERSION` y `FRONTEND_VERSION` en el `.env` del servidor.
Para construir sin publicar (pruebas): `scripts\publicar-imagenes.ps1 -SinPush`.

Equivalente manual:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env build

docker tag raulcudris/digiturno-backend:2.0.3  raulcudris/digiturno-backend:latest
docker push raulcudris/digiturno-backend:2.0.3
docker push raulcudris/digiturno-backend:latest

docker tag raulcudris/digiturno-frontend:2.0.3 raulcudris/digiturno-frontend:latest
docker push raulcudris/digiturno-frontend:2.0.3
docker push raulcudris/digiturno-frontend:latest
```

> Las imágenes **no llevan secretos**: `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD` y
> `APP_JWT_SECRET` se inyectan en tiempo de ejecución desde el `.env` del
> servidor. No agregue el `.env` al contexto de build.

### 11.3 Archivos que se copian al servidor

Solo estos (el código de `backend/` y `frontend/` no es necesario):

```
C:\Digiturno\          (o C:\Java\Digiturno\; cualquier carpeta sirve)
  docker-compose.server.yml
  docker-compose.dbeaver.yml   (opcional, ver 11.9)
  docker-compose.adminer.yml   (opcional, ver 11.9)
  .env
  scripts\
    backup-mysql.sh
    backup-loop.sh
    restore-mysql.sh
    backup-db.ps1
    restore-db.ps1
    verificar-conflictos.ps1
    desplegar-servidor.ps1
  backups\            (vacía; aquí se guardan los .sql.gz)
```

Cree el `.env` del servidor a partir de `.env.example` y configure las
contraseñas, el JWT, el usuario de Docker Hub y las versiones. Los dos archivos
`docker-compose.*.yml` de herramientas son opcionales y no intervienen en el
despliegue normal.

### 11.4 Desplegar en el servidor

La forma más simple, con un solo comando:

```powershell
cd C:\Digiturno
scripts\desplegar-servidor.ps1
```

Ese script hace: verificación de conflictos, `pull`, `up -d`, espera a que el
backend y el frontend respondan, muestra el estado y las URLs de acceso.

Equivalente manual:

```powershell
cd C:\Digiturno

# 1. Comprobar que no haya conflictos con los servicios existentes
scripts\verificar-conflictos.ps1 -ComposeFile docker-compose.server.yml

# 2. Descargar las imágenes
docker compose -f docker-compose.server.yml --env-file .env pull

# 3. Levantar
docker compose -f docker-compose.server.yml --env-file .env up -d

# 4. Estado
docker compose -f docker-compose.server.yml --env-file .env ps
```

Si los repositorios son privados, ejecute `docker login` antes del `pull`.
La primera vez, Flyway crea el esquema y carga los datos iniciales.

Accesos:

| Pantalla | URL |
|---|---|
| Kiosco | `http://192.168.1.30:3001` |
| Login | `http://192.168.1.30:3001/login` |
| Dashboard | `http://192.168.1.30:3001/dashboard` |
| Ventanilla | `http://192.168.1.30:3001/ventanilla` |
| TV | `http://192.168.1.30:3001/tv` |
| Swagger | `http://192.168.1.30:8088/swagger-ui.html` |

### 11.5 Actualizar una versión

1. En desarrollo: cambie el código, suba la versión y publique.

   ```powershell
   scripts\publicar-imagenes.ps1 -Version 2.0.3
   ```

2. En el servidor: actualice `BACKEND_VERSION` y `FRONTEND_VERSION` en `.env` y:

   ```powershell
   docker compose -f docker-compose.server.yml --env-file .env pull
   docker compose -f docker-compose.server.yml --env-file .env up -d
   docker image prune -f
   ```

Flyway aplica las migraciones nuevas al arrancar el backend. Las copias de
seguridad siguen funcionando sin cambios.

#### Actualizar solo backend y frontend sin tocar la base de datos

Si ya hay datos y solo cambió el backend o el frontend, actualice únicamente
esos dos servicios. No use `down` ni `down -v`: el volumen
`digiturno_mysql_data` debe permanecer intacto.

```powershell
cd C:\Digiturno

# 1. Descargar solo las imágenes de la aplicación
docker compose -f docker-compose.server.yml --env-file .env pull digiturno-backend digiturno-frontend

# 2. Recrear solo backend y frontend; la base y el backup no se tocan
docker compose -f docker-compose.server.yml --env-file .env up -d --no-deps --force-recreate digiturno-backend digiturno-frontend

# 3. Comprobar estado
docker compose -f docker-compose.server.yml --env-file .env ps
```

Este flujo no borra la base, no elimina el volumen y no reinicia MySQL. El
backend solo valida y aplica las migraciones pendientes de Flyway; en esta
versión no hay migraciones nuevas.

### 11.6 Volver a una versión anterior

Cambie las versiones en `.env` por las anteriores, descargue y levante:

```powershell
docker compose -f docker-compose.server.yml --env-file .env pull
docker compose -f docker-compose.server.yml --env-file .env up -d
```

> Las migraciones de Flyway son solo hacia adelante. Antes de volver a una
> versión anterior, confirme que el esquema sea compatible o restaure una copia
> con `scripts\restore-db.ps1`.

### 11.7 Comandos útiles en el servidor

```powershell
# Logs
docker compose -f docker-compose.server.yml logs -f digiturno-backend
docker compose -f docker-compose.server.yml logs -f digiturno-frontend

# Copia manual de la base
scripts\backup-db.ps1 -ComposeFile docker-compose.server.yml

# Detener sin borrar datos
docker compose -f docker-compose.server.yml down

# Estado de salud
docker compose -f docker-compose.server.yml ps
```

### 11.8 Por qué el agente de impresión no va a Docker Hub

El agente usa `pdf-to-printer`, que invoca la cola de impresión de **Windows** y
el driver de la impresora térmica. Un contenedor Linux en el servidor no puede
imprimir en la impresora del kiosco, y un contenedor Windows requeriría el
driver y la sesión del host, algo frágil y innecesario.

Por eso el agente se instala directamente en el PC del kiosco (ver sección
10.6). El frontend en Docker lo llama desde el navegador en
`http://127.0.0.1:17777`, que es el propio kiosco.

### 11.9 Ver la base de datos con DBeaver o Adminer

El MySQL de Digiturno **no publica ningún puerto** en el despliegue normal.
Para inspeccionarlo hay dos overlays opcionales; ninguno forma parte del
arranque habitual y no afectan a `appsisben`.

#### Opción A: DBeaver (cliente MySQL)

En el servidor:

```powershell
cd C:\Digiturno
docker compose -f docker-compose.server.yml -f docker-compose.dbeaver.yml --env-file .env up -d digiturno-db
```

Eso publica MySQL **solo en `127.0.0.1:3308`** del servidor. En DBeaver
(driver MySQL 8+):

| Campo | Valor |
|---|---|
| Host | `127.0.0.1` |
| Puerto | `3308` |
| Base | `dispensamaster` |
| Usuario | `dispensamaster` |
| Contraseña | valor de `DB_PASSWORD` en `.env` |

URL JDBC sugerida:

```
jdbc:mysql://127.0.0.1:3308/dispensamaster?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=America/Bogota
```

Si DBeaver está en **otro PC** de la red, agregue al `.env` del servidor:

```ini
DB_VIEW_BIND=0.0.0.0
```

Abra el puerto 3308 solo en la red local y conéctese a `192.168.1.30:3308`:

```powershell
New-NetFirewallRule -DisplayName "Digiturno MySQL temporal" -Direction Inbound -Protocol TCP -LocalPort 3308 -Action Allow
```

Para cerrar el acceso, vuelva a levantar la base sin el overlay:

```powershell
docker compose -f docker-compose.server.yml --env-file .env up -d digiturno-db
```

> Recrear el contenedor de MySQL no borra los datos: el volumen
> `digiturno_mysql_data` se conserva. Habrá una interrupción de pocos segundos.
> No exponga el puerto 3308 a Internet.

#### Opción B: Adminer (navegador, recomendada)

No publica MySQL; Adminer entra por la red interna de Docker:

```powershell
cd C:\Digiturno
docker compose -f docker-compose.server.yml -f docker-compose.adminer.yml --env-file .env up -d digiturno-adminer
```

Abra `http://192.168.1.30:8099` y use:

| Campo | Valor |
|---|---|
| Sistema | MySQL |
| Servidor | `digiturno-db` |
| Usuario | `dispensamaster` |
| Contraseña | valor de `DB_PASSWORD` en `.env` |
| Base | `dispensamaster` |

Para quitarlo:

```powershell
docker compose -f docker-compose.server.yml -f docker-compose.adminer.yml --env-file .env rm -sf digiturno-adminer
```

> `DB_PASSWORD` es la contraseña del usuario de la aplicación. Para entrar como
> `root`, use `MYSQL_ROOT_PASSWORD`. No confunda este MySQL con el de
> `appsisben`, que escucha en `127.0.0.1:3307`.




