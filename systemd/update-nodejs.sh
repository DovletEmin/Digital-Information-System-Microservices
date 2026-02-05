#!/bin/bash

# Обновление Node.js до версии 20
# Использование: sudo ./update-nodejs.sh

set -e

echo "=== Обновление Node.js до версии 20 ==="

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    echo "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

echo "Текущая версия Node.js: $(node --version 2>/dev/null || echo 'не установлен')"
echo ""

# Удаление старой версии Node.js (если есть)
echo "Удаление старой версии Node.js..."
apt remove -y nodejs npm || true

# Очистка старых репозиториев
rm -f /etc/apt/sources.list.d/nodesource.list

# Установка Node.js 20.x
echo "Установка Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ""
echo "Новая версия Node.js: $(node --version)"
echo "Версия npm: $(npm --version)"

echo ""
echo "=== Обновление завершено ==="
echo ""
echo "Теперь можно продолжить развертывание:"
echo "  ./systemd/deploy.sh"
