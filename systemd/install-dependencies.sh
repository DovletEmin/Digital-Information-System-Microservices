#!/bin/bash

# Скрипт для установки всех необходимых зависимостей
# Использование: sudo ./install-dependencies.sh

set -e

echo "=== Установка зависимостей для SMU Microservices ==="

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    echo "Пожалуйста, запустите скрипт с правами root (sudo)"
    exit 1
fi

echo ""
echo "=== Обновление системы ==="
apt update && apt upgrade -y

echo ""
echo "=== Установка базовых утилит ==="
apt install -y curl wget git build-essential rsync software-properties-common apt-transport-https ca-certificates gnupg lsb-release

echo ""
echo "=== Установка Node.js 20.x ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ""
echo "=== Установка Python 3 и pip ==="
apt install -y python3 python3-pip python3-venv python3-dev

# Обновление pip
pip3 install --upgrade pip

echo ""
echo "=== Установка Go 1.21.5 ==="
cd /tmp
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
rm -rf /usr/local/go
tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
rm go1.21.5.linux-amd64.tar.gz

# Добавляем Go в PATH для всех пользователей
if ! grep -q "/usr/local/go/bin" /etc/profile; then
    echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
fi

# Добавляем для текущего пользователя
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    if ! grep -q "/usr/local/go/bin" "$USER_HOME/.bashrc"; then
        echo 'export PATH=$PATH:/usr/local/go/bin' >> "$USER_HOME/.bashrc"
        chown $SUDO_USER:$SUDO_USER "$USER_HOME/.bashrc"
    fi
fi

echo ""
echo "=== Установка PostgreSQL 15 ==="
# Добавление официального репозитория PostgreSQL
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update

apt install -y postgresql-15 postgresql-contrib-15

# Запуск PostgreSQL
systemctl start postgresql
systemctl enable postgresql

echo ""
echo "=== Установка MongoDB 7 ==="
# Импорт публичного ключа
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Добавление репозитория
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list

apt update
apt install -y mongodb-org

# Запуск MongoDB
systemctl start mongod
systemctl enable mongod

echo ""
echo "=== Установка Redis ==="
apt install -y redis-server

systemctl start redis-server
systemctl enable redis-server

echo ""
echo "=== Установка Elasticsearch 8.11 ==="
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list

apt update
apt install -y elasticsearch

# Настройка Elasticsearch для разработки (без безопасности)
cat > /etc/elasticsearch/elasticsearch.yml << 'EOF'
cluster.name: smu-cluster
node.name: node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 0.0.0.0
http.port: 9200
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
EOF

systemctl start elasticsearch
systemctl enable elasticsearch

echo ""
echo "=== Установка RabbitMQ ==="
apt install -y rabbitmq-server

systemctl start rabbitmq-server
systemctl enable rabbitmq-server

# Включение management plugin
rabbitmq-plugins enable rabbitmq_management

echo ""
echo "=== Установка MinIO ==="
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
useradd -r minio-user -s /sbin/nologin || true
chown -R minio-user:minio-user /data/minio

systemctl daemon-reload
systemctl start minio
systemctl enable minio

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
echo "=== Настройка PostgreSQL для внешних подключений (опционально) ==="
# Разрешаем подключения с localhost
if ! grep -q "host.*smu_auth.*smuuser.*127.0.0.1" /etc/postgresql/15/main/pg_hba.conf; then
    echo "host    smu_auth        smuuser         127.0.0.1/32            md5" >> /etc/postgresql/15/main/pg_hba.conf
    echo "host    smu_content     smuuser         127.0.0.1/32            md5" >> /etc/postgresql/15/main/pg_hba.conf
    systemctl restart postgresql
fi

echo ""
echo "=== Установка Nginx (опционально) ==="
apt install -y nginx

echo ""
echo "=== Проверка установленных версий ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "Python: $(python3 --version)"
echo "pip: $(pip3 --version)"
echo "Go: $(/usr/local/go/bin/go version)"
echo "PostgreSQL: $(sudo -u postgres psql --version)"
echo "MongoDB: $(mongod --version | head -n1)"
echo "Redis: $(redis-server --version)"

echo ""
echo "=== Установка завершена! ==="
echo ""
echo "ВАЖНО: Выполните следующие команды для применения изменений PATH:"
echo "  source /etc/profile"
echo "  source ~/.bashrc"
echo ""
echo "Или просто выйдите и войдите заново в систему."
echo ""
echo "Проверьте, что Go доступен:"
echo "  go version"
echo ""
echo "После этого запустите:"
echo "  ./systemd/deploy.sh"
