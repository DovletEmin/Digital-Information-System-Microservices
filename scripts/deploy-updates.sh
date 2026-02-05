#!/bin/bash

# Скрипт для копирования обновлений на сервер и перезапуска сервисов

set -e

echo "🚀 Начало развертывания обновлений..."

SOURCE_DIR="/mnt/c/Users/Emin/Desktop/SMU-Microservices"
TARGET_DIR="/opt/smu-microservices"

# Проверяем, что мы в WSL и целевая директория существует
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Директория $TARGET_DIR не найдена!"
    echo "Создаем директорию..."
    sudo mkdir -p "$TARGET_DIR"
fi

echo "📋 Копирование обновленных файлов..."

# Backend: content-service
echo "  → content-service..."
sudo cp -r "$SOURCE_DIR/services/content-service/models.py" "$TARGET_DIR/services/content-service/"
sudo cp -r "$SOURCE_DIR/services/content-service/schemas.py" "$TARGET_DIR/services/content-service/"
sudo cp -r "$SOURCE_DIR/services/content-service/main.py" "$TARGET_DIR/services/content-service/"
sudo cp -r "$SOURCE_DIR/services/content-service/routers/" "$TARGET_DIR/services/content-service/"
sudo cp -r "$SOURCE_DIR/services/content-service/migrate_db.py" "$TARGET_DIR/services/content-service/"

# Frontend
echo "  → frontend..."
sudo cp -r "$SOURCE_DIR/frontend/src/app/articles/" "$TARGET_DIR/frontend/src/app/"
sudo cp -r "$SOURCE_DIR/frontend/src/app/dissertations/page.tsx" "$TARGET_DIR/frontend/src/app/dissertations/"
sudo cp -r "$SOURCE_DIR/frontend/src/services/savedService.ts" "$TARGET_DIR/frontend/src/services/"
sudo cp -r "$SOURCE_DIR/frontend/src/components/ArticleCard.tsx" "$TARGET_DIR/frontend/src/components/"

echo "✅ Файлы скопированы"

# Запуск миграции базы данных
echo ""
echo "🗄️  Запуск миграции базы данных..."
cd "$TARGET_DIR/services/content-service"
sudo python3 migrate_db.py

echo ""
echo "🔄 Перезапуск сервисов..."

# Перезапуск content-service
echo "  → Перезапуск smu-content.service..."
sudo systemctl restart smu-content.service
sleep 2
sudo systemctl status smu-content.service --no-pager

# Проверяем статус
echo ""
echo "📊 Проверка статуса сервисов..."
sudo systemctl is-active smu-content.service && echo "✅ content-service работает" || echo "❌ content-service не запущен"

echo ""
echo "✨ Развертывание завершено!"
echo ""
echo "📝 Примечания:"
echo "  - Frontend нужно пересобрать вручную (npm run build в папке frontend)"
echo "  - Для просмотра логов: sudo journalctl -u smu-content.service -f"
