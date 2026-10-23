# Inicia el agente local de impresión (si no está activo) y luego abre el kiosco.
# El agente escucha en 127.0.0.1:17777 y envía los tickets a la impresora
# predeterminada de Windows sin mostrar el diálogo de impresión.
param(
    [string]$Url = "http://localhost:3001",
    [string]$AgenteUrl = "http://127.0.0.1:17777",
    [switch]$Configurar,
    [switch]$SinAgente
)

function Probar-Agente {
    try {
        $null = Invoke-RestMethod -Uri "$AgenteUrl/health" -TimeoutSec 2
        return $true
    } catch {
        return $false
    }
}

if (-not $Configurar -and -not $SinAgente) {
    $agenteActivo = Probar-Agente
    if ($agenteActivo) {
        Write-Host "Agente de impresión: activo."
    } else {
        $lanzador = Join-Path $PSScriptRoot "iniciar-agente-impresion.bat"
        if (Test-Path $lanzador) {
            try {
                $uri = [Uri]$Url
                $env:PRINT_AGENT_ORIGINS = $uri.GetLeftPart([UriPartial]::Authority)
            } catch {
                # Si la URL no es válida, el agente usa sus orígenes por defecto.
            }

            Write-Host "Iniciando agente de impresión..."
            Start-Process -FilePath $lanzador -WindowStyle Minimized

            for ($i = 0; $i -lt 15; $i++) {
                Start-Sleep -Seconds 1
                if (Probar-Agente) {
                    $agenteActivo = $true
                    break
                }
            }

            if ($agenteActivo) {
                Write-Host "Agente de impresión: activo."
            } else {
                Write-Warning "El agente de impresión no respondió. El kiosco usará la impresión del navegador como respaldo."
            }
        } else {
            Write-Warning "No se encontró iniciar-agente-impresion.bat. El kiosco usará la impresión del navegador como respaldo."
        }
    }
}

& (Join-Path $PSScriptRoot "iniciar-kiosco.ps1") -Url $Url -Configurar:$Configurar
