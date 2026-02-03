#!/bin/bash

# Скрипт для установки systemd сервисов SMU Microservices
# Использование: sudo ./install-systemd.sh

set -e

echo "=== Установка SMU Microservices systemd сервисов ==="

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    echo "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

# Директория проекта
PROJECT_DIR="/opt/smu-microservices"
SYSTEMD_DIR="/etc/systemd/system"

echo "Создание директории проекта..."
mkdir -p $PROJECT_DIR

echo "Копирование systemd unit файлов..."
cp systemd/*.service $SYSTEMD_DIR/

echo "Перезагрузка systemd daemon..."
systemctl daemon-reload

echo "Включение сервисов для автозапуска..."
systemctl enable smu-auth.service
systemctl enable smu-content.service
systemctl enable smu-api-gateway.service
systemctl enable smu-search.service
systemctl enable smu-user-activity.service
systemctl enable smu-media.service
systemctl enable smu-admin-panel.service

echo ""
echo "=== Установка завершена ==="
echo ""
echo "Для управления сервисами используйте:"
echo "  sudo systemctl start smu-auth      # Запустить auth service"
echo "  sudo systemctl stop smu-auth       # Остановить auth service"
echo "  sudo systemctl restart smu-auth    # Перезапустить auth service"
echo "  sudo systemctl status smu-auth     # Проверить статус"
echo "  sudo journalctl -u smu-auth -f     # Посмотреть логи"
echo ""
echo "Запуск всех сервисов:"
echo "  sudo systemctl start smu-auth smu-content smu-search smu-user-activity smu-media smu-api-gateway smu-admin-panel"
echo ""
echo "Остановка всех сервисов:"
echo "  sudo systemctl stop smu-admin-panel smu-api-gateway smu-media smu-user-activity smu-search smu-content smu-auth"
