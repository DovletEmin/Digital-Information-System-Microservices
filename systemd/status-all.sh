#!/bin/bash

# Проверка статуса всех сервисов

echo "=== Статус SMU Microservices ==="
echo ""

services=("smu-auth" "smu-content" "smu-search" "smu-user-activity" "smu-media" "smu-api-gateway" "smu-admin-panel")

for service in "${services[@]}"; do
    echo "--- $service ---"
    systemctl is-active --quiet $service && echo "✓ Running" || echo "✗ Stopped"
    echo ""
done

echo ""
echo "Детальный статус:"
sudo systemctl status smu-auth smu-content smu-search smu-user-activity smu-media smu-api-gateway smu-admin-panel
