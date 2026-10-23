# Inicia la pantalla TV de SisbenAgil en modo kiosco con el audio siempre activo.
# El flag --autoplay-policy=no-user-gesture-required permite que la campana y la
# voz suenen desde el arranque, sin tener que pulsar "activar sonido".
param(
    [string]$Url = "http://localhost:3001/tv"
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

$perfil = Join-Path $env:LOCALAPPDATA "SisbenAgilTV"
New-Item -ItemType Directory -Force -Path $perfil | Out-Null

Start-Process -FilePath $navegador -ArgumentList @(
    "--kiosk",
    $Url,
    "--autoplay-policy=no-user-gesture-required",
    "--user-data-dir=$perfil",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-session-crashed-bubble",
    "--disable-infobars"
)
