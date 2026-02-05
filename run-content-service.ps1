# Content Service (Python FastAPI) - Port 8002
Write-Host "Starting Content Service on port 8002..." -ForegroundColor Green

$env:DATABASE_URL = "postgresql://smuuser:smupass@127.0.0.1:5432/smu_content"
$env:REDIS_URL = "redis://127.0.0.1:6379/0"
$env:JWT_SECRET = "your-secret-key-here-change-in-production"
$env:API_GATEWAY_URL = "http://localhost:3000"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\services\content-service"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt

Write-Host "Starting server..." -ForegroundColor Green
python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload
