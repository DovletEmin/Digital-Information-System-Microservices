#!/bin/bash

# Скрипт для запуска всех тестов проекта
# Usage: ./scripts/run-all-tests.sh

set -e

echo "🧪 Running SMU Microservices Test Suite"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run tests and track results
run_test() {
    local service=$1
    local command=$2
    
    echo ""
    echo "${YELLOW}Testing: $service${NC}"
    echo "----------------------------------------"
    
    if eval "$command"; then
        echo "${GREEN}✓ $service tests passed${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo "${RED}✗ $service tests failed${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Auth Service (Go)
run_test "Auth Service" "cd services/auth-service && go test ./... -v"

# Content Service (Python)
run_test "Content Service" "cd services/content-service && pip install -q -r requirements-test.txt && pytest -v"

# API Gateway (Node.js)
run_test "API Gateway" "cd services/api-gateway && npm install --silent && npm test"

# User Activity Service (Node.js)
run_test "User Activity" "cd services/user-activity && npm install --silent && npm test"

# Admin Panel (Next.js)
run_test "Admin Panel" "cd admin-panel && npm install --silent && npm test"

# Summary
echo ""
echo "========================================"
echo "📊 Test Summary"
echo "========================================"
echo "${GREEN}Passed: $TESTS_PASSED${NC}"
echo "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo "${RED}❌ Some tests failed${NC}"
    exit 1
fi
