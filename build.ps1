# Build de produção — deve correr sempre a partir do path canónico NTFS
# C:\Apps (maiúsculo) é obrigatório; C:\apps (minúsculo) causa dual React instance
Set-Location "C:\Apps\blazor-tracker"
npm run build
