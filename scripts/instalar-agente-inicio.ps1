# Crea un acceso directo en la carpeta de Inicio de Windows para que el
# agente de impresión se ejecute automáticamente al iniciar sesión.
$inicio = [Environment]::GetFolderPath('Startup')
$origen = Join-Path $PSScriptRoot 'iniciar-agente-impresion.bat'
$destino = Join-Path $inicio 'SisbénÁgil Agente de Impresion.lnk'

if (-not (Test-Path $origen)) {
    Write-Error "No se encontró $origen"
    exit 1
}

$shell = New-Object -ComObject WScript.Shell
$acceso = $shell.CreateShortcut($destino)
$acceso.TargetPath = $origen
$acceso.WorkingDirectory = (Join-Path $PSScriptRoot '..')
$acceso.WindowStyle = 7
$acceso.Description = 'Agente local de impresion SisbénÁgil'
$acceso.Save()

Write-Host "Acceso directo creado en: $destino"
Write-Host "El agente se iniciará automáticamente la próxima vez que inicie sesión."
Write-Host "Para quitarlo, elimine ese acceso directo."
