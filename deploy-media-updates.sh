#!/bin/bash

# Развертывание обновлений с загрузкой изображений
# Использование: sudo ./deploy-media-updates.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}=== Развертывание обновлений с Media Service ===${NC}"
echo ""

SOURCE="/mnt/c/Users/Emin/Desktop/SMU-Microservices"
TARGET="/opt/smu-microservices"

# Backend - Content Service
echo -e "${YELLOW}Копирование Content Service...${NC}"
cp "${SOURCE}/services/content-service/models.py" "${TARGET}/services/content-service/"
cp "${SOURCE}/services/content-service/schemas.py" "${TARGET}/services/content-service/"
cp "${SOURCE}/services/content-service/main.py" "${TARGET}/services/content-service/"
cp "${SOURCE}/services/content-service/request_middleware.py" "${TARGET}/services/content-service/"
cp "${SOURCE}/services/content-service/routers/saved.py" "${TARGET}/services/content-service/routers/"
cp "${SOURCE}/services/content-service/routers/dissertations.py" "${TARGET}/services/content-service/routers/"
cp "${SOURCE}/services/content-service/routers/articles.py" "${TARGET}/services/content-service/routers/" 2>/dev/null || true
cp "${SOURCE}/services/content-service/routers/books.py" "${TARGET}/services/content-service/routers/" 2>/dev/null || true

# Admin Panel - новые компоненты и сервисы
echo -e "${YELLOW}Копирование Admin Panel...${NC}"
cp "${SOURCE}/admin-panel/src/services/mediaService.ts" "${TARGET}/admin-panel/src/services/"
cp "${SOURCE}/admin-panel/src/components/ImageUpload.tsx" "${TARGET}/admin-panel/src/components/"

# Articles
cp "${SOURCE}/admin-panel/src/app/dashboard/articles/new/page.tsx" "${TARGET}/admin-panel/src/app/dashboard/articles/new/"
cp "${SOURCE}/admin-panel/src/app/dashboard/articles/[id]/edit/page.tsx" "${TARGET}/admin-panel/src/app/dashboard/articles/[id]/edit/"

# Books
cp "${SOURCE}/admin-panel/src/app/dashboard/books/new/page.tsx" "${TARGET}/admin-panel/src/app/dashboard/books/new/"
cp "${SOURCE}/admin-panel/src/app/dashboard/books/[id]/edit/page.tsx" "${TARGET}/admin-panel/src/app/dashboard/books/[id]/edit/"

# Dissertations
cp "${SOURCE}/admin-panel/src/app/dashboard/dissertations/new/page.tsx" "${TARGET}/admin-panel/src/app/dashboard/dissertations/new/"
cp "${SOURCE}/admin-panel/src/app/dashboard/dissertations/[id]/edit/page.tsx" "${TARGET}/admin-panel/src/app/dashboard/dissertations/[id]/edit/"

# Frontend
echo -e "${YELLOW}Копирование Frontend...${NC}"

# Создаем необходимые директории
mkdir -p "${TARGET}/frontend/src/app/articles"
mkdir -p "${TARGET}/frontend/src/app/books"
mkdir -p "${TARGET}/frontend/src/app/dissertations"

cp -r "${SOURCE}/frontend/src/app/articles/" "${TARGET}/frontend/src/app/" 2>/dev/null || true
cp "${SOURCE}/frontend/src/services/savedService.ts" "${TARGET}/frontend/src/services/"
cp "${SOURCE}/frontend/src/app/dissertations/page.tsx" "${TARGET}/frontend/src/app/dissertations/" 2>/dev/null || true
cp "${SOURCE}/frontend/src/components/ArticleCard.tsx" "${TARGET}/frontend/src/components/"

echo -e "${GREEN}✓ Файлы скопированы${NC}"
echo ""

# Перезапуск сервисов
echo -e "${YELLOW}Перезапуск сервисов...${NC}"

systemctl restart smu-content.service
echo -e "${BLUE}→ Content Service перезапущен${NC}"

systemctl restart smu-api-gateway.service
echo -e "${BLUE}→ API Gateway перезапущен${NC}"

systemctl restart smu-media.service 2>/dev/null || echo "Media Service не через systemd"

# Проверка статуса
sleep 2
echo ""
echo -e "${YELLOW}Статус сервисов:${NC}"
systemctl is-active smu-content.service && echo -e "${GREEN}✓ Content Service${NC}" || echo "✗ Content Service"
systemctl is-active smu-api-gateway.service && echo -e "${GREEN}✓ API Gateway${NC}" || echo "✗ API Gateway"
systemctl is-active smu-media.service 2>/dev/null && echo -e "${GREEN}✓ Media Service${NC}" || echo "Media Service (Docker)"

echo ""
echo -e "${GREEN}=== Обновления применены ===${NC}"
echo ""
echo "Новые возможности:"
echo "  ${GREEN}✓${NC} Загрузка изображений для Articles, Books и Dissertations"
echo "  ${GREEN}✓${NC} Компонент ImageUpload с превью и валидацией"
echo "  ${GREEN}✓${NC} Поддержка форматов: JPEG, JPG, PNG, GIF (до 5MB)"
echo "  ${GREEN}✓${NC} Исправление ошибки JSON с многострочным текстом"
echo "  ${GREEN}✓${NC} Валидация и очистка контента от управляющих символов"
echo "  ${GREEN}✓${NC} Сохранение и выделение текста в статьях (Frontend)"
echo "  ${GREEN}✓${NC} Исправление категорий диссертаций"
echo ""
echo "Проверьте:"
echo "  - ${BLUE}Админка:${NC} http://172.20.102.83:3001/dashboard/articles/new"
echo "  - ${BLUE}Frontend:${NC} http://172.20.102.83:3002/articles/3"
echo "  - ${BLUE}Media API:${NC} http://172.20.102.83:3000/api/v1/docs (раздел Media)"
echo ""
