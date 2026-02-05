# Admin Panel (Next.js) - Port 3001
Write-Host "Starting Admin Panel on port 3001..." -ForegroundColor Green

$env:NEXT_PUBLIC_API_URL = "http://localhost:3000"
$env:PORT = "3001"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\admin-panel"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Starting server..." -ForegroundColor Green
npm run dev
