# Search Service (Python FastAPI) - Port 8003
Write-Host "Starting Search Service on port 8003..." -ForegroundColor Green

$env:ELASTICSEARCH_URL = "http://127.0.0.1:9200"
$env:MONGODB_URL = "mongodb://127.0.0.1:27017/smu_search"

Set-Location "C:\Users\Emin\Desktop\SMU-Microservices\services\search-service"

Write-Host "Installing dependencies..." -ForegroundColor Yellow
python -m pip install -r requirements.txt

Write-Host "Starting server..." -ForegroundColor Green
python -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload
