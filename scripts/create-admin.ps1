# SMU Admin User Creation Script for Windows

Write-Host "=== SMU Admin User Creator ===" -ForegroundColor Cyan
Write-Host ""

# Проверка, запущен ли auth-service
$running = docker ps --format "{{.Names}}" | Select-String "smu-auth-service"
if (-not $running) {
    Write-Host "Error: auth-service is not running" -ForegroundColor Red
    Write-Host "Please start it with: docker-compose up auth-service" -ForegroundColor Yellow
    exit 1
}

# Ввод данных
$USERNAME = Read-Host "Enter username"
$EMAIL = Read-Host "Enter email"
$FIRSTNAME = Read-Host "Enter first name"
$LASTNAME = Read-Host "Enter last name"
$PASSWORD = Read-Host "Enter password" -AsSecureString
$PASSWORD_TEXT = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PASSWORD)
)

# Создание JSON для запроса
$body = @{
    username = $USERNAME
    email = $EMAIL
    password = $PASSWORD_TEXT
    first_name = $FIRSTNAME
    last_name = $LASTNAME
} | ConvertTo-Json

# Создание пользователя через API
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8001/api/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body
    
    $USER_ID = $response.user.id
    
    # Обновление пользователя до админа через БД
    docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c `
        "UPDATE users SET is_staff = true WHERE id = $USER_ID;"
    
    Write-Host ""
    Write-Host "✓ Admin user created successfully!" -ForegroundColor Green
    Write-Host "  Username: $USERNAME" -ForegroundColor White
    Write-Host "  Email: $EMAIL" -ForegroundColor White
    Write-Host ""
    Write-Host "You can now login to the admin panel at http://localhost:3001" -ForegroundColor Cyan
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
