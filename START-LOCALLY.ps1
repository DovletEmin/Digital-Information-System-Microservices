# SMU Microservices - Локальный запуск
# Инструкция по запуску всех сервисов локально

Write-Host @"
╔════════════════════════════════════════════════════════════════════╗
║        SMU Microservices - Локальный запуск в терминалах          ║
╚════════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Host "`nОткройте 8 отдельных терминалов PowerShell и запустите в каждом:`n" -ForegroundColor Yellow

Write-Host "Терминал 1 - Content Service (Python):" -ForegroundColor Green
Write-Host "  .\run-content-service.ps1`n" -ForegroundColor White

Write-Host "Терминал 2 - Auth Service (Go):" -ForegroundColor Green
Write-Host "  .\run-auth-service.ps1`n" -ForegroundColor White

Write-Host "Терминал 3 - Media Service (Go):" -ForegroundColor Green
Write-Host "  .\run-media-service.ps1`n" -ForegroundColor White

Write-Host "Терминал 4 - Search Service (Python):" -ForegroundColor Green
Write-Host "  .\run-search-service.ps1`n" -ForegroundColor White

Write-Host "Терминал 5 - User Activity (Node.js):" -ForegroundColor Green
Write-Host "  .\run-user-activity.ps1`n" -ForegroundColor White

Write-Host "Терминал 6 - API Gateway (Node.js):" -ForegroundColor Green
Write-Host "  .\run-api-gateway.ps1`n" -ForegroundColor White

Write-Host "Терминал 7 - Frontend (Next.js):" -ForegroundColor Green
Write-Host "  .\run-frontend.ps1`n" -ForegroundColor White

Write-Host "Терминал 8 - Admin Panel (Next.js):" -ForegroundColor Green
Write-Host "  .\run-admin-panel.ps1`n" -ForegroundColor White

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "ВАЖНО! Порядок запуска:" -ForegroundColor Red
Write-Host "1. Сначала запустите Content, Auth, Media, Search, User Activity" -ForegroundColor Yellow
Write-Host "2. Подождите 5-10 секунд" -ForegroundColor Yellow
Write-Host "3. Затем запустите API Gateway" -ForegroundColor Yellow
Write-Host "4. Подождите 5 секунд" -ForegroundColor Yellow
Write-Host "5. Запустите Frontend и Admin Panel" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

Write-Host "После запуска всех сервисов:" -ForegroundColor Cyan
Write-Host "  • Frontend:    http://localhost:3002" -ForegroundColor White
Write-Host "  • Admin Panel: http://localhost:3001" -ForegroundColor White
Write-Host "  • API Gateway: http://localhost:3000" -ForegroundColor White

Write-Host "`nБазы данных работают в WSL:" -ForegroundColor Cyan
Write-Host "  • PostgreSQL: 127.0.0.1:5432" -ForegroundColor White
Write-Host "  • Redis:      127.0.0.1:6379" -ForegroundColor White
Write-Host "  • MongoDB:    127.0.0.1:27017" -ForegroundColor White
Write-Host "  • MinIO:      127.0.0.1:9000" -ForegroundColor White
Write-Host "  • Elasticsearch: 127.0.0.1:9200" -ForegroundColor White

Write-Host "`nДля остановки: нажмите Ctrl+C в каждом терминале`n" -ForegroundColor Yellow
