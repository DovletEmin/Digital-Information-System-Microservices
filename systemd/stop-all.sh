#!/bin/bash

# Остановка всех сервисов в правильном порядке (обратном от запуска)

echo "Остановка SMU Microservices..."

sudo systemctl stop smu-admin-panel
sudo systemctl stop smu-api-gateway
sudo systemctl stop smu-media
sudo systemctl stop smu-user-activity
sudo systemctl stop smu-search
sudo systemctl stop smu-content
sudo systemctl stop smu-auth

echo "Все сервисы остановлены"
