#!/bin/bash

# Проверка наличия необходимых файлов для тестирования
# Usage: ./scripts/check-test-files.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking test configuration files..."
echo ""

MISSING_FILES=()

# Проверка Dockerfile.test для каждого сервиса
declare -A services=(
    ["services/auth-service/Dockerfile.test"]="Auth Service test Dockerfile"
    ["services/content-service/Dockerfile.test"]="Content Service test Dockerfile"
    ["services/api-gateway/Dockerfile.test"]="API Gateway test Dockerfile"
    ["services/user-activity/Dockerfile.test"]="User Activity test Dockerfile"
    ["admin-panel/Dockerfile.test"]="Admin Panel test Dockerfile"
)

for file in "${!services[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} ${services[$file]}"
    else
        echo -e "${RED}✗${NC} ${services[$file]} - MISSING"
        MISSING_FILES+=("$file")
    fi
done

# Проверка других важных файлов
echo ""
echo "Checking other files..."

OTHER_FILES=(
    "docker-compose.test.yml:Docker Compose test config"
    "scripts/test-docker.sh:Test execution script"
)

for entry in "${OTHER_FILES[@]}"; do
    file="${entry%%:*}"
    desc="${entry##*:}"
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $desc"
    else
        echo -e "${RED}✗${NC} $desc - MISSING"
        MISSING_FILES+=("$file")
    fi
done

# Итог
echo ""
echo "========================================"

if [ ${#MISSING_FILES[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All test files are present!${NC}"
    echo ""
    echo "You can now run tests with:"
    echo "  ./scripts/test-docker.sh"
    exit 0
else
    echo -e "${RED}❌ Missing ${#MISSING_FILES[@]} file(s):${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo -e "  ${RED}-${NC} $file"
    done
    echo ""
    echo -e "${YELLOW}Action required:${NC}"
    echo "These files should have been created. Options:"
    echo "1. Run 'git pull' to get latest files"
    echo "2. Check if you're in the correct directory"
    echo "3. Contact the repository maintainer"
    exit 1
fi
