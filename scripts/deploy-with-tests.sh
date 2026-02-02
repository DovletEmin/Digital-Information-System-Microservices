#!/bin/bash

# Скрипт для автоматического деплоя с тестированием
# Usage: ./scripts/deploy-with-tests.sh

set -e  # Остановить при ошибке

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}   SMU Microservices Deploy Pipeline   ${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# 1. Обновление кода
echo ""
echo -e "${YELLOW}📥 Step 1: Pulling latest code...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to pull latest code${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Code updated${NC}"

# 2. Сборка тестовых образов
echo ""
echo -e "${YELLOW}🏗️  Step 2: Building test images...${NC}"
docker-compose -f docker-compose.test.yml build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build test images${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Test images built${NC}"

# 3. Запуск тестов
echo ""
echo -e "${YELLOW}🧪 Step 3: Running tests...${NC}"
./scripts/test-docker.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed! Aborting deployment.${NC}"
    echo -e "${RED}   Fix the issues and try again.${NC}"
    docker-compose -f docker-compose.test.yml down
    exit 1
fi

echo -e "${GREEN}✓ All tests passed${NC}"

# 4. Очистка тестовых контейнеров
echo ""
echo -e "${YELLOW}🧹 Step 4: Cleaning up test containers...${NC}"
docker-compose -f docker-compose.test.yml down -v

echo -e "${GREEN}✓ Cleanup complete${NC}"

# 5. Деплой
echo ""
echo -e "${YELLOW}🚀 Step 5: Deploying services...${NC}"

# Остановить старые контейнеры
docker-compose down

# Собрать и запустить новые
docker-compose up -d --build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Services deployed${NC}"

# 6. Проверка здоровья сервисов
echo ""
echo -e "${YELLOW}🏥 Step 6: Health check...${NC}"
sleep 10

services=("auth-service" "content-service" "api-gateway" "user-activity" "admin-panel")
all_healthy=true

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "$service.*Up"; then
        echo -e "${GREEN}✓ $service is running${NC}"
    else
        echo -e "${RED}✗ $service is not running${NC}"
        all_healthy=false
    fi
done

# 7. Итоги
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"

if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    echo -e "${BLUE}Services are running:${NC}"
    echo "  - API Gateway:    http://localhost:3000"
    echo "  - Auth Service:   http://localhost:8001"
    echo "  - Content Service: http://localhost:8002"
    echo "  - Admin Panel:    http://localhost:3001"
    echo ""
    echo -e "${GREEN}✅ All systems operational${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Deployment completed with warnings${NC}"
    echo -e "${YELLOW}   Some services may not be running correctly${NC}"
    echo -e "${YELLOW}   Check logs: docker-compose logs${NC}"
    exit 1
fi
