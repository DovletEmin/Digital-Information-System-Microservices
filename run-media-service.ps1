# Media Service (Go) - Port 8005
Write-Host "Starting Media Service on port 8005..." -ForegroundColor Green

$env:MINIO_ENDPOINT = "127.0.0.1:9000"
$env:MINIO_ACCESS_KEY = "minioadmin"
$env:MINIO_SECRET_KEY = "minioadmin"
$env:MINIO_USE_SSL = "false"
$env:MINIO_BUCKET = "media"
$env:PORT = "8005"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\services\media-service"

Write-Host "Building and running..." -ForegroundColor Yellow
go run main.go
