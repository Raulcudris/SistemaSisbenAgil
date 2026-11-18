# Manual: build de Java y Next.js y publicación en Docker Hub

Guía paso a paso para compilar el backend (Spring Boot / Java 17) y el frontend
(React / Next.js 15), construir las imágenes de Docker y publicarlas en Docker
Hub para desplegarlas en el servidor.

> Esta guía es manual. Si prefieres un solo comando, usa
> `scripts\publicar-imagenes.ps1` (ver sección 8).

---

## 1. Requisitos en el equipo de desarrollo

| Herramienta | Versión | Comprobación |
|---|---|---|
| Java JDK | 17 | `java -version` |
| Maven | 3.9+ (o el wrapper incluido) | `.\mvnw.cmd -v` |
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| Docker Desktop | Actualizado | `docker version` |
| Cuenta Docker Hub | `raulcudris` | `docker login` |

Todos los comandos están escritos para **Windows PowerShell**. En Linux/macOS
cambia `.\mvnw.cmd` por `./mvnw` y las rutas `.\backend` por `./backend`.

---

## 2. Variables de versión

Las versiones se controlan en `.env` (cópialo de `.env.example` si no existe):

```powershell
Copy-Item .env.example .env
```

Contenido relevante:

```ini
DOCKERHUB_USERNAME=raulcudris
BACKEND_VERSION=2.0.0
FRONTEND_VERSION=2.0.0
FRONTEND_PORT=3001
BACKEND_PORT=8088
```

Las imágenes que se publican serán:

```
raulcudris/digiturno-backend:2.0.0
raulcudris/digiturno-frontend:2.0.0
```

---

## 3. Build manual del backend (Java / Spring Boot)

```powershell
cd C:\React\DispensaMasterV2\backend

# Compila y empaqueta el jar (sin ejecutar tests)
.\mvnw.cmd clean package -DskipTests
```

Si tienes Maven instalado globalmente también sirve:

```powershell
mvn clean package -DskipTests
```

Resultado:

```
backend\target\dispensamaster-backend-2.0.0.jar
```

Comprobación rápida del jar:

```powershell
Get-Item target\dispensamaster-backend-2.0.0.jar | Select-Object Name, Length
```

> El backend necesita MySQL para arrancar. Para probarlo solo, usa la base de
> desarrollo (`docker compose -f docker-compose.yml up -d`) y luego:
>
> ```powershell
> java -jar target\dispensamaster-backend-2.0.0.jar
> ```
>
> La configuración de desarrollo usa `localhost:3307` y la base
> `dispensamaster`. Para producción se usan las variables `DB_*` del `.env`.

---

## 4. Build manual del frontend (React / Next.js)

```powershell
cd C:\React\DispensaMasterV2\frontend

# Instala exactamente las dependencias del package-lock
npm ci

# Next lee API_INTERNAL_URL en tiempo de build para el rewrite /api
$env:API_INTERNAL_URL = "http://localhost:8088"

npm run build
```

Resultado: carpeta `frontend\.next\`.

Para previsualizar la build de producción:

```powershell
npm start
```

Abre `http://localhost:3000`.

> `API_INTERNAL_URL` se incrusta en la build. Para el contenedor del servidor
> debe ser `http://digiturno-backend:8088` (nombre del servicio en Docker). Ese
> valor lo pasa el `Dockerfile` mediante un `--build-arg`; no lo cambies en el
> `.env` del servidor.

> El `.dockerignore` del frontend excluye `.env*`, así que tu `.env.local` de
> desarrollo no se copia dentro de la imagen. En el contenedor, el navegador
> llama a `/api` relativo y Next lo reenvía al backend.

Verificación de TypeScript (opcional):

```powershell
npm run typecheck
```

---

## 5. Build de las imágenes de Docker

> Los `docker build` compilan de nuevo dentro del contenedor: **no reutilizan**
> la carpeta `backend\target` ni `frontend\.next` locales. Los pasos 3 y 4
> sirven para verificar el código antes de dockerizar; las imágenes son
> reproducibles desde el código fuente.

### 5.1 Backend

```powershell
cd C:\React\DispensaMasterV2

docker build -t raulcudris/digiturno-backend:2.0.0 .\backend
```

La imagen compila el jar dentro de Maven y solo copia el JRE + jar al resultado
final (Alpine). No necesitas tener Maven instalado para este paso.

### 5.2 Frontend

```powershell
docker build `
  --build-arg API_INTERNAL_URL=http://digiturno-backend:8088 `
  -t raulcudris/digiturno-frontend:2.0.0 `
  .\frontend
```

En una sola línea:

```powershell
docker build --build-arg API_INTERNAL_URL=http://digiturno-backend:8088 -t raulcudris/digiturno-frontend:2.0.0 .\frontend
```

> El nombre `digiturno-backend` es el servicio del `docker-compose` de
> producción. Si cambias el nombre del servicio, cambia también este argumento.

### 5.3 Verificar las imágenes

```powershell
docker images | Select-String "digiturno"
```

Deberías ver:

```
raulcudris/digiturno-backend     2.0.0    ...    ~516MB
raulcudris/digiturno-frontend    2.0.0    ...    ~285MB
```

> **Arquitectura**: si compilas en un Mac con Apple Silicon, añade
> `--platform linux/amd64` a ambos `docker build` para que corran en el servidor
> Windows x86_64.

---

## 6. Probar el stack completo antes de publicar

```powershell
cd C:\React\DispensaMasterV2

docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Espera a que MySQL arranque y comprueba:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env ps
```

Pruebas mínimas:

```powershell
# Frontend
(Invoke-WebRequest http://localhost:3001/ -UseBasicParsing).StatusCode

# API a través del proxy de Next
Invoke-RestMethod http://localhost:3001/api/config

# Login (usuario inicial de desarrollo)
Invoke-RestMethod -Method Post -Uri http://localhost:3001/api/auth/login `
  -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'

# Salud del backend
Invoke-RestMethod http://localhost:8088/actuator/health
```

Detener sin borrar datos:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env down
```

Detener y borrar la base de prueba:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env down -v
```

---

## 7. Publicar en Docker Hub (manual)

### 7.1 Iniciar sesión

```powershell
docker login
```

Usuario: `raulcudris`. Si tienes 2FA, usa un **Access Token** de Docker Hub como
contraseña, no la contraseña de la cuenta.

### 7.2 Etiquetar también como `latest`

```powershell
docker tag raulcudris/digiturno-backend:2.0.0  raulcudris/digiturno-backend:latest
docker tag raulcudris/digiturno-frontend:2.0.0 raulcudris/digiturno-frontend:latest
```

### 7.3 Subir las cuatro etiquetas

```powershell
docker push raulcudris/digiturno-backend:2.0.0
docker push raulcudris/digiturno-backend:latest

docker push raulcudris/digiturno-frontend:2.0.0
docker push raulcudris/digiturno-frontend:latest
```

En el primer `push`, Docker Hub crea los repositorios automáticamente.

### 7.4 Verificar la publicación

```powershell
docker buildx imagetools inspect raulcudris/digiturno-backend:2.0.0
docker buildx imagetools inspect raulcudris/digiturno-frontend:2.0.0
```

O abre en el navegador:

```
https://hub.docker.com/r/raulcudris/digiturno-backend/tags
https://hub.docker.com/r/raulcudris/digiturno-frontend/tags
```

### 7.5 Descargar en el servidor

```powershell
cd C:\Digiturno
docker compose -f docker-compose.server.yml --env-file .env pull
docker compose -f docker-compose.server.yml --env-file .env up -d
```

Si los repositorios son **privados**, ejecuta `docker login` también en el
servidor. Si son públicos (como ahora), no hace falta.

---

## 8. Alternativa automática (un solo comando)

El script hace build con Compose, etiqueta `latest` y publica todo:

```powershell
cd C:\React\DispensaMasterV2
scripts\publicar-imagenes.ps1
```

Para una versión nueva:

```powershell
scripts\publicar-imagenes.ps1 -Version 2.0.1
```

Solo construir y etiquetar, sin subir:

```powershell
scripts\publicar-imagenes.ps1 -SinPush
```

Equivale a los pasos 5, 7.2 y 7.3, usando las versiones de `.env`.

---

## 9. Cambiar de versión (checklist)

Cuando publiques una versión nueva, actualiza en este orden:

1. `.env`:

   ```ini
   BACKEND_VERSION=2.0.1
   FRONTEND_VERSION=2.0.1
   ```

2. `backend\pom.xml`:

   ```xml
   <version>2.0.1</version>
   ```

3. `frontend\package.json` (opcional, solo para trazabilidad):

   ```json
   "version": "2.0.1"
   ```

4. Reconstruye y publica:

   ```powershell
   scripts\publicar-imagenes.ps1
   ```

5. En el servidor, actualiza `BACKEND_VERSION` y `FRONTEND_VERSION` en su `.env`:

   ```powershell
   docker compose -f docker-compose.server.yml --env-file .env pull
   docker compose -f docker-compose.server.yml --env-file .env up -d
   ```

> El `backend\Dockerfile` copia `target\dispensamaster-backend-*.jar`, así que
> no hay que editar la ruta del jar al cambiar la versión del `pom.xml`.

---

## 10. Problemas frecuentes

| Síntoma | Causa / solución |
|---|---|
| `denied: requested access to the resource is denied` | No iniciaste sesión o el usuario no es el dueño. Ejecuta `docker login` con `raulcudris`. |
| `pull access denied` en el servidor | Repositorio privado. Ejecuta `docker login` en el servidor. |
| `COPY ... dispensamaster-backend-*.jar: not found` | El `pom.xml` cambió de `artifactId`. Ajusta el patrón del `Dockerfile`. |
| El frontend muestra error al llamar `/api` | La imagen se compiló con otro `API_INTERNAL_URL`. Reconstruye con `--build-arg API_INTERNAL_URL=http://digiturno-backend:8088`. |
| El backend no arranca en el servidor | MySQL aún inicializando. Espera; Hikari y Flyway reintentan hasta 60 s. Revisa `docker compose logs -f digiturno-backend`. |
| Puerto 3001 u 8088 ocupado | Cambia `FRONTEND_PORT`/`BACKEND_PORT` en `.env` y ejecuta `scripts\verificar-conflictos.ps1`. |
| `unauthorized: incorrect username or password` | Usa un Access Token de Docker Hub, no la contraseña de la cuenta. |
| La imagen no arranca en el servidor (`exec format error`) | Se compiló para ARM. Reconstruye con `--platform linux/amd64`. |

---

## 11. Limpieza segura

```powershell
# Elimina solo imágenes sin etiqueta (dangling)
docker image prune -f

# Ver espacio usado por Docker
docker system df
```

> **No ejecutes `docker system prune -a` en el servidor**: borraría también las
> imágenes de la aplicación de Sisbén (`appsisben`) que ya está corriendo.
> Digiturno debe ser independiente; limpia solo sus propias imágenes si hace
> falta.

---

## 12. Resumen de comandos

```powershell
# 1. Backend: compilar
cd C:\React\DispensaMasterV2\backend
.\mvnw.cmd clean package -DskipTests

# 2. Frontend: compilar
cd ..\frontend
npm ci
$env:API_INTERNAL_URL = "http://localhost:8088"
npm run build

# 3. Imágenes Docker
cd ..
docker build -t raulcudris/digiturno-backend:2.0.0 .\backend
docker build --build-arg API_INTERNAL_URL=http://digiturno-backend:8088 -t raulcudris/digiturno-frontend:2.0.0 .\frontend

# 4. Publicar
docker login
docker tag raulcudris/digiturno-backend:2.0.0  raulcudris/digiturno-backend:latest
docker tag raulcudris/digiturno-frontend:2.0.0 raulcudris/digiturno-frontend:latest
docker push raulcudris/digiturno-backend:2.0.0
docker push raulcudris/digiturno-backend:latest
docker push raulcudris/digiturno-frontend:2.0.0
docker push raulcudris/digiturno-frontend:latest

# 5. Servidor
cd C:\Digiturno
docker compose -f docker-compose.server.yml --env-file .env pull
docker compose -f docker-compose.server.yml --env-file .env up -d
```
