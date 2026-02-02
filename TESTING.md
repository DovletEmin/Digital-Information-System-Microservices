# Тестирование SMU Microservices

## Обзор

Проект включает комплексное тестовое покрытие для всех микросервисов.

## 🐳 Быстрый старт с Docker

### Запуск всех тестов в Docker:

```powershell
# PowerShell
.\scripts\test-docker.ps1

# Или через Makefile
make -f Makefile.test test
```

### Запуск тестов отдельного сервиса:

```powershell
# PowerShell
.\scripts\test-docker.ps1 auth-service

# Makefile
make -f Makefile.test test-auth
make -f Makefile.test test-content
make -f Makefile.test test-gateway
make -f Makefile.test test-activity
make -f Makefile.test test-admin
```

### Интерактивная отладка:

```bash
# Зайти в контейнер для отладки
make -f Makefile.test test-interactive-auth

# Или через docker-compose напрямую
docker-compose -f docker-compose.test.yml run --rm test-auth-service sh
```

## Структура тестов

### 1. Auth Service (Go)

**Расположение**: `services/auth-service/handlers/*_test.go`, `services/auth-service/utils/*_test.go`

**Запуск**:

```bash
cd services/auth-service
go test ./... -v
go test ./... -cover
```

**Покрытие**:

- Unit тесты для JWT генерации и валидации
- Unit тесты для хеширования паролей
- Integration тесты для регистрации, логина и аутентификации
- Тесты middleware

### 2. Content Service (Python/FastAPI)

**Расположение**: `services/content-service/tests/`

**Установка зависимостей**:

```bash
cd services/content-service
pip install -r requirements-test.txt
```

**Запуск**:

```bash
pytest
pytest --cov=. --cov-report=html
```

**Покрытие**:

- CRUD операции для Articles, Books, Dissertations
- Category management (простые и иерархические)
- Фильтрация и поиск
- Валидация данных

### 3. API Gateway (Node.js/Express)

**Расположение**: `services/api-gateway/tests/`

**Установка зависимостей**:

```bash
cd services/api-gateway
npm install
```

**Запуск**:

```bash
npm test
npm test -- --coverage
```

**Покрытие**:

- Auth middleware тесты
- Rate limiting
- Proxy routing
- Logging

### 4. User Activity Service (Node.js/MongoDB)

**Расположение**: `services/user-activity/tests/`

**Установка зависимостей**:

```bash
cd services/user-activity
npm install
```

**Запуск**:

```bash
npm test
npm test -- --coverage
```

**Покрытие**:

- Bookmarks CRUD
- Ratings с расчетом среднего
- Views tracking
- MongoDB operations

### 5. Admin Panel (Next.js/React)

**Расположение**: `admin-panel/__tests__/`

**Установка зависимостей**:

```bash
cd admin-panel
npm install
```

**Запуск**:

```bash
npm test
npm test -- --coverage
```

**Покрытие**:

- Login страница и форма
- API service methods
- Component rendering
- User interactions

## 🐳 Docker Testing

### Преимущества тестирования в Docker:

- ✅ Идентичная среда с продакшеном
- ✅ Изоляция тестов
- ✅ Не требует локальной установки зависимостей
- ✅ Воспроизводимые результаты

### Файлы для Docker тестирования:

- `docker-compose.test.yml` - orchestration всех тестовых контейнеров
- `services/*/Dockerfile.test` - тестовые образы для каждого сервиса
- `scripts/test-docker.ps1` - PowerShell скрипт для запуска
- `Makefile.test` - Make команды для тестирования

### Примеры команд:

```powershell
# Запустить все тесты
.\scripts\test-docker.ps1

# Тест конкретного сервиса
.\scripts\test-docker.ps1 auth-service

# Или через Makefile
make -f Makefile.test test-auth      # Auth Service
make -f Makefile.test test-content   # Content Service
make -f Makefile.test test-gateway   # API Gateway
make -f Makefile.test test-activity  # User Activity
make -f Makefile.test test-admin     # Admin Panel

# Собрать тестовые образы заранее
make -f Makefile.test build-test

# Интерактивный режим для отладки
make -f Makefile.test test-interactive-auth
```

### Через docker-compose напрямую:

```bash
# Запустить все тесты последовательно
docker-compose -f docker-compose.test.yml up --build

# Запустить один сервис
docker-compose -f docker-compose.test.yml run --rm test-auth-service

# С выводом покрытия
docker-compose -f docker-compose.test.yml run --rm test-content-service pytest --cov=. --cov-report=term-missing

# Очистить контейнеры
docker-compose -f docker-compose.test.yml down -v
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  auth-service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: "1.21"
      - name: Run tests
        run: |
          cd services/auth-service
          go test ./... -v

  content-service:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - name: Run tests
        run: |
          cd services/content-service
          pip install -r requirements.txt -r requirements-test.txt
          pytest

  api-gateway:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Run tests
        run: |
          cd services/api-gateway
          npm install
          npm test

  user-activity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Run tests
        run: |
          cd services/user-activity
          npm install
          npm test

  admin-panel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - name: Run tests
        run: |
          cd admin-panel
          npm install
          npm test
```

## Docker Testing

Запуск тестов в Docker окружении:

```bash
# Auth Service
docker run --rm -v $(pwd)/services/auth-service:/app -w /app golang:1.21 go test ./... -v

# Content Service
docker run --rm -v $(pwd)/services/content-service:/app -w /app python:3.11 bash -c "pip install -r requirements.txt -r requirements-test.txt && pytest"

# API Gateway
docker run --rm -v $(pwd)/services/api-gateway:/app -w /app node:18 bash -c "npm install && npm test"

# User Activity
docker run --rm -v $(pwd)/services/user-activity:/app -w /app node:18 bash -c "npm install && npm test"
```

## E2E Testing

### Запуск всего стека для E2E тестов:

```bash
# Поднять все сервисы
docker-compose up -d

# Дождаться готовности всех сервисов
sleep 30

# Запустить E2E тесты (будут добавлены позже)
# npm run test:e2e
```

## Code Coverage Goals

- **Auth Service**: > 80%
- **Content Service**: > 80%
- **API Gateway**: > 70%
- **User Activity**: > 80%
- **Admin Panel**: > 70%

## Лучшие практики

1. **Изоляция тестов**: Каждый тест должен быть независимым
2. **Тестовые данные**: Используйте фикстуры и моки
3. **Чистка**: Очищайте тестовую БД после каждого теста
4. **Именование**: Используйте описательные имена тестов
5. **Скорость**: Юнит тесты должны выполняться быстро

## Troubleshooting

### Go тесты падают

```bash
# Проверьте зависимости
go mod tidy
go mod download
```

### Python тесты не находят модули

```bash
# Установите проект в режиме разработки
pip install -e .
```

### Node.js тесты timeout

```bash
# Увеличьте timeout в jest.config.js
testTimeout: 30000
```

### MongoDB Memory Server ошибки

```bash
# Установите бинарник вручную
npm install mongodb-memory-server --save-dev --ignore-scripts=false
```
