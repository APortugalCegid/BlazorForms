Write-Host "A arrancar Prod (porta 3000)..." -ForegroundColor Cyan
npx pm2 start blazor-tracker

Write-Host "A arrancar Dev (porta 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev -- --port 3001"

Write-Host ""
Write-Host "Prod: http://10.114.20.1:3000" -ForegroundColor Green
Write-Host "Dev:  http://10.114.20.1:3001" -ForegroundColor Yellow
