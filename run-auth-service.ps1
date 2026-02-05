# Auth Service (Go) - Port 8001
Write-Host "Starting Auth Service on port 8001..." -ForegroundColor Green

$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "5432"
$env:DB_USER = "smuuser"
$env:DB_PASSWORD = "smupass"
$env:DB_NAME = "smu_auth"
$env:JWT_SECRET = "your-secret-key-here-change-in-production"
$env:PORT = "8001"
$env:REDIS_URL = "redis://127.0.0.1:6379/0"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\services\auth-service"

Write-Host "Building and running..." -ForegroundColor Yellow
go run main.go
