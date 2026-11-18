# Inicia el kiosco de SisbénÁgil en modo kiosco con impresión directa.
# --kiosk-printing evita el diálogo de impresión y envía el ticket a la
# impresora predeterminada. La impresora debe estar instalada y conectada.
param(
    [string]$Url = "http://localhost:3001",
    [switch]$Configurar
)

$candidatos = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
)

$navegador = $candidatos | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $navegador) {
    Write-Error "No se encontró Google Chrome ni Microsoft Edge."
    exit 1
}

$perfil = Join-Path $env:LOCALAPPDATA "SisbenAgilKiosco"
New-Item -ItemType Directory -Force -Path $perfil | Out-Null

if (-not $Configurar) {
    $predeterminada = Get-CimInstance Win32_Printer -Filter "Default = TRUE" -ErrorAction SilentlyContinue
    if ($predeterminada) {
        Write-Host "Impresora predeterminada: $($predeterminada.Name)"
    } else {
        Write-Warning "No hay una impresora predeterminada. El kiosco abrirá, pero la impresión directa puede fallar. Configure la XP-80C-USB como predeterminada."
    }
}

$argumentos = @(
    "--user-data-dir=$perfil",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-session-crashed-bubble",
    "--disable-infobars",
    "--disable-features=TranslateUI"
)

if ($Configurar) {
    # Abre una ventana normal para configurar una vez la impresora y el papel.
    $argumentos += $Url
} else {
    $argumentos += @("--kiosk-printing", "--kiosk", $Url)
}

Start-Process -FilePath $navegador -ArgumentList $argumentos
