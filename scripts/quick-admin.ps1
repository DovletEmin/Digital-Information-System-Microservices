# PowerShell скрипт для быстрого создания администратора
# Использование: .\scripts\quick-admin.ps1

Write-Host "🔧 Creating default admin user..." -ForegroundColor Cyan
Write-Host ""

$registerData = @{
    username = "admin"
    email = "admin@smu.edu"
    password = "Admin123!"
    first_name = "Admin"
    last_name = "User"
} | ConvertTo-Json

try {
    Write-Host "Registering admin via API Gateway..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $registerData `
        -ErrorAction Stop

    Write-Host "✅ Admin user created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Login credentials:" -ForegroundColor Yellow
    Write-Host "   URL:      http://localhost:3001/login" -ForegroundColor White
    Write-Host "   Username: admin" -ForegroundColor White
    Write-Host "   Password: Admin123!" -ForegroundColor White
    Write-Host ""
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 409) {
        Write-Host "ℹ️  Admin user already exists" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 Login credentials:" -ForegroundColor Yellow
        Write-Host "   URL:      http://localhost:3001/login" -ForegroundColor White
        Write-Host "   Username: admin" -ForegroundColor White
        Write-Host "   Password: Admin123!" -ForegroundColor White
        Write-Host ""
    }
    else {
        Write-Host "❌ Failed to create admin user" -ForegroundColor Red
        Write-Host "   HTTP Status: $statusCode" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
        Write-Host "   1. Make sure services are running: docker compose ps" -ForegroundColor Gray
        Write-Host "   2. Check API Gateway logs: docker compose logs api-gateway" -ForegroundColor Gray
        Write-Host "   3. Check Auth Service logs: docker compose logs auth-service" -ForegroundColor Gray
        exit 1
    }
}

# Test login
Write-Host "🧪 Testing login..." -ForegroundColor Cyan
$loginData = @{
    username = "admin"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginData `
        -ErrorAction Stop
    
    Write-Host "✅ Login test successful!" -ForegroundColor Green
    Write-Host "   Token: $($loginResponse.access_token.Substring(0, 50))..." -ForegroundColor Gray
}
catch {
    Write-Host "⚠️  Login test failed" -ForegroundColor Yellow
    Write-Host "   Please try logging in manually at http://localhost:3001/login" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Setup complete! Open http://localhost:3001/login in your browser" -ForegroundColor Green
