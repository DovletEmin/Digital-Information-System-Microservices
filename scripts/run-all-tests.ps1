# PowerShell script for running all tests
# Usage: .\scripts\run-all-tests.ps1

$ErrorActionPreference = "Continue"

Write-Host "🧪 Running SMU Microservices Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$TestsPassed = 0
$TestsFailed = 0

function Run-Test {
    param(
        [string]$ServiceName,
        [string]$Command
    )
    
    Write-Host ""
    Write-Host "Testing: $ServiceName" -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    
    $originalLocation = Get-Location
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ $ServiceName tests passed" -ForegroundColor Green
            $script:TestsPassed++
        } else {
            Write-Host "✗ $ServiceName tests failed" -ForegroundColor Red
            $script:TestsFailed++
        }
    }
    catch {
        Write-Host "✗ $ServiceName tests failed: $_" -ForegroundColor Red
        $script:TestsFailed++
    }
    finally {
        Set-Location $originalLocation
    }
}

# Auth Service (Go)
Run-Test "Auth Service" "cd services\auth-service; go test .\... -v"

# Content Service (Python)
Run-Test "Content Service" "cd services\content-service; pip install -q -r requirements-test.txt; pytest -v"

# API Gateway (Node.js)
Run-Test "API Gateway" "cd services\api-gateway; npm install --silent; npm test"

# User Activity Service (Node.js)
Run-Test "User Activity" "cd services\user-activity; npm install --silent; npm test"

# Admin Panel (Next.js)
Run-Test "Admin Panel" "cd admin-panel; npm install --silent; npm test"

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Passed: $TestsPassed" -ForegroundColor Green
Write-Host "Failed: $TestsFailed" -ForegroundColor Red
Write-Host ""

if ($TestsFailed -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
}
