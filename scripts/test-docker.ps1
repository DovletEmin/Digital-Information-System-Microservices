# PowerShell script для запуска тестов в Docker контейнерах
# Usage: .\scripts\test-docker.ps1 [service-name]

param(
    [string]$ServiceName = ""
)

$ErrorActionPreference = "Continue"

Write-Host "🐳 Running tests in Docker containers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$Services = @("auth-service", "content-service", "api-gateway", "user-activity", "admin-panel")
$FailedServices = @()

function Test-Service {
    param([string]$Service)
    
    Write-Host ""
    Write-Host "Testing: $Service" -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    
    $result = docker-compose -f docker-compose.test.yml run --rm "test-$Service"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $Service tests passed" -ForegroundColor Green
        return $true
    } else {
        Write-Host "✗ $Service tests failed" -ForegroundColor Red
        return $false
    }
}

# If specific service provided, test only that
if ($ServiceName) {
    $success = Test-Service -Service $ServiceName
    docker-compose -f docker-compose.test.yml down
    exit $(if ($success) { 0 } else { 1 })
}

# Otherwise test all services
foreach ($service in $Services) {
    if (-not (Test-Service -Service $service)) {
        $FailedServices += $service
    }
}

# Clean up
Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Cyan
docker-compose -f docker-compose.test.yml down

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$Passed = $Services.Count - $FailedServices.Count
Write-Host "Passed: $Passed" -ForegroundColor Green
Write-Host "Failed: $($FailedServices.Count)" -ForegroundColor Red

if ($FailedServices.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed services:" -ForegroundColor Red
    foreach ($service in $FailedServices) {
        Write-Host "  - $service"
    }
    exit 1
} else {
    Write-Host ""
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
}
