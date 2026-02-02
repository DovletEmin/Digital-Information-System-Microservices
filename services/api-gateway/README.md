# API Gateway (Node.js + Express)

Единая точка входа для всех микросервисов SMU Digital Library.

## Функциональность

- ✅ Маршрутизация запросов к микросервисам
- ✅ JWT валидация через Auth Service
- ✅ Rate limiting (защита от DDoS)
- ✅ CORS поддержка
- ✅ Логирование запросов
- ✅ Агрегация данных из нескольких сервисов
- ✅ Health checks
- ✅ Error handling

## Маршруты

```
/api/v1/auth/*     -> Auth Service     (8001)
/api/v1/content/*  -> Content Service  (8002)
/api/v1/search/*   -> Search Service   (8003)
/api/v1/activity/* -> Activity Service (8004) [protected]
/api/v1/media/*    -> Media Service    (8005)
```

## Запуск

### С Docker

```bash
docker-compose up api-gateway
```

### Локально

```bash
npm install
npm run dev
```

## Переменные окружения

```env
PORT=8000
NODE_ENV=development
AUTH_SERVICE_URL=http://auth-service:8001
CONTENT_SERVICE_URL=http://content-service:8002
SEARCH_SERVICE_URL=http://search-service:8003
USER_ACTIVITY_SERVICE_URL=http://user-activity:8004
MEDIA_SERVICE_URL=http://media-service:8005
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret
```

## Примеры

### Регистрация через Gateway

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user",
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Получение контента

```bash
curl http://localhost:8000/api/v1/content/articles
```

### Поиск

```bash
curl "http://localhost:8000/api/v1/search?q=machine+learning"
```

## Rate Limiting

- **Лимит**: 100 запросов за 15 минут на IP
- **Ответ при превышении**: 429 Too Many Requests

## Логирование

Логи сохраняются в:

- `logs/combined.log` - все запросы
- `logs/error.log` - только ошибки
