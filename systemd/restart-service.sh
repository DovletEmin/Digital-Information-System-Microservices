#!/bin/bash

# Скрипт для быстрого перезапуска конкретного сервиса
# Использование: ./restart-service.sh <service-name>
# Пример: ./restart-service.sh auth

if [ -z "$1" ]; then
    echo "Использование: ./restart-service.sh <service-name>"
    echo "Доступные сервисы: auth, content, search, user-activity, media, api-gateway, admin-panel"
    exit 1
fi

SERVICE="smu-$1"

echo "Перезапуск $SERVICE..."
sudo systemctl restart $SERVICE

echo "Проверка статуса..."
sleep 1
sudo systemctl status $SERVICE

echo ""
echo "Последние логи:"
sudo journalctl -u $SERVICE -n 20 --no-pager
