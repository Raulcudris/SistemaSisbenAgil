# Despliegue completo en el SERVIDOR con las imágenes de Docker Hub.
# Hace: verificación de conflictos -> pull -> up -> comprobación de salud.
#
# Uso:
#   scripts\desplegar-servidor.ps1
#   scripts\desplegar-servidor.ps1 -EnvFile .env -ComposeFile docker-compose.server.yml
#   scripts\desplegar-servidor.ps1 -SinPreflight   # omite la comprobación de puertos
param(
    [string]$EnvFile = ".env",
    [string]$ComposeFile = "docker-compose.server.yml",
    [switch]$SinPreflight
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent

function Resolver-Ruta([string]$ruta) {
    if ([System.IO.Path]::IsPathRooted($ruta)) { return $ruta }
    return (Join-Path $raiz $ruta)
}

$compose = Resolver-Ruta $ComposeFile
$envPath = Resolver-Ruta $EnvFile

if (-not (Test-Path $compose)) {
    Write-Error "No se encontró $compose"
    exit 1
}
if (-not (Test-Path $envPath)) {
    Write-Error "No se encontró $envPath. Copie el .env de producción."
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

$frontendPort = if ($config["FRONTEND_PORT"]) { [int]$config["FRONTEND_PORT"] } else { 3001 }
$backendPort = if ($config["BACKEND_PORT"]) { [int]$config["BACKEND_PORT"] } else { 8088 }

Push-Location $raiz
try {
    if (-not $SinPreflight) {
        Write-Host "== 1/4 Verificando conflictos ==" -ForegroundColor Cyan
        $preflight = Join-Path $PSScriptRoot "verificar-conflictos.ps1"
        & powershell -NoProfile -ExecutionPolicy Bypass -File $preflight -ComposeFile $ComposeFile -EnvFile $EnvFile
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Hay conflictos. Corrija .env antes de desplegar."
            exit 1
        }
    }

    Write-Host ""
    Write-Host "== 2/4 Descargando imágenes ==" -ForegroundColor Cyan
    docker compose -f $compose --env-file $envPath pull
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falló el pull. Si los repos son privados: docker login"
        exit 1
    }

    Write-Host ""
    Write-Host "== 3/4 Levantando contenedores ==" -ForegroundColor Cyan
    docker compose -f $compose --env-file $envPath up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falló docker compose up."
        exit 1
    }

    Write-Host ""
    Write-Host "== 4/4 Comprobando salud ==" -ForegroundColor Cyan
    $backendOk = $false
    $frontendOk = $false
    for ($i = 0; $i -lt 60; $i++) {
        if (-not $backendOk) {
            try {
                $h = Invoke-RestMethod "http://localhost:$backendPort/actuator/health" -TimeoutSec 3
                if ($h.status -eq "UP") { $backendOk = $true }
            } catch { }
        }
        if (-not $frontendOk) {
            try {
                $r = Invoke-WebRequest "http://localhost:$frontendPort/" -UseBasicParsing -TimeoutSec 3
                if ($r.StatusCode -eq 200) { $frontendOk = $true }
            } catch { }
        }
        if ($backendOk -and $frontendOk) { break }
        Start-Sleep -Seconds 2
    }

    docker compose -f $compose --env-file $envPath ps

    Write-Host ""
    if ($backendOk -and $frontendOk) {
        Write-Host "[OK] Backend y frontend responden." -ForegroundColor Green
    } else {
        Write-Host "[AVISO] Aún no responden ambos. Revise los logs:" -ForegroundColor Yellow
        Write-Host "  docker compose -f $ComposeFile logs -f digiturno-backend"
        Write-Host "  docker compose -f $ComposeFile logs -f digiturno-frontend"
    }

    Write-Host ""
    Write-Host "Accesos:"
    Write-Host "  Kiosco   : http://IP_DEL_SERVIDOR:$frontendPort"
    Write-Host "  Login    : http://IP_DEL_SERVIDOR:$frontendPort/login"
    Write-Host "  Dashboard: http://IP_DEL_SERVIDOR:$frontendPort/dashboard"
    Write-Host "  Swagger  : http://IP_DEL_SERVIDOR:$backendPort/swagger-ui.html"
} finally {
    Pop-Location
}

if (-not ($backendOk -and $frontendOk)) { exit 1 }
exit 0
