# Auth Service (Go)

Микросервис аутентификации и авторизации для SMU Digital Library.

## Технологии

- **Go 1.21**
- **Gin** - HTTP фреймворк
- **GORM** - ORM для PostgreSQL
- **JWT** - JSON Web Tokens
- **PostgreSQL** - База данных

## Функциональность

- ✅ Регистрация пользователей
- ✅ Аутентификация (login/logout)
- ✅ JWT токены (access + refresh)
- ✅ Валидация токенов для других сервисов
- ✅ Управление профилем
- ✅ Админ панель (CRUD пользователей)
- ✅ CORS поддержка
- ✅ Health checks

## API Endpoints

### Public

```
POST /api/v1/register      - Регистрация
POST /api/v1/login         - Вход
POST /api/v1/refresh       - Обновление токена
POST /api/v1/validate      - Валидация токена (для сервисов)
```

### Protected (требуется JWT)

```
GET  /api/v1/me            - Текущий пользователь
PUT  /api/v1/me            - Обновление профиля
POST /api/v1/logout        - Выход
```

### Admin (требуется admin права)

```
GET    /api/v1/admin/users     - Список пользователей
GET    /api/v1/admin/users/:id - Пользователь по ID
PUT    /api/v1/admin/users/:id - Обновление пользователя
DELETE /api/v1/admin/users/:id - Удаление пользователя
```

## Запуск

### С Docker

```bash
docker-compose up auth-service
```

### Локально

```bash
# Установка зависимостей
go mod download

# Запуск
go run main.go
```

## Переменные окружения

```env
PORT=8001
DB_HOST=localhost
DB_PORT=5432
DB_USER=auth_user
DB_PASSWORD=auth_pass
DB_NAME=auth_db
JWT_SECRET=your-secret-key
JWT_EXPIRATION=24h
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
```

## Примеры запросов

### Регистрация

```bash
curl -X POST http://localhost:8001/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

### Вход

```bash
curl -X POST http://localhost:8001/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "password123"
  }'
```

### Получение профиля

```bash
curl -X GET http://localhost:8001/api/v1/me \
  -H "Authorization: Bearer <your_token>"
```

## Структура

```
auth-service/
├── main.go              # Точка входа
├── config/
│   └── config.go        # Конфигурация
├── database/
│   └── database.go      # Подключение к БД
├── models/
│   └── user.go          # Модели данных
├── handlers/
│   └── auth.go          # HTTP handlers
├── routes/
│   └── routes.go        # Маршруты
├── utils/
│   └── jwt.go           # JWT утилиты
├── Dockerfile
├── go.mod
└── README.md
```

## Тестирование

```bash
go test ./...
```

## Health Check

```bash
curl http://localhost:8001/health
```
