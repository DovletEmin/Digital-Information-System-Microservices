# API Gateway (Node.js Express) - Port 3000
Write-Host "Starting API Gateway on port 3000..." -ForegroundColor Green

$env:PORT = "3000"
$env:AUTH_SERVICE_URL = "http://localhost:8001"
$env:CONTENT_SERVICE_URL = "http://localhost:8002"
$env:SEARCH_SERVICE_URL = "http://localhost:8003"
$env:USER_ACTIVITY_SERVICE_URL = "http://localhost:8004"
$env:MEDIA_SERVICE_URL = "http://localhost:8005"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\services\api-gateway"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Starting server..." -ForegroundColor Green
npm run dev
