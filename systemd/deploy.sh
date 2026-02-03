#!/bin/bash

# Скрипт для развертывания и сборки всех сервисов
# Использование: ./deploy.sh

set -e

echo "=== Развертывание SMU Microservices ==="

# Добавляем Go в PATH если он есть
export PATH=$PATH:/usr/local/go/bin

PROJECT_DIR="/opt/smu-microservices"
CURRENT_DIR=$(pwd)

# Проверка зависимостей
echo "Проверка необходимых зависимостей..."
missing_deps=()

if ! command -v node &> /dev/null; then
    missing_deps+=("Node.js")
fi

if ! command -v python3 &> /dev/null; then
    missing_deps+=("Python 3")
fi

if ! command -v go &> /dev/null; then
    missing_deps+=("Go")
fi

if [ ${#missing_deps[@]} -ne 0 ]; then
    echo "ОШИБКА: Не установлены следующие зависимости:"
    printf '  - %s\n' "${missing_deps[@]}"
    echo ""
    echo "Запустите сначала: sudo ./systemd/install-dependencies.sh"
    exit 1
fi

echo "✓ Node.js: $(node --version)"
echo "✓ Python: $(python3 --version)"
echo "✓ Go: $(go version | awk '{print $3}')"
echo ""

# Проверка прав root для копирования в /opt
if [ ! -d "$PROJECT_DIR" ]; then
    echo "Директория $PROJECT_DIR не существует. Создаем..."
    sudo mkdir -p $PROJECT_DIR
    sudo chown -R $USER:$USER $PROJECT_DIR
fi

echo "Копирование файлов в $PROJECT_DIR..."
rsync -av --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude '__pycache__' \
    $CURRENT_DIR/ $PROJECT_DIR/

cd $PROJECT_DIR

echo ""
echo "=== Сборка Auth Service (Go) ==="
cd services/auth-service
go build -o auth-service main.go
chmod +x auth-service

echo ""
echo "=== Установка зависимостей Content Service (Python) ==="
cd ../content-service
pip3 install -r requirements.txt

echo ""
echo "=== Установка зависимостей API Gateway (Node.js) ==="
cd ../api-gateway
npm install --production

echo ""
echo "=== Установка зависимостей Search Service (Python) ==="
cd ../search-service
pip3 install -r requirements.txt

echo ""
echo "=== Установка зависимостей User Activity (Node.js) ==="
cd ../user-activity
npm install --production

echo ""
echo "=== Сборка Media Service (Go) ==="
cd ../media-service
go build -o media-service main.go
chmod +x media-service

echo ""
echo "=== Сборка Admin Panel (Next.js) ==="
cd ../../admin-panel
npm install
npm run build

echo ""
echo "=== Развертывание завершено ==="
echo "Теперь запустите: sudo ./systemd/install-systemd.sh"
