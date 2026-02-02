# Быстрый старт тестирования на сервере Linux

## 1. Простейший способ - через скрипт:

```bash
# Дать права на выполнение
chmod +x scripts/test-docker.sh

# Запустить все тесты
./scripts/test-docker.sh

# Или один сервис
./scripts/test-docker.sh auth-service
```

## 2. Через docker-compose напрямую:

### ⚠️ Правильный синтаксис:

```bash
docker-compose -f docker-compose.test.yml КОМАНДА СЕРВИС
#               ^^  обязательный флаг!
```

### Пошаговая инструкция:

```bash
# Шаг 1: Собрать тестовые образы
docker-compose -f docker-compose.test.yml build

# Шаг 2: Запустить тесты для конкретного сервиса
docker-compose -f docker-compose.test.yml run --rm test-auth-service

# Шаг 3: Очистить контейнеры
docker-compose -f docker-compose.test.yml down
```

## 3. Примеры для всех сервисов:

### Auth Service (Go):

```bash
docker-compose -f docker-compose.test.yml build test-auth-service
docker-compose -f docker-compose.test.yml run --rm test-auth-service
```

### Content Service (Python):

```bash
docker-compose -f docker-compose.test.yml build test-content-service
docker-compose -f docker-compose.test.yml run --rm test-content-service
```

### API Gateway (Node.js):

```bash
docker-compose -f docker-compose.test.yml build test-api-gateway
docker-compose -f docker-compose.test.yml run --rm test-api-gateway
```

### User Activity (Node.js):

```bash
docker-compose -f docker-compose.test.yml build test-user-activity
docker-compose -f docker-compose.test.yml run --rm test-user-activity
```

### Admin Panel (Next.js):

```bash
docker-compose -f docker-compose.test.yml build test-admin-panel
docker-compose -f docker-compose.test.yml run --rm test-admin-panel
```

## 4. Если у вас Docker Compose V2:

Можете использовать без дефиса:

```bash
docker compose -f docker-compose.test.yml build test-auth-service
docker compose -f docker-compose.test.yml run --rm test-auth-service
```

Проверить версию:

```bash
docker-compose --version
# или
docker compose version
```

## 5. Одной командой - все тесты:

```bash
# Вариант 1: Через скрипт (рекомендуется)
./scripts/test-docker.sh

# Вариант 2: Последовательно запустить все
for service in auth-service content-service api-gateway user-activity admin-panel; do
  echo "Testing $service..."
  docker-compose -f docker-compose.test.yml run --rm "test-$service"
done

# Очистить после тестов
docker-compose -f docker-compose.test.yml down -v
```

## 6. Отладка:

### Зайти внутрь контейнера:

```bash
# Auth Service (shell)
docker-compose -f docker-compose.test.yml run --rm test-auth-service sh

# Content Service (bash)
docker-compose -f docker-compose.test.yml run --rm test-content-service bash

# Внутри можно запускать команды вручную:
go test ./... -v           # Go
pytest -v                  # Python
npm test                   # Node.js
```

### Посмотреть логи:

```bash
docker-compose -f docker-compose.test.yml logs test-auth-service
```

### Пересобрать без кэша:

```bash
docker-compose -f docker-compose.test.yml build --no-cache test-auth-service
```

## 7. Проверка coverage:

```bash
# Go (Auth Service)
docker-compose -f docker-compose.test.yml run --rm test-auth-service \
  go test ./... -cover -coverprofile=coverage.out

# Python (Content Service)
docker-compose -f docker-compose.test.yml run --rm test-content-service \
  pytest --cov=. --cov-report=term-missing

# Node.js (API Gateway)
docker-compose -f docker-compose.test.yml run --rm test-api-gateway \
  npm test -- --coverage
```

## 8. Troubleshooting:

### Ошибка "command not found":

```bash
# Проблема: docker-compose.test.yml build
# Решение: добавить флаг -f
docker-compose -f docker-compose.test.yml build
```

### Ошибка "Cannot connect to Docker daemon":

```bash
# Проверить Docker
sudo systemctl status docker
sudo systemctl start docker

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

### Порты заняты:

```bash
# Остановить основные контейнеры
docker-compose down

# Запустить тесты
./scripts/test-docker.sh
```

### Медленная сборка:

```bash
# Собрать образы заранее
docker-compose -f docker-compose.test.yml build

# Потом быстро запускать тесты
docker-compose -f docker-compose.test.yml run --rm test-auth-service
```

## 9. CI/CD на сервере:

```bash
#!/bin/bash
# deploy-and-test.sh

set -e

echo "Pulling latest code..."
git pull origin main

echo "Building test images..."
docker-compose -f docker-compose.test.yml build

echo "Running tests..."
./scripts/test-docker.sh

if [ $? -eq 0 ]; then
  echo "✅ All tests passed! Deploying..."
  docker-compose up -d --build
  echo "✅ Deployment complete!"
else
  echo "❌ Tests failed! Aborting deployment."
  exit 1
fi
```

Запустить:

```bash
chmod +x deploy-and-test.sh
./deploy-and-test.sh
```
