# Restaura una copia de seguridad sobre la base de datos actual.
# ATENCIÓN: reemplaza el contenido de la base de datos.
# Uso:
#   scripts\restore-db.ps1 -Archivo backups\dispensamaster_2026-11-17_02-00-00.sql.gz
#   scripts\restore-db.ps1 -Archivo backups\archivo.sql.gz -Force
param(
    [Parameter(Mandatory = $true)]
    [string]$Archivo,
    [switch]$Force,
    [string]$ComposeFile = "",
    [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot -Parent

function Resolver-Ruta([string]$ruta) {
    if ([System.IO.Path]::IsPathRooted($ruta)) { return $ruta }
    return (Join-Path $raiz $ruta)
}

# En desarrollo existe docker-compose.prod.yml; en el servidor solo
# docker-compose.server.yml. Se elige automáticamente si no se indica.
if (-not $ComposeFile) {
    if (Test-Path (Join-Path $raiz "docker-compose.prod.yml")) {
        $ComposeFile = "docker-compose.prod.yml"
    } elseif (Test-Path (Join-Path $raiz "docker-compose.server.yml")) {
        $ComposeFile = "docker-compose.server.yml"
    } else {
        Write-Error "No se encontró docker-compose.prod.yml ni docker-compose.server.yml"
        exit 1
    }
}

$compose = Resolver-Ruta $ComposeFile
$envPath = Resolver-Ruta $EnvFile
$backups = Join-Path $raiz "backups"
$ruta = Resolver-Ruta $Archivo

if (-not (Test-Path $compose)) {
    Write-Error "No se encontró $compose"
    exit 1
}
if (-not (Test-Path $envPath)) {
    Write-Error "No se encontró $envPath. Copie .env.example como .env y configúrelo."
    exit 1
}
if (-not (Test-Path $ruta)) {
    Write-Error "No existe el archivo $ruta"
    exit 1
}

if (-not (Test-Path $backups)) {
    New-Item -ItemType Directory -Path $backups | Out-Null
}
$backupsFull = (Resolve-Path $backups).Path
$rutaFull = (Resolve-Path $ruta).Path
if (-not $rutaFull.StartsWith($backupsFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-Error "El archivo debe estar dentro de la carpeta $backups (es la que ve el contenedor)."
    exit 1
}

$nombre = Split-Path $rutaFull -Leaf
$destino = "/backups/$nombre"

$argumentos = @("compose", "-f", $compose, "--env-file", $envPath, "exec", "-it")
if ($Force) {
    $argumentos += @("-e", "FORCE=1")
}
$argumentos += @("digiturno-backup", "/scripts/restore-mysql.sh", $destino)

Push-Location $raiz
try {
    & docker @argumentos
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
