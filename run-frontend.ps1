# Frontend (Next.js) - Port 3002
Write-Host "Starting Frontend on port 3002..." -ForegroundColor Green

$env:NEXT_PUBLIC_API_URL = "http://localhost:3000"
$env:PORT = "3002"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\frontend"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Starting server..." -ForegroundColor Green
npm run dev
