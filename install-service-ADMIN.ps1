# Executar como ADMINISTRADOR
# Cria tarefa agendada com conta SYSTEM — sem password, sem sessao ativa necessaria.
#
# Fluxo:
#   1. Cria C:\ProgramData\pm2 como PM2_HOME partilhado (acessivel por SYSTEM)
#   2. Copia (ou gera) o dump.pm2 para esse diretorio
#   3. Regista a tarefa agendada com LogonType = ServiceAccount (SYSTEM)
#
# Para gerir a aplicacao depois do arranque:
#   $env:PM2_HOME = 'C:\ProgramData\pm2'; pm2 list

$node       = "C:\Program Files\nodejs\node.exe"
$pm2Bin     = "C:\Users\alexandre.portugal\AppData\Roaming\npm\node_modules\pm2\bin\pm2"
$pm2Home    = "C:\ProgramData\pm2"
$taskName   = "BlazorTracker-PM2"
$startScript = "C:\Apps\blazor-tracker\scripts\start-pm2-system.ps1"
$cwd        = "C:\Apps\blazor-tracker"

# --- 1. Verificar prerequisitos ---
foreach ($path in @($node, $pm2Bin, $startScript)) {
    if (-not (Test-Path $path)) {
        Write-Host "ERRO: nao encontrado: $path" -ForegroundColor Red
        exit 1
    }
}

# --- 2. Criar PM2_HOME partilhado ---
New-Item -ItemType Directory -Force -Path $pm2Home | Out-Null
Write-Host "PM2_HOME: $pm2Home" -ForegroundColor Gray

# --- 3. Garantir dump.pm2 no PM2_HOME partilhado ---
$userDump = "$env:USERPROFILE\.pm2\dump.pm2"
$sysDump  = "$pm2Home\dump.pm2"

if (Test-Path $userDump) {
    Copy-Item $userDump $sysDump -Force
    Write-Host "dump.pm2 copiado do perfil do utilizador." -ForegroundColor Gray
} else {
    # Sem dump existente: arranca a aplicacao agora e guarda
    Write-Host "Sem dump existente. A arrancar aplicacao para gerar dump..." -ForegroundColor Yellow
    $env:PM2_HOME = $pm2Home
    & $node $pm2Bin start "$cwd\ecosystem.config.js"
    Start-Sleep -Seconds 3
    & $node $pm2Bin save --force
    Write-Host "dump.pm2 gerado em $pm2Home" -ForegroundColor Gray
}

# --- 4. Registar tarefa agendada com SYSTEM (sem password) ---
$action = New-ScheduledTaskAction `
    -Execute    "powershell.exe" `
    -Argument   "-NonInteractive -ExecutionPolicy Bypass -File `"$startScript`"" `
    -WorkingDirectory $cwd

$trigger = New-ScheduledTaskTrigger -AtStartup

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount       3 `
    -RestartInterval    (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable:$true

# ServiceAccount = SYSTEM; nao requer password nem sessao ativa
$principal = New-ScheduledTaskPrincipal `
    -UserId    "SYSTEM" `
    -LogonType ServiceAccount `
    -RunLevel  Highest

Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host ""
Write-Host "Tarefa '$taskName' criada com SYSTEM (sem password)." -ForegroundColor Green
Write-Host "A aplicacao iniciara automaticamente no proximo arranque do sistema." -ForegroundColor Green
Write-Host ""
Write-Host "Para testar agora sem reiniciar:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor White
Write-Host ""
Write-Host "Para gerir a aplicacao (lista, logs, reinicio):" -ForegroundColor Cyan
Write-Host "  `$env:PM2_HOME = 'C:\ProgramData\pm2'; pm2 list" -ForegroundColor White
Write-Host "  `$env:PM2_HOME = 'C:\ProgramData\pm2'; pm2 logs blazor-tracker" -ForegroundColor White
Write-Host "  `$env:PM2_HOME = 'C:\ProgramData\pm2'; pm2 restart blazor-tracker" -ForegroundColor White
