# Executado pelo Task Scheduler como SYSTEM no arranque do sistema.
# PM2_HOME aponta para C:\ProgramData\pm2 (acessivel por SYSTEM e administradores).

$pm2Home = "C:\ProgramData\pm2"
$node    = "C:\Program Files\nodejs\node.exe"
$pm2     = "C:\Users\alexandre.portugal\AppData\Roaming\npm\node_modules\pm2\bin\pm2"
$cwd     = "C:\Apps\blazor-tracker"

$env:PM2_HOME  = $pm2Home
$env:NODE_ENV  = "production"
$env:PATH      = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine")

Set-Location $cwd

# Tenta ressuscitar processos guardados; se falhar, arranca pelo ecosystem
$result = & $node $pm2 resurrect 2>&1
if ($LASTEXITCODE -ne 0 -or $result -match "No dump found|nothing to resurrect") {
    & $node $pm2 start "$cwd\ecosystem.config.js"
}

# Aguarda os processos estabilizarem e guarda o estado
Start-Sleep -Seconds 5
& $node $pm2 save --force
