# Verifica que el stack Digiturno pueda desplegarse sin chocar con los servicios
# que ya corren en el servidor (puertos, contenedores, red y volumen).
# Comprobación de solo lectura: no modifica ni depende de appsisben.
#
# Uso:
#   scripts\verificar-conflictos.ps1
#   scripts\verificar-conflictos.ps1 -EnvFile .env
#   scripts\verificar-conflictos.ps1 -ComposeFile docker-compose.server.yml
param(
    [string]$EnvFile = ".env",
    [string]$ComposeFile = ""
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

function Puerto-De([string]$clave, [int]$defecto) {
    if ($config.ContainsKey($clave) -and $config[$clave]) {
        $valor = 0
        if ([int]::TryParse($config[$clave], [ref]$valor)) { return $valor }
        Write-Error "$clave='$($config[$clave])' no es un puerto válido."
        exit 1
    }
    return $defecto
}

$frontendPort = Puerto-De "FRONTEND_PORT" 3001
$backendPort = Puerto-De "BACKEND_PORT" 8088

# Puertos ya ocupados en el servidor (appsisben y otros servicios).
$reservados = @{
    80   = "appsisben (nginx interno / otros servicios)"
    3000 = "appsisben-frontend"
    6095 = "appsisben-backend"
    8069 = "otro servicio del servidor"
    8080 = "otro servicio del servidor"
    2404 = "otro servicio del servidor"
    8097 = "appsisben-proxy (APPSISBEN_HTTP_PORT)"
    8098 = "Adminer (ADMINER_PORT)"
}

$problemas = 0

# Puertos publicados por contenedores del propio Digiturno (caso actualización).
$puertosPropios = @{}
docker ps --format "{{.Names}}`t{{.Ports}}" 2>$null | ForEach-Object {
    $partes = $_ -split "`t", 2
    if ($partes[0] -like "digiturno-*" -and $partes.Count -gt 1) {
        [regex]::Matches($partes[1], ":(\d+)->") | ForEach-Object {
            $puertosPropios[[int]$_.Groups[1].Value] = $partes[0]
        }
    }
}

Write-Host "== Puertos que usará Digiturno =="
foreach ($par in @(@("Frontend", $frontendPort), @("Backend", $backendPort))) {
    $nombre = $par[0]
    $puerto = [int]$par[1]

    if ($reservados.ContainsKey($puerto)) {
        Write-Host ("[CONFLICTO] {0}: puerto {1} reservado por {2}" -f $nombre, $puerto, $reservados[$puerto]) -ForegroundColor Red
        $problemas++
        continue
    }

    if ($puertosPropios.ContainsKey($puerto)) {
        Write-Host ("[OK] {0}: puerto {1} en uso por {2} (actualización del propio stack)" -f $nombre, $puerto, $puertosPropios[$puerto]) -ForegroundColor Green
        continue
    }

    $conexion = Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue
    if ($conexion) {
        $pids = ($conexion | Select-Object -ExpandProperty OwningProcess -Unique)
        $procesos = foreach ($id in $pids) {
            $p = Get-Process -Id $id -ErrorAction SilentlyContinue
            if ($p) { "$($p.ProcessName) (PID $id)" } else { "PID $id" }
        }
        Write-Host ("[CONFLICTO] {0}: puerto {1} ya está en uso por {2}" -f $nombre, $puerto, ($procesos -join ", ")) -ForegroundColor Red
        $problemas++
    } else {
        Write-Host ("[OK] {0}: puerto {1} libre" -f $nombre, $puerto) -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "== Contenedores del stack Digiturno =="
$contenedores = docker ps -a --format "{{.Names}}" 2>$null | Where-Object { $_ -like "digiturno-*" }
if ($contenedores) {
    Write-Host "[AVISO] Ya existen contenedores:" -ForegroundColor Yellow
    $contenedores | ForEach-Object { Write-Host "  - $_" }
    Write-Host "        Si es una actualización, es normal. Si no, revise antes de continuar."
} else {
    Write-Host "[OK] No hay contenedores previos con prefijo digiturno-" -ForegroundColor Green
}

Write-Host ""
Write-Host "== Red y volumen (se crean automáticamente) =="
if (docker network ls --format "{{.Name}}" 2>$null | Where-Object { $_ -eq "digiturno_default" }) {
    Write-Host "[AVISO] La red digiturno_default ya existe (posible despliegue previo)." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Red digiturno_default disponible para crear." -ForegroundColor Green
}
if (docker volume ls --format "{{.Name}}" 2>$null | Where-Object { $_ -eq "digiturno_mysql_data" }) {
    Write-Host "[AVISO] El volumen digiturno_mysql_data ya existe: la base actual se conservará." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Volumen digiturno_mysql_data se creará vacío (Flyway cargará el esquema)." -ForegroundColor Green
}

Write-Host ""
Write-Host "== Validación del docker-compose =="
$nombreCompose = Split-Path $compose -Leaf
docker compose -f $compose --env-file $envPath config --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] $nombreCompose es válido." -ForegroundColor Green
} else {
    Write-Host "[ERROR] $nombreCompose tiene errores de configuración." -ForegroundColor Red
    $problemas++
}

Write-Host ""
if ($problemas -gt 0) {
    Write-Host "Resultado: $problemas conflicto(s) detectado(s). Corrija .env antes de desplegar." -ForegroundColor Red
    exit 1
}
Write-Host "Resultado: sin conflictos con los servicios existentes. Puede desplegar con:"
if ($nombreCompose -eq "docker-compose.server.yml") {
    Write-Host "  docker compose -f $nombreCompose --env-file $EnvFile pull"
    Write-Host "  docker compose -f $nombreCompose --env-file $EnvFile up -d"
} else {
    Write-Host "  docker compose -f $nombreCompose --env-file $EnvFile up -d --build"
}
exit 0
