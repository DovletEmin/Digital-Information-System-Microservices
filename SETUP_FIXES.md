# SMU Microservices - Setup & Fix Guide

## 🔧 Критические исправления

### 1. Установить Go зависимости (Auth & Media Service)

```powershell
# Auth Service
cd services/auth-service
go mod download
go mod tidy

# Media Service
cd ../media-service
go mod download
go mod tidy

cd ../..
```

### 2. Создать .env файл с безопасными секретами

```powershell
# Сгенерировать JWT секрет
$jwt_secret = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

# Скопировать .env.example и заменить секреты
copy .env.example .env
# Затем отредактировать .env и заменить все пароли
```

### 3. Добавить .env в .gitignore

```powershell
echo ".env" >> .gitignore
echo "node_modules" >> .gitignore
echo "__pycache__" >> .gitignore
echo "*.pyc" >> .gitignore
```

### 4. Запустить проект

```powershell
# Собрать и запустить все сервисы
docker-compose up -d --build

# Проверить статус
docker-compose ps

# Просмотреть логи
docker-compose logs -f
```

## 🧪 Рекомендации по тестированию

### Добавить тесты для Node.js сервисов

```powershell
cd services/api-gateway
npm install --save-dev jest supertest
npm install --save-dev @types/jest @types/supertest

cd ../user-activity
npm install --save-dev jest supertest
```

### Добавить тесты для Python сервисов

```powershell
cd services/content-service
pip install pytest pytest-asyncio httpx

cd ../search-service
pip install pytest pytest-asyncio httpx
```

### Добавить тесты для Go сервисов

```powershell
cd services/auth-service
go get -u github.com/stretchr/testify
```

## 🔒 Security Checklist

- [ ] Изменить все дефолтные пароли в .env
- [ ] Сгенерировать уникальный JWT_SECRET (минимум 256 бит)
- [ ] Добавить .env в .gitignore
- [ ] Включить HTTPS в production
- [ ] Настроить rate limiting (раскомментировать в API Gateway)
- [ ] Добавить input sanitization
- [ ] Настроить CORS для конкретных доменов (не \*)
- [ ] Включить Redis password
- [ ] Настроить MinIO access policies

## 📊 Мониторинг

### Проверка здоровья сервисов

```powershell
# API Gateway
curl http://localhost:8000/health

# Auth Service
curl http://localhost:8001/health

# Content Service
curl http://localhost:8002/health

# Search Service
curl http://localhost:8003/health

# User Activity
curl http://localhost:8004/health

# Media Service
curl http://localhost:8005/health
```

## 🐛 Известные проблемы

1. **Go зависимости** - Требуют установки через `go mod download`
2. **Rate limiting отключен** - Временно закомментирован, нужно включить для production
3. **TODO в Auth Service** - Logout не добавляет токены в blacklist
4. **Отсутствие тестов** - Критично для production

## 📈 Метрики для добавления

- Request/Response time
- Error rates
- Database connection pool status
- Cache hit ratio
- Service uptime
