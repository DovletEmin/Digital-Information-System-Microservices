#!/bin/bash

# Продолжение установки БЕЗ Elasticsearch (можно установить позже)
# Использование: sudo ./continue-install-minimal.sh

set -e

echo "=== Продолжение установки зависимостей (минимальная версия) ==="

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    echo "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

echo ""
echo "=== Установка PostgreSQL 15 ==="
if ! command -v psql &> /dev/null; then
    # Добавление официального репозитория PostgreSQL
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update

    apt install -y postgresql-15 postgresql-contrib-15

    # Запуск PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
else
    echo "PostgreSQL уже установлен"
fi

echo ""
echo "=== Установка MongoDB 7 ==="
if ! command -v mongod &> /dev/null; then
    # Импорт публичного ключа
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

    # Добавление репозитория
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

    apt update
    apt install -y mongodb-org

    # Запуск MongoDB
    systemctl start mongod
    systemctl enable mongod
else
    echo "MongoDB уже установлен"
fi

echo ""
echo "=== Установка Redis ==="
if ! command -v redis-server &> /dev/null; then
    apt install -y redis-server

    systemctl start redis-server
    systemctl enable redis-server
else
    echo "Redis уже установлен"
fi

echo ""
echo "=== Пропуск Elasticsearch (можно установить позже) ==="
echo "Для установки Elasticsearch запустите позже:"
echo "  sudo ./systemd/fix-elasticsearch.sh"

echo ""
echo "=== Установка RabbitMQ ==="
if ! command -v rabbitmqctl &> /dev/null; then
    apt install -y rabbitmq-server

    systemctl start rabbitmq-server
    systemctl enable rabbitmq-server

    # Включение management plugin
    rabbitmq-plugins enable rabbitmq_management
else
    echo "RabbitMQ уже установлен"
fi

echo ""
echo "=== Установка MinIO ==="
if [ ! -f /usr/local/bin/minio ]; then
    wget https://dl.min.io/server/minio/release/linux-amd64/minio -O /usr/local/bin/minio
    chmod +x /usr/local/bin/minio

    # Создание директории для MinIO
    mkdir -p /data/minio

    # Создание systemd service для MinIO
    cat > /etc/systemd/system/minio.service << 'EOF'
[Unit]
Description=MinIO
Documentation=https://min.io/docs/minio/linux/index.html
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
WorkingDirectory=/usr/local

User=minio-user
Group=minio-user
ProtectProc=invisible

Environment="MINIO_ROOT_USER=minioadmin"
Environment="MINIO_ROOT_PASSWORD=minioadmin"

ExecStart=/usr/local/bin/minio server /data/minio --console-address ":9001"

Restart=always
RestartSec=10

StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    # Создание пользователя для MinIO
    id -u minio-user &>/dev/null || useradd -r minio-user -s /sbin/nologin
    chown -R minio-user:minio-user /data/minio

    systemctl daemon-reload
    systemctl start minio
    systemctl enable minio
else
    echo "MinIO уже установлен"
fi

echo ""
echo "=== Настройка PostgreSQL баз данных ==="

# Создание пользователя и баз данных
sudo -u postgres psql << 'EOF'
-- Создание пользователя
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'smuuser') THEN
        CREATE USER smuuser WITH PASSWORD 'smupass';
    END IF;
END
$$;

-- Создание баз данных
SELECT 'CREATE DATABASE smu_auth' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'smu_auth')\gexec
SELECT 'CREATE DATABASE smu_content' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'smu_content')\gexec

-- Права
GRANT ALL PRIVILEGES ON DATABASE smu_auth TO smuuser;
GRANT ALL PRIVILEGES ON DATABASE smu_content TO smuuser;

\q
EOF

echo ""
echo "=== Настройка PostgreSQL для подключений ==="
# Разрешаем подключения с localhost
if ! grep -q "host.*smu_auth.*smuuser.*127.0.0.1" /etc/postgresql/15/main/pg_hba.conf; then
    echo "host    smu_auth        smuuser         127.0.0.1/32            md5" >> /etc/postgresql/15/main/pg_hba.conf
    echo "host    smu_content     smuuser         127.0.0.1/32            md5" >> /etc/postgresql/15/main/pg_hba.conf
    systemctl restart postgresql
fi

echo ""
echo "=== Проверка установленных сервисов ==="
echo "✓ Node.js: $(node --version)"
echo "✓ npm: $(npm --version)"
echo "✓ Python: $(python3 --version)"
echo "✓ Go: $(/usr/local/go/bin/go version | awk '{print $3}')"
echo "✓ PostgreSQL: $(sudo -u postgres psql --version | awk '{print $3}')"
echo "✓ MongoDB: $(mongod --version | head -n1 | awk '{print $3}')"
echo "✓ Redis: $(redis-server --version | awk '{print $3}')"
echo "⚠ Elasticsearch: не установлен (опционально)"

echo ""
echo "=== Проверка статуса сервисов ==="
systemctl is-active postgresql && echo "✓ PostgreSQL: running" || echo "✗ PostgreSQL: stopped"
systemctl is-active mongod && echo "✓ MongoDB: running" || echo "✗ MongoDB: stopped"
systemctl is-active redis-server && echo "✓ Redis: running" || echo "✗ Redis: stopped"
systemctl is-active rabbitmq-server && echo "✓ RabbitMQ: running" || echo "✗ RabbitMQ: stopped"
systemctl is-active minio && echo "✓ MinIO: running" || echo "✗ MinIO: stopped"

echo ""
echo "=== Установка завершена! ==="
echo ""
echo "ВАЖНО: Примените изменения PATH:"
echo "  source /etc/profile"
echo "  source ~/.bashrc"
echo ""
echo "Проверьте Go:"
echo "  go version"
echo ""
echo "Теперь запустите развертывание:"
echo "  ./systemd/deploy.sh"
echo ""
echo "ПРИМЕЧАНИЕ: Search Service требует Elasticsearch."
echo "Если хотите использовать поиск, установите Elasticsearch:"
echo "  sudo ./systemd/fix-elasticsearch.sh"
