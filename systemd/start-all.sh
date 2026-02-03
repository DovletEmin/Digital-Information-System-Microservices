#!/bin/bash

# Запуск всех сервисов в правильном порядке

echo "Запуск SMU Microservices..."

# Сначала базовые сервисы
sudo systemctl start smu-auth
sudo systemctl start smu-content
sudo systemctl start smu-search
sudo systemctl start smu-user-activity
sudo systemctl start smu-media

# Ждем несколько секунд чтобы сервисы запустились
sleep 3

# Затем API Gateway
sudo systemctl start smu-api-gateway

# Ждем еще немного
sleep 2

# И наконец Admin Panel
sudo systemctl start smu-admin-panel

echo ""
echo "Проверка статуса сервисов:"
sudo systemctl status smu-auth smu-content smu-search smu-user-activity smu-media smu-api-gateway smu-admin-panel
