#!/bin/bash

# Скрипт для развертывания обновлений на сервер через WSL
# Использование: ./deploy-updates.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Развертывание обновлений SMU Microservices ===${NC}"
echo ""

# Настройки
LOCAL_PATH="/mnt/c/Users/Emin/Desktop/SMU-Microservices"
REMOTE_USER="root"
REMOTE_HOST="172.20.102.83"
REMOTE_PATH="/opt/smu-microservices"

# Проверка наличия SSH ключа
echo -e "${YELLOW}Проверка SSH подключения...${NC}"
if ! ssh -o ConnectTimeout=5 ${REMOTE_USER}@${REMOTE_HOST} "echo 'SSH OK'" &>/dev/null; then
    echo -e "${RED}Ошибка: Не удается подключиться к серверу${NC}"
    echo "Убедитесь, что:"
    echo "  1. Сервер доступен"
    echo "  2. SSH настроен правильно"
    exit 1
fi
echo -e "${GREEN}✓ SSH подключение работает${NC}"
echo ""

# Файлы и директории для синхронизации
echo -e "${YELLOW}Синхронизация файлов...${NC}"

# Content Service - обновленные файлы
echo "→ Content Service..."
rsync -avz --progress \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.pytest_cache' \
    --exclude='venv' \
    "${LOCAL_PATH}/services/content-service/models.py" \
    "${LOCAL_PATH}/services/content-service/schemas.py" \
    "${LOCAL_PATH}/services/content-service/main.py" \
    "${LOCAL_PATH}/services/content-service/migrate_db.py" \
    "${LOCAL_PATH}/services/content-service/routers/" \
    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/services/content-service/

# Frontend - обновленные файлы
echo "→ Frontend..."
rsync -avz --progress \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='build' \
    "${LOCAL_PATH}/frontend/src/app/articles/" \
    "${LOCAL_PATH}/frontend/src/components/ArticleCard.tsx" \
    "${LOCAL_PATH}/frontend/src/services/savedService.ts" \
    "${LOCAL_PATH}/frontend/src/app/dissertations/page.tsx" \
    ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/frontend/src/

echo -e "${GREEN}✓ Файлы синхронизированы${NC}"
echo ""

# Выполнение команд на сервере
echo -e "${YELLOW}Выполнение обновлений на сервере...${NC}"

ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
set -e

cd /opt/smu-microservices

echo "→ Создание таблиц в БД..."
cd services/content-service
python3 migrate_db.py
cd ../..

echo "→ Перезапуск Content Service..."
systemctl restart smu-content.service

echo "→ Перезапуск Frontend..."
# Если фронтенд через systemd
if systemctl list-units --full -all | grep -q "smu-frontend.service"; then
    systemctl restart smu-frontend.service
else
    # Если через docker или другой способ
    cd frontend
    npm install --production 2>/dev/null || true
    pm2 restart smu-frontend 2>/dev/null || true
fi

echo "→ Проверка статуса сервисов..."
systemctl status smu-content.service --no-pager -l | head -10

echo ""
echo "✓ Обновления применены успешно!"
echo ""
echo "Обновленные компоненты:"
echo "  - Content Service (models, schemas, routers, saved articles)"
echo "  - Frontend (article page, saved service, dissertations fix)"

ENDSSH

echo ""
echo -e "${GREEN}=== Развертывание завершено ===${NC}"
echo ""
echo "Проверьте работу:"
echo "  - http://172.20.102.83:3002/articles/3 - страница статьи"
echo "  - http://172.20.102.83:8002/docs - API документация"
echo ""
