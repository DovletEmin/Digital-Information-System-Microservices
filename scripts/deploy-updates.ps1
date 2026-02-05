# Скрипт для копирования обновлений на сервер и перезапуска сервисов (PowerShell/WSL)

Write-Host "🚀 Начало развертывания обновлений..." -ForegroundColor Green

$sourceDir = "C:\Users\Emin\Desktop\SMU-Microservices"
$targetDir = "/opt/smu-microservices"

Write-Host "`n📋 Копирование обновленных файлов через WSL..." -ForegroundColor Cyan

# Копирование через WSL
wsl bash -c @"
set -e

SOURCE_DIR='/mnt/c/Users/Emin/Desktop/SMU-Microservices'
TARGET_DIR='$targetDir'

echo '📁 Создание директорий если не существуют...'
sudo mkdir -p `$TARGET_DIR/services/content-service/routers
sudo mkdir -p `$TARGET_DIR/frontend/src/app/articles
sudo mkdir -p `$TARGET_DIR/frontend/src/services
sudo mkdir -p `$TARGET_DIR/frontend/src/components

echo '📂 Копирование content-service...'
sudo cp -f `$SOURCE_DIR/services/content-service/models.py `$TARGET_DIR/services/content-service/
sudo cp -f `$SOURCE_DIR/services/content-service/schemas.py `$TARGET_DIR/services/content-service/
sudo cp -f `$SOURCE_DIR/services/content-service/main.py `$TARGET_DIR/services/content-service/
sudo cp -f `$SOURCE_DIR/services/content-service/migrate_db.py `$TARGET_DIR/services/content-service/
sudo cp -rf `$SOURCE_DIR/services/content-service/routers/* `$TARGET_DIR/services/content-service/routers/

echo '📂 Копирование frontend...'
sudo cp -rf `$SOURCE_DIR/frontend/src/app/articles `$TARGET_DIR/frontend/src/app/
sudo cp -f `$SOURCE_DIR/frontend/src/app/dissertations/page.tsx `$TARGET_DIR/frontend/src/app/dissertations/
sudo cp -f `$SOURCE_DIR/frontend/src/services/savedService.ts `$TARGET_DIR/frontend/src/services/
sudo cp -f `$SOURCE_DIR/frontend/src/components/ArticleCard.tsx `$TARGET_DIR/frontend/src/components/

echo '✅ Файлы скопированы'
"@

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при копировании файлов!" -ForegroundColor Red
    exit 1
}

Write-Host "`n🗄️  Запуск миграции базы данных..." -ForegroundColor Cyan
wsl bash -c @"
cd $targetDir/services/content-service
sudo python3 migrate_db.py
"@

Write-Host "`n🔄 Перезапуск сервисов..." -ForegroundColor Cyan

# Перезапуск content-service
Write-Host "  → Перезапуск smu-content.service..." -ForegroundColor Yellow
wsl bash -c "sudo systemctl restart smu-content.service"
Start-Sleep -Seconds 2

# Проверка статуса
Write-Host "`n📊 Проверка статуса сервисов..." -ForegroundColor Cyan
wsl bash -c "sudo systemctl is-active smu-content.service" | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ content-service работает" -ForegroundColor Green
} else {
    Write-Host "  ❌ content-service не запущен" -ForegroundColor Red
    Write-Host "`nЛоги сервиса:" -ForegroundColor Yellow
    wsl bash -c "sudo journalctl -u smu-content.service -n 20 --no-pager"
}

Write-Host "`n✨ Развертывание завершено!" -ForegroundColor Green
Write-Host "`n📝 Примечания:" -ForegroundColor Yellow
Write-Host "  - Frontend нужно пересобрать и перезапустить (см. ниже)" -ForegroundColor Gray
Write-Host "  - Для просмотра логов: wsl sudo journalctl -u smu-content.service -f" -ForegroundColor Gray

Write-Host "`n🔨 Пересборка и перезапуск Frontend..." -ForegroundColor Cyan
Write-Host "Выполните следующие команды:" -ForegroundColor Yellow
Write-Host "  wsl bash -c 'cd $targetDir/frontend && npm run build'" -ForegroundColor White
Write-Host "  wsl bash -c 'sudo systemctl restart smu-admin-panel.service'" -ForegroundColor White
