# Docker Testing Quick Reference

## Запуск всех тестов в Docker

### PowerShell (Windows):

```powershell
.\scripts\test-docker.ps1
```

### Bash (Linux/Mac):

```bash
./scripts/test-docker.sh
```

### Makefile:

```bash
make -f Makefile.test test
```

## Тестирование отдельных сервисов

### Auth Service (Go):

```powershell
# PowerShell
.\scripts\test-docker.ps1 auth-service

# Makefile
make -f Makefile.test test-auth

# Напрямую через docker-compose
docker-compose -f docker-compose.test.yml run --rm test-auth-service
```

### Content Service (Python):

```powershell
.\scripts\test-docker.ps1 content-service
make -f Makefile.test test-content
docker-compose -f docker-compose.test.yml run --rm test-content-service
```

### API Gateway (Node.js):

```powershell
.\scripts\test-docker.ps1 api-gateway
make -f Makefile.test test-gateway
docker-compose -f docker-compose.test.yml run --rm test-api-gateway
```

### User Activity (Node.js):

```powershell
.\scripts\test-docker.ps1 user-activity
make -f Makefile.test test-activity
docker-compose -f docker-compose.test.yml run --rm test-user-activity
```

### Admin Panel (Next.js):

```powershell
.\scripts\test-docker.ps1 admin-panel
make -f Makefile.test test-admin
docker-compose -f docker-compose.test.yml run --rm test-admin-panel
```

## Интерактивная отладка

Зайти внутрь контейнера для ручного запуска команд:

```bash
# Auth Service (Go)
make -f Makefile.test test-interactive-auth
# Внутри: go test ./handlers -v

# Content Service (Python)
make -f Makefile.test test-interactive-content
# Внутри: pytest tests/test_articles.py -v

# API Gateway (Node)
make -f Makefile.test test-interactive-gateway
# Внутри: npm test tests/auth.test.js

# User Activity (Node)
make -f Makefile.test test-interactive-activity
# Внутри: npm test tests/bookmarks.test.js

# Admin Panel (Next.js)
make -f Makefile.test test-interactive-admin
# Внутри: npm test __tests__/login.test.tsx
```

## Coverage Reports

Получить отчет о покрытии:

```bash
# Auth Service
docker-compose -f docker-compose.test.yml run --rm test-auth-service \
  go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out

# Content Service
docker-compose -f docker-compose.test.yml run --rm test-content-service \
  pytest --cov=. --cov-report=html

# API Gateway
docker-compose -f docker-compose.test.yml run --rm test-api-gateway \
  npm test -- --coverage

# User Activity
docker-compose -f docker-compose.test.yml run --rm test-user-activity \
  npm test -- --coverage

# Admin Panel
docker-compose -f docker-compose.test.yml run --rm test-admin-panel \
  npm test -- --coverage
```

## Полный цикл CI/CD

```bash
# 1. Собрать тестовые образы
make -f Makefile.test build-test

# 2. Запустить все тесты
make -f Makefile.test test

# 3. Очистить контейнеры
make -f Makefile.test clean-test

# Или все вместе:
make -f Makefile.test build-test && \
make -f Makefile.test test && \
make -f Makefile.test clean-test
```

## Troubleshooting

### Контейнер не запускается:

```bash
# Проверить логи
docker-compose -f docker-compose.test.yml logs test-auth-service

# Пересобрать образ
docker-compose -f docker-compose.test.yml build --no-cache test-auth-service
```

### Тесты падают с timeout:

```bash
# Увеличить timeout в jest.config.js или pytest.ini
# Или запустить с флагом
docker-compose -f docker-compose.test.yml run --rm test-user-activity \
  npm test -- --testTimeout=60000
```

### Проблемы с зависимостями:

```bash
# Пересобрать все образы без кэша
docker-compose -f docker-compose.test.yml build --no-cache

# Очистить volumes
docker-compose -f docker-compose.test.yml down -v

# Удалить старые образы
docker image prune -a
```

## На сервере (Production)

```bash
# Клонировать репозиторий
git clone <repo-url>
cd SMU-Microservices

# Запустить тесты
./scripts/test-docker.sh

# Или через PowerShell на Windows Server
.\scripts\test-docker.ps1

# Результат: exit code 0 = все тесты прошли, 1 = есть ошибки
echo $?  # Linux/Mac
echo $LASTEXITCODE  # PowerShell
```
