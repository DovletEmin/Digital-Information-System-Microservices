# SMU Microservices - Развертывание с systemd

Инструкции по развертыванию микросервисов на Linux сервере с использованием systemd вместо Docker.

## Предварительные требования

### 1. Установка зависимостей

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Node.js и npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Python 3 и pip
sudo apt install -y python3 python3-pip python3-venv

# Go (версия 1.21+)
wget https://go.dev/dl/go1.21.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.21.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Git
sudo apt install -y git

# Build essentials
sudo apt install -y build-essential rsync
```

### 2. Установка баз данных и сервисов

```bash
# PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib

# MongoDB 7
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Redis
sudo apt install -y redis-server

# Elasticsearch 8.11
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update
sudo apt install -y elasticsearch

# RabbitMQ
sudo apt install -y rabbitmq-server

# MinIO (опционально, или можно использовать Docker)
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/
```

### 3. Настройка баз данных

```bash
# PostgreSQL - создание пользователя и баз данных
sudo -u postgres psql << EOF
CREATE USER smuuser WITH PASSWORD 'smupass';
CREATE DATABASE smu_auth OWNER smuuser;
CREATE DATABASE smu_content OWNER smuuser;
GRANT ALL PRIVILEGES ON DATABASE smu_auth TO smuuser;
GRANT ALL PRIVILEGES ON DATABASE smu_content TO smuuser;
\q
EOF

# Настройка PostgreSQL для двух портов (опционально)
# Можно использовать одну БД на одном порту, просто разные базы

# MongoDB - создание БД (создается автоматически при первом подключении)
# Но можно настроить авторизацию если нужно

# Redis - по умолчанию готов к работе

# Elasticsearch - настройка
sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch

# RabbitMQ
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server
sudo rabbitmq-plugins enable rabbitmq_management
```

## Развертывание

### Шаг 1: Клонирование репозитория

```bash
cd ~
git clone <your-repo-url> Digital-Information-System-Microservices
cd Digital-Information-System-Microservices
```

### Шаг 2: Сборка и развертывание сервисов

```bash
# Сделать скрипты исполняемыми
chmod +x systemd/*.sh

# Запустить развертывание
./systemd/deploy.sh
```

Этот скрипт:

- Копирует файлы в `/opt/smu-microservices`
- Собирает Go сервисы (auth, media)
- Устанавливает зависимости Python (content, search)
- Устанавливает зависимости Node.js (api-gateway, user-activity)
- Собирает Next.js приложение (admin-panel)

### Шаг 3: Установка systemd сервисов

```bash
sudo ./systemd/install-systemd.sh
```

### Шаг 4: Настройка переменных окружения (опционально)

Отредактируйте unit файлы в `/etc/systemd/system/smu-*.service` если нужно изменить:

- Пароли баз данных
- JWT секреты
- Порты
- URL сервисов

После изменений:

```bash
sudo systemctl daemon-reload
```

### Шаг 5: Запуск сервисов

```bash
# Запустить все сервисы
./systemd/start-all.sh

# Или запустить по отдельности
sudo systemctl start smu-auth
sudo systemctl start smu-content
sudo systemctl start smu-search
sudo systemctl start smu-user-activity
sudo systemctl start smu-media
sudo systemctl start smu-api-gateway
sudo systemctl start smu-admin-panel
```

### Шаг 6: Проверка статуса

```bash
# Проверить статус всех сервисов
./systemd/status-all.sh

# Или конкретного сервиса
sudo systemctl status smu-auth
```

## Управление сервисами

### Просмотр логов

```bash
# Последние логи конкретного сервиса
sudo journalctl -u smu-auth -n 50

# Следить за логами в реальном времени
sudo journalctl -u smu-auth -f

# Логи всех сервисов
sudo journalctl -u smu-* -f
```

### Перезапуск сервиса

```bash
# Через скрипт
./systemd/restart-service.sh auth

# Или напрямую
sudo systemctl restart smu-auth
```

### Остановка сервисов

```bash
# Остановить все
./systemd/stop-all.sh

# Или конкретный
sudo systemctl stop smu-auth
```

### Обновление кода

```bash
# 1. Остановить сервисы
./systemd/stop-all.sh

# 2. Обновить код
cd ~/Digital-Information-System-Microservices
git pull

# 3. Пересобрать
./systemd/deploy.sh

# 4. Запустить снова
./systemd/start-all.sh
```

## Быстрое обновление одного сервиса

Например, для admin-panel:

```bash
cd ~/Digital-Information-System-Microservices
git pull

# Пересобрать admin-panel
cd admin-panel
npm install
npm run build

# Скопировать в /opt
sudo rsync -av --exclude 'node_modules/.cache' /opt/smu-microservices/admin-panel/

# Перезапустить
./systemd/restart-service.sh admin-panel
```

## Настройка Nginx (рекомендуется)

Создайте конфигурацию Nginx для проксирования запросов:

```bash
sudo nano /etc/nginx/sites-available/smu
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # API Gateway
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Admin Panel
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активировать:

```bash
sudo ln -s /etc/nginx/sites-available/smu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Мониторинг

### Проверка работоспособности сервисов

```bash
# Auth Service
curl http://localhost:8001/health

# Content Service
curl http://localhost:8002/health

# API Gateway
curl http://localhost:3000/health

# Search Service
curl http://localhost:8003/health

# User Activity
curl http://localhost:8004/health

# Media Service
curl http://localhost:8005/health
```

## Удаление сервисов

```bash
# Остановить и отключить сервисы
sudo systemctl stop smu-*
sudo systemctl disable smu-*

# Удалить unit файлы
sudo rm /etc/systemd/system/smu-*.service

# Перезагрузить daemon
sudo systemctl daemon-reload

# Удалить файлы проекта (опционально)
sudo rm -rf /opt/smu-microservices
```

## Остановка Docker контейнеров

Если у вас запущены Docker контейнеры:

```bash
cd ~/Digital-Information-System-Microservices
docker-compose down
```

## Порты сервисов

- **3000** - API Gateway (фронтэнд обращается сюда)
- **3001** - Admin Panel
- **8001** - Auth Service
- **8002** - Content Service
- **8003** - Search Service
- **8004** - User Activity Service
- **8005** - Media Service
- **5432** - PostgreSQL (auth)
- **5433** - PostgreSQL (content) - если используете отдельный инстанс
- **27017** - MongoDB
- **6379** - Redis
- **9200** - Elasticsearch
- **5672** - RabbitMQ
- **15672** - RabbitMQ Management
- **9000** - MinIO API
- **9001** - MinIO Console

## Troubleshooting

### Сервис не запускается

```bash
# Проверить логи
sudo journalctl -u smu-auth -n 100

# Проверить конфигурацию
sudo systemctl status smu-auth

# Проверить права на файлы
ls -la /opt/smu-microservices/services/auth-service/
```

### Проблемы с базой данных

```bash
# Проверить PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -l

# Проверить MongoDB
sudo systemctl status mongod
mongosh --eval "db.adminCommand('ping')"

# Проверить Redis
redis-cli ping
```

### Высокое использование ресурсов

```bash
# Проверить использование CPU и памяти
systemctl status smu-*
top
htop
```
