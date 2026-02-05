# User Activity Service (Node.js) - Port 8004
Write-Host "Starting User Activity Service on port 8004..." -ForegroundColor Green

$env:MONGODB_URL = "mongodb://127.0.0.1:27017/smu_user_activity"
$env:REDIS_URL = "redis://127.0.0.1:6379/1"
$env:PORT = "8004"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\services\user-activity"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

Write-Host "Starting server..." -ForegroundColor Green
npm run dev
