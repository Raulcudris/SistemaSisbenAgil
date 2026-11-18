# Ejecuta una copia de seguridad inmediata de la base de datos.
# Uso:
#   scripts\backup-db.ps1
param(
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

if (-not (Test-Path $compose)) {
    Write-Error "No se encontró $compose"
    exit 1
}
if (-not (Test-Path $envPath)) {
    Write-Error "No se encontró $envPath. Copie .env.example como .env y configúrelo."
    exit 1
}

Push-Location $raiz
try {
    docker compose -f $compose --env-file $envPath exec -T digiturno-backup /scripts/backup-mysql.sh
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

$backups = Join-Path $raiz "backups"
if (Test-Path $backups) {
    Write-Host ""
    Write-Host "Últimas copias en $backups :"
    Get-ChildItem $backups -Filter "*.sql.gz" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 10 Name, LastWriteTime, @{Name = "MB"; Expression = { [math]::Round($_.Length / 1MB, 2) } } |
        Format-Table -AutoSize
}
