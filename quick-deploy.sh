#!/bin/bash

# Быстрое обновление и перезапуск сервисов
# Использование: sudo ./quick-deploy.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== Быстрое развертывание ===${NC}"
echo ""

SOURCE="/mnt/c/Users/Emin/Desktop/SMU-Microservices"
TARGET="/opt/smu-microservices"

# Копирование
echo -e "${YELLOW}Копирование файлов...${NC}"
cp "${SOURCE}/services/content-service/models.py" "${TARGET}/services/content-service/"
cp "${SOURCE}/services/content-service/schemas.py" "${TARGET}/services/content-service/"
cp "${SOURCE}/services/content-service/main.py" "${TARGET}/services/content-service/"
cp "${SOURCE}/services/content-service/routers/saved.py" "${TARGET}/services/content-service/routers/"
cp "${SOURCE}/services/content-service/routers/dissertations.py" "${TARGET}/services/content-service/routers/"
cp -r "${SOURCE}/frontend/src/app/articles/" "${TARGET}/frontend/src/app/" 2>/dev/null || true
cp "${SOURCE}/frontend/src/services/savedService.ts" "${TARGET}/frontend/src/services/"
cp "${SOURCE}/frontend/src/app/dissertations/page.tsx" "${TARGET}/frontend/src/app/dissertations/"
cp "${SOURCE}/frontend/src/components/ArticleCard.tsx" "${TARGET}/frontend/src/components/"

echo -e "${GREEN}✓ Файлы скопированы${NC}"
echo ""

# Перезапуск сервисов (они сами создадут таблицы)
echo -e "${YELLOW}Перезапуск сервисов...${NC}"
systemctl restart smu-content.service
systemctl restart smu-api-gateway.service

sleep 3

# Статус
echo ""
systemctl is-active smu-content.service && echo -e "${GREEN}✓ Content Service${NC}" || echo "✗ Content Service"
systemctl is-active smu-api-gateway.service && echo -e "${GREEN}✓ API Gateway${NC}" || echo "✗ API Gateway"

echo ""
echo -e "${GREEN}Готово!${NC} Таблицы будут созданы автоматически при запуске сервиса."
echo ""
