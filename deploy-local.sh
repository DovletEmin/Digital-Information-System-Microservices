#!/bin/bash

# Скрипт для копирования обновлений локально
# Использование: ./deploy-local.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Копирование обновлений SMU Microservices ===${NC}"
echo ""

# Настройки
SOURCE_PATH="/mnt/c/Users/Emin/Desktop/SMU-Microservices"
TARGET_PATH="/opt/smu-microservices"

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Запустите скрипт с sudo${NC}"
    exit 1
fi

echo -e "${YELLOW}Копирование обновленных файлов...${NC}"
echo ""

# Content Service
echo "→ Content Service..."
cp -v "${SOURCE_PATH}/services/content-service/models.py" "${TARGET_PATH}/services/content-service/"
cp -v "${SOURCE_PATH}/services/content-service/schemas.py" "${TARGET_PATH}/services/content-service/"
cp -v "${SOURCE_PATH}/services/content-service/main.py" "${TARGET_PATH}/services/content-service/"
cp -v "${SOURCE_PATH}/services/content-service/migrate_db.py" "${TARGET_PATH}/services/content-service/"

# Копируем роутеры
echo "→ Content Service routers..."
cp -v "${SOURCE_PATH}/services/content-service/routers/saved.py" "${TARGET_PATH}/services/content-service/routers/"
cp -v "${SOURCE_PATH}/services/content-service/routers/articles.py" "${TARGET_PATH}/services/content-service/routers/" 2>/dev/null || true
cp -v "${SOURCE_PATH}/services/content-service/routers/dissertations.py" "${TARGET_PATH}/services/content-service/routers/" 2>/dev/null || true

# Frontend
echo "→ Frontend..."
# Создаем директории если их нет
mkdir -p "${TARGET_PATH}/frontend/src/app/articles"
mkdir -p "${TARGET_PATH}/frontend/src/services"

# Копируем страницу статьи
cp -rv "${SOURCE_PATH}/frontend/src/app/articles/" "${TARGET_PATH}/frontend/src/app/" 2>/dev/null || true

# Копируем компоненты и сервисы
cp -v "${SOURCE_PATH}/frontend/src/components/ArticleCard.tsx" "${TARGET_PATH}/frontend/src/components/" 2>/dev/null || true
cp -v "${SOURCE_PATH}/frontend/src/services/savedService.ts" "${TARGET_PATH}/frontend/src/services/"

# Копируем обновленную страницу диссертаций
cp -v "${SOURCE_PATH}/frontend/src/app/dissertations/page.tsx" "${TARGET_PATH}/frontend/src/app/dissertations/" 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Файлы скопированы${NC}"
echo ""

# Проверка Docker контейнеров
echo -e "${YELLOW}Проверка Docker контейнеров...${NC}"
cd "${TARGET_PATH}"

# Запуск БД если не запущена
if ! docker ps | grep -q "postgres"; then
    echo "→ Запуск PostgreSQL..."
    docker-compose up -d postgres
    echo "→ Ожидание готовности БД (10 сек)..."
    sleep 10
fi

# Миграция БД
echo -e "${YELLOW}Создание таблиц в БД...${NC}"
cd "${TARGET_PATH}/services/content-service"

# Используем переменные окружения из docker-compose
export DATABASE_URL="postgresql://content_user:content_pass@localhost:5433/content_db"
python3 migrate_db.py

echo ""
echo -e "${YELLOW}Перезапуск сервисов...${NC}"

# Перезапуск Content Service
echo "→ Перезапуск smu-content.service..."
systemctl restart smu-content.service
sleep 2
systemctl status smu-content.service --no-pager -l | head -15

echo ""
echo "→ Перезапуск smu-api-gateway.service..."
systemctl restart smu-api-gateway.service
sleep 1

# Проверка статуса
echo ""
echo -e "${YELLOW}Статус сервисов:${NC}"
systemctl is-active smu-content.service && echo -e "${GREEN}✓ Content Service: активен${NC}" || echo -e "${RED}✗ Content Service: ошибка${NC}"
systemctl is-active smu-api-gateway.service && echo -e "${GREEN}✓ API Gateway: активен${NC}" || echo -e "${RED}✗ API Gateway: ошибка${NC}"

echo ""
echo -e "${GREEN}=== Обновление завершено ===${NC}"
echo ""
echo "Обновленные компоненты:"
echo "  ✓ Content Service (models, schemas, routers)"
echo "  ✓ Новые таблицы: saved_articles, article_highlights"
echo "  ✓ Новые API: /saved-articles, /highlights"
echo "  ✓ Frontend: страница статьи, сервис закладок"
echo "  ✓ Frontend: исправление категорий диссертаций"
echo ""
echo "Проверьте работу:"
echo "  - http://172.20.102.83:3002/articles/3"
echo "  - http://172.20.102.83:3002/dissertations"
echo "  - http://172.20.102.83:3000/api/v1/docs"
echo ""
