# Construye las imágenes de Digiturno y las publica en Docker Hub.
#
# Uso:
#   scripts\publicar-imagenes.ps1                 # usa las versiones de .env
#   scripts\publicar-imagenes.ps1 -Version 2.0.1  # cambia backend y frontend
#   scripts\publicar-imagenes.ps1 -SinPush        # solo construye y etiqueta
#
# Antes de publicar:
#   docker login
param(
    [string]$EnvFile = ".env",
    [string]$Version = "",
    [switch]$SinPush
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent

function Resolver-Ruta([string]$ruta) {
    if ([System.IO.Path]::IsPathRooted($ruta)) { return $ruta }
    return (Join-Path $raiz $ruta)
}

$compose = Join-Path $raiz "docker-compose.prod.yml"
$envPath = Resolver-Ruta $EnvFile

if (-not (Test-Path $envPath)) {
    Write-Error "No se encontró $envPath. Copie .env.example como .env."
    exit 1
}

# Lectura simple del .env
$config = @{}
Get-Content $envPath | ForEach-Object {
    $linea = $_.Trim()
    if ($linea -and -not $linea.StartsWith("#") -and $linea.Contains("=")) {
        $pos = $linea.IndexOf("=")
        $clave = $linea.Substring(0, $pos).Trim()
        $valor = $linea.Substring($pos + 1).Trim().Trim("'").Trim('"')
        $config[$clave] = $valor
    }
}

$usuario = $config["DOCKERHUB_USERNAME"]
if (-not $usuario) {
    Write-Error "Defina DOCKERHUB_USERNAME en $envPath."
    exit 1
}

$backendVersion = if ($Version) { $Version } else { $config["BACKEND_VERSION"] }
$frontendVersion = if ($Version) { $Version } else { $config["FRONTEND_VERSION"] }
if (-not $backendVersion -or -not $frontendVersion) {
    Write-Error "Defina BACKEND_VERSION y FRONTEND_VERSION en $envPath (o use -Version)."
    exit 1
}

# Las variables de entorno tienen prioridad sobre el archivo .env en Compose,
# así que -Version se aplica también al nombre de la imagen.
$env:BACKEND_VERSION = $backendVersion
$env:FRONTEND_VERSION = $frontendVersion

$backendImagen = "$usuario/digiturno-backend:$backendVersion"
$frontendImagen = "$usuario/digiturno-frontend:$frontendVersion"

Write-Host "== Construyendo imágenes ==" -ForegroundColor Cyan
Write-Host "  backend : $backendImagen"
Write-Host "  frontend: $frontendImagen"
Write-Host ""

docker compose -f $compose --env-file $envPath build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Falló la construcción de las imágenes."
    exit 1
}

Write-Host ""
Write-Host "== Etiquetando :latest ==" -ForegroundColor Cyan
docker tag $backendImagen "$usuario/digiturno-backend:latest"
if ($LASTEXITCODE -ne 0) { exit 1 }
docker tag $frontendImagen "$usuario/digiturno-frontend:latest"
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "[OK] $usuario/digiturno-backend:latest"
Write-Host "[OK] $usuario/digiturno-frontend:latest"

if (-not $SinPush) {
    Write-Host ""
    Write-Host "== Publicando en Docker Hub ==" -ForegroundColor Cyan
    Write-Host "Si falla con 'denied', ejecute primero: docker login" -ForegroundColor Yellow
    Write-Host ""

    docker push $backendImagen
    if ($LASTEXITCODE -ne 0) {
        Write-Error "No se pudo publicar $backendImagen."
        exit 1
    }
    docker push "$usuario/digiturno-backend:latest"
    if ($LASTEXITCODE -ne 0) { exit 1 }

    docker push $frontendImagen
    if ($LASTEXITCODE -ne 0) {
        Write-Error "No se pudo publicar $frontendImagen."
        exit 1
    }
    docker push "$usuario/digiturno-frontend:latest"
    if ($LASTEXITCODE -ne 0) { exit 1 }

    Write-Host ""
    Write-Host "[OK] Imágenes publicadas." -ForegroundColor Green
}

Write-Host ""
Write-Host "== Siguiente paso en el servidor ==" -ForegroundColor Cyan
Write-Host "  docker compose -f docker-compose.server.yml --env-file .env pull"
Write-Host "  docker compose -f docker-compose.server.yml --env-file .env up -d"
Write-Host ""
Write-Host "Recuerde que el .env del servidor debe tener la misma versión:"
Write-Host "  DOCKERHUB_USERNAME=$usuario"
Write-Host "  BACKEND_VERSION=$backendVersion"
Write-Host "  FRONTEND_VERSION=$frontendVersion"

exit 0
