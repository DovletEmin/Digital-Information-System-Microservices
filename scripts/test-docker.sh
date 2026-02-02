#!/bin/bash

# Скрипт для запуска тестов в Docker контейнерах
# Usage: ./scripts/test-docker.sh [service-name]

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICES=("auth-service" "content-service" "api-gateway" "user-activity" "admin-panel")
FAILED_SERVICES=()

echo -e "${BLUE}🐳 Running tests in Docker containers${NC}"
echo "========================================"

# Function to test a specific service
test_service() {
    local service=$1
    
    echo ""
    echo -e "${YELLOW}Testing: $service${NC}"
    echo "----------------------------------------"
    
    if docker-compose -f docker-compose.test.yml run --rm "test-$service"; then
        echo -e "${GREEN}✓ $service tests passed${NC}"
        return 0
    else
        echo -e "${RED}✗ $service tests failed${NC}"
        FAILED_SERVICES+=("$service")
        return 1
    fi
}

# If specific service provided, test only that
if [ ! -z "$1" ]; then
    test_service "$1"
    exit $?
fi

# Otherwise test all services
for service in "${SERVICES[@]}"; do
    test_service "$service" || true
done

# Clean up
echo ""
echo -e "${BLUE}Cleaning up...${NC}"
docker-compose -f docker-compose.test.yml down

# Summary
echo ""
echo "========================================"
echo -e "${BLUE}📊 Test Summary${NC}"
echo "========================================"

PASSED=$((${#SERVICES[@]} - ${#FAILED_SERVICES[@]}))
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: ${#FAILED_SERVICES[@]}${NC}"

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed services:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo -e "  - $service"
    done
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
fi
