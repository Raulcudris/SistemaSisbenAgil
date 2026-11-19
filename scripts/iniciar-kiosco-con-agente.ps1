# Inicia el agente local de impresión (si no está activo) y luego abre el kiosco.
# El agente escucha en 127.0.0.1:17777 y envía los tickets a la impresora
# predeterminada de Windows sin mostrar el diálogo de impresión.
param(
    [string]$Url = "http://localhost:3001",
    [string]$AgenteUrl = "http://127.0.0.1:17777",
    [switch]$Configurar,
    [switch]$SinAgente
)

function Obtener-EstadoAgente {
    try {
        return Invoke-RestMethod -Uri "$AgenteUrl/health" -TimeoutSec 2
    } catch {
        return $null
    }
}

function Mostrar-EstadoAgente($estado) {
    if (-not $estado) {
        return
    }

    if ($estado.ok) {
        $sufijo = ''
        if ($estado.printer) {
            $sufijo = " ($($estado.printer))"
        }
        Write-Host "Agente de impresión: activo$sufijo."
    } else {
        Write-Warning "El agente está activo, pero no tiene una impresora disponible. Configure la impresora predeterminada de Windows o la variable PRINT_AGENT_PRINTER."
    }
}

if (-not $Configurar -and -not $SinAgente) {
    $estadoAgente = Obtener-EstadoAgente
    if ($estadoAgente) {
        Mostrar-EstadoAgente $estadoAgente
    } else {
        $lanzador = Join-Path $PSScriptRoot "iniciar-agente-impresion.bat"
        if (Test-Path $lanzador) {
            try {
                $uri = [Uri]$Url
                $env:PRINT_AGENT_ORIGINS = $uri.GetLeftPart([UriPartial]::Authority)
            } catch {
                # Si la URL no es válida, el agente usa sus orígenes por defecto.
            }

            if (-not (Get-Command node -ErrorAction SilentlyContinue) -or
                -not (Get-Command npm -ErrorAction SilentlyContinue)) {
                Write-Warning "No se encontró Node.js/npm en PATH. Instale Node.js 18 o superior y abra una consola nueva."
            }

            Write-Host "Iniciando agente de impresión..."
            Start-Process -FilePath $lanzador -WindowStyle Minimized

            for ($i = 0; $i -lt 15; $i++) {
                Start-Sleep -Seconds 1
                $estadoAgente = Obtener-EstadoAgente
                if ($estadoAgente) {
                    break
                }
            }

            if ($estadoAgente) {
                Mostrar-EstadoAgente $estadoAgente
            } else {
                Write-Warning "El agente de impresión no respondió. El kiosco usará la impresión del navegador como respaldo."
            }
        } else {
            Write-Warning "No se encontró iniciar-agente-impresion.bat. El kiosco usará la impresión del navegador como respaldo."
        }
    }
}

& (Join-Path $PSScriptRoot "iniciar-kiosco.ps1") -Url $Url -Configurar:$Configurar
