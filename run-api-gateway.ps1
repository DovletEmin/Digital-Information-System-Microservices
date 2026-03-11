# API Gateway (Node.js Express) - Port 3000
Write-Host "Starting API Gateway on port 3000..." -ForegroundColor Green

$env:PORT = "3000"
$env:AUTH_SERVICE_URL = "http://127.0.0.1:8001"
$env:CONTENT_SERVICE_URL = "http://127.0.0.1:8002"
$env:SEARCH_SERVICE_URL = "http://127.0.0.1:8003"
$env:USER_ACTIVITY_SERVICE_URL = "http://127.0.0.1:8004"
$env:MEDIA_SERVICE_URL = "http://127.0.0.1:8005"

Set-Location "C:\Users\user\Desktop\Digital-Information-System-Microservices\services\api-gateway"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Starting server..." -ForegroundColor Green
npm run dev
