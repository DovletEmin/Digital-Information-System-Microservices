# SMU Digital Library - Microservices Architecture 🚀

Микросервисная архитектура цифровой библиотеки

## 📐 Архитектура

```
                                ┌─────────────────┐
                                │  API Gateway    │
                                │   (Node.js)     │
                                └────────┬────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        │                                │                                │
┌───────▼────────┐            ┌──────────▼──────────┐         ┌──────────▼──────────┐
│  Auth Service  │            │  Content Service    │         │  Search Service     │
│     (Go)       │            │  (Python FastAPI)   │         │  (Python FastAPI)   │
│   Port: 8001   │            │    Port: 8002       │         │    Port: 8003       │
└───────┬────────┘            └──────────┬──────────┘         └──────────┬──────────┘
        │                                │                                │
        │                                │                                │
┌───────▼────────┐            ┌──────────▼──────────┐         ┌──────────▼──────────┐
│  PostgreSQL    │            │    PostgreSQL       │         │   Elasticsearch     │
│   (auth_db)    │            │   (content_db)      │         │                     │
└────────────────┘            └─────────────────────┘         └─────────────────────┘

┌────────────────┐            ┌─────────────────────┐         ┌─────────────────────┐
│ User Activity  │            │   Media Service     │         │   Message Broker    │
│   (Node.js)    │            │       (Go)          │         │   (RabbitMQ)        │
│   Port: 8004   │            │    Port: 8005       │         │   Port: 5672        │
└───────┬────────┘            └──────────┬──────────┘         └─────────────────────┘
        │                                │
┌───────▼────────┐            ┌──────────▼──────────┐         ┌─────────────────────┐
│   MongoDB      │            │      MinIO          │         │       Redis         │
│  (activity_db) │            │   (Object Storage)  │         │   (Cache/Session)   │
└────────────────┘            └─────────────────────┘         └─────────────────────┘
```

## 🎯 Микросервисы

### 1. **API Gateway** (Node.js + Express)

- Единая точка входа для всех клиентов
- Маршрутизация запросов к микросервисам
- Rate limiting и throttling
- JWT валидация
- Агрегация данных
- **Port**: 8000

### 2. **Auth Service** (Go + Gin)

- Регистрация пользователей
- Аутентификация (login/logout)
- JWT токены (issue, refresh, validate)
- Управление пользователями
- **Port**: 8001
- **DB**: PostgreSQL

### 3. **Content Service** (Python + FastAPI)

- CRUD для статей, книг, диссертаций
- Управление категориями
- Метаданные контента
- Версионирование
- **Port**: 8002
- **DB**: PostgreSQL

### 4. **Search Service** (Python + FastAPI)

- Полнотекстовый поиск
- Индексация контента в Elasticsearch
- Fuzzy search, highlights
- Фильтрация и сортировка
- Автодополнение
- **Port**: 8003
- **DB**: Elasticsearch

### 5. **User Activity Service** (Node.js + Express)

- Закладки (bookmarks)
- Рейтинги и отзывы
- Просмотры контента
- История активности
- **Port**: 8004
- **DB**: MongoDB

### 6. **Media Service** (Go + Gin)

- Загрузка файлов (PDF, изображения)
- Обработка медиа
- Генерация превью
- CDN интеграция
- **Port**: 8005
- **Storage**: MinIO (S3-compatible)

## 🚀 Быстрый старт

### Требования

- Docker & Docker Compose
- 8GB RAM минимум
- 20GB свободного места

### Запуск всех сервисов

```bash
# 1. Клонировать проект
cd SMU-Microservices

# 2. Настроить переменные окружения
cp .env.example .env

# 3. Запустить все сервисы
docker-compose up -d

# 4. Проверить статус
docker-compose ps

# 5. Просмотр логов
docker-compose logs -f

# 6. Остановка
docker-compose down
```

### Доступ к сервисам

- **API Gateway**: http://localhost:8000
- **Auth Service**: http://localhost:8001
- **Content Service**: http://localhost:8002
- **Search Service**: http://localhost:8003
- **User Activity**: http://localhost:8004
- **Media Service**: http://localhost:8005
- **RabbitMQ UI**: http://localhost:15672 (guest/guest)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Elasticsearch**: http://localhost:9200

## 📁 Структура проекта

```
SMU-Microservices/
├── services/
│   ├── api-gateway/          # Node.js + Express
│   ├── auth-service/         # Go + Gin
│   ├── content-service/      # Python + FastAPI
│   ├── search-service/       # Python + FastAPI
│   ├── user-activity/        # Node.js + Express + MongoDB
│   └── media-service/        # Go + Gin + MinIO
├── infrastructure/
│   ├── rabbitmq/            # Message broker
│   ├── elasticsearch/       # Search engine
│   ├── postgres/            # Databases init scripts
│   └── monitoring/          # Prometheus + Grafana
├── docker-compose.yml       # Все сервисы
├── docker-compose.dev.yml   # Development
├── docker-compose.prod.yml  # Production
└── README.md
```

## 🔧 Разработка отдельного сервиса

### Auth Service (Go)

```bash
cd services/auth-service
go mod download
go run main.go
```

### Content Service (Python)

```bash
cd services/content-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

### User Activity (Node.js)

```bash
cd services/user-activity
npm install
npm run dev
```

## 🔄 Коммуникация между сервисами

### Синхронная (REST)

- HTTP/REST API для прямых запросов
- gRPC для внутренней коммуникации (опционально)

### Асинхронная (Events)

- RabbitMQ для событий:
  - `content.created` → индексация в Search Service
  - `user.registered` → создание профиля
  - `rating.added` → обновление статистики

## 📊 Мониторинг

### Логи

```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f auth-service
```

### Health Checks

Каждый сервис предоставляет health endpoint:

- `GET /health` - проверка состояния
- `GET /ready` - готовность к работе

## 🔐 Безопасность

- JWT токены для аутентификации
- HTTPS в production
- Rate limiting на API Gateway
- CORS настройки
- SQL injection protection
- Environment variables для секретов

## 🧪 Тестирование

```bash
# Unit тесты
cd services/auth-service && go test ./...
cd services/content-service && pytest
cd services/user-activity && npm test

# Integration тесты
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 📚 API Документация

Каждый сервис имеет свою документацию:

- Auth: http://localhost:8001/docs
- Content: http://localhost:8002/docs
- Search: http://localhost:8003/docs
- User Activity: http://localhost:8004/docs
- Media: http://localhost:8005/docs

## 🎯 Roadmap

- [x] Базовая архитектура
- [x] Auth Service
- [x] Content Service
- [x] Search Service
- [x] User Activity Service
- [x] Media Service
- [x] API Gateway
- [ ] Service Mesh (Istio)
- [ ] Distributed Tracing (Jaeger)
- [ ] Centralized Logging (ELK)
- [ ] Monitoring (Prometheus + Grafana)
- [ ] CI/CD Pipeline
- [ ] Kubernetes deployment

## 👥 Технологический стек

| Сервис        | Язык    | Framework | БД            | Порт |
| ------------- | ------- | --------- | ------------- | ---- |
| API Gateway   | Node.js | Express   | Redis         | 8000 |
| Auth          | Go      | Gin       | PostgreSQL    | 8001 |
| Content       | Python  | FastAPI   | PostgreSQL    | 8002 |
| Search        | Python  | FastAPI   | Elasticsearch | 8003 |
| User Activity | Node.js | Express   | MongoDB       | 8004 |
| Media         | Go      | Gin       | MinIO         | 8005 |

## 📝 Лицензия

MIT License
