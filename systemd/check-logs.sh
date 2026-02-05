#!/bin/bash

# Проверка логов всех сервисов
# Использование: ./check-logs.sh [service-name]

if [ -n "$1" ]; then
    # Показать логи конкретного сервиса
    echo "=== Логи smu-$1 ==="
    sudo journalctl -u smu-$1 -n 50 --no-pager
else
    # Показать статус и последние логи всех сервисов
    services=("auth" "content" "search" "user-activity" "media" "api-gateway" "admin-panel")
    
    for service in "${services[@]}"; do
        echo "================================"
        echo "=== smu-$service ==="
        echo "================================"
        
        if systemctl is-active --quiet smu-$service; then
            echo "✓ STATUS: Running"
        else
            echo "✗ STATUS: Stopped/Failed"
        fi
        
        echo ""
        echo "--- Последние логи ---"
        sudo journalctl -u smu-$service -n 10 --no-pager
        echo ""
    done
fi
