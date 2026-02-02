# User Activity Service (Node.js + Express + MongoDB)

Микросервис активности пользователей - закладки, рейтинги, просмотры.

## Технологии

- **Node.js 18**
- **Express** - веб-фреймворк
- **MongoDB** - NoSQL база данных
- **Mongoose** - ODM для MongoDB

## Функциональность

- ✅ Закладки (bookmarks)
- ✅ Рейтинги с комментариями (1-5 звезд)
- ✅ Отслеживание просмотров
- ✅ Статистика активности
- ✅ Топ контента
- ✅ История пользователя

## API Endpoints

### Закладки

```
GET    /api/v1/bookmarks                    - Список закладок пользователя
POST   /api/v1/bookmarks                    - Добавить закладку
GET    /api/v1/bookmarks/check/:type/:id   - Проверить наличие
DELETE /api/v1/bookmarks/:type/:id          - Удалить закладку
```

### Рейтинги

```
GET    /api/v1/ratings/:type/:id            - Рейтинги контента
POST   /api/v1/ratings                      - Добавить/обновить рейтинг
GET    /api/v1/ratings/my/:type/:id         - Мой рейтинг
DELETE /api/v1/ratings/:type/:id            - Удалить рейтинг
GET    /api/v1/ratings/stats/:type/:id      - Статистика рейтингов
```

### Просмотры

```
POST   /api/v1/views                        - Записать просмотр
GET    /api/v1/views/stats/:type/:id        - Статистика просмотров
GET    /api/v1/views/top/:type              - Топ просматриваемого
```

### Статистика

```
GET    /api/v1/user/stats                   - Статистика пользователя
```

## Примеры использования

### Добавить закладку

```bash
curl -X POST http://localhost:8004/api/v1/bookmarks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "article",
    "contentId": 123
  }'
```

### Поставить рейтинг

```bash
curl -X POST http://localhost:8004/api/v1/ratings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "book",
    "contentId": 456,
    "rating": 5,
    "comment": "Отличная книга!"
  }'
```

### Записать просмотр

```bash
curl -X POST http://localhost:8004/api/v1/views \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "article",
    "contentId": 123
  }'
```

### Получить статистику

```bash
# Статистика просмотров
curl http://localhost:8004/api/v1/views/stats/article/123

# Топ статей
curl http://localhost:8004/api/v1/views/top/article?limit=10

# Статистика рейтингов
curl http://localhost:8004/api/v1/ratings/stats/book/456
```

## Запуск

### С Docker

```bash
docker-compose up user-activity
```

### Локально

```bash
npm install
npm run dev
```

## Переменные окружения

```env
PORT=8004
NODE_ENV=development
MONGODB_URI=mongodb://mongo_user:mongo_pass@mongodb:27017/activity_db?authSource=admin
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq_user:rabbitmq_pass@rabbitmq:5672/
AUTH_SERVICE_URL=http://auth-service:8001
```

## Модели данных

### Bookmark

```javascript
{
  userId: Number,
  contentType: "article" | "book" | "dissertation",
  contentId: Number,
  createdAt: Date
}
```

### Rating

```javascript
{
  userId: Number,
  contentType: "article" | "book" | "dissertation",
  contentId: Number,
  rating: Number (1-5),
  comment: String,
  createdAt: Date,
  updatedAt: Date
}
```

### View

```javascript
{
  userId: Number | null,
  contentType: "article" | "book" | "dissertation",
  contentId: Number,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

## Особенности

- **Уникальные ограничения**: Пользователь не может добавить один контент в закладки дважды
- **Upsert для рейтингов**: При повторном рейтинге обновляется существующий
- **Анонимные просмотры**: Просмотры записываются даже без авторизации
- **Распределение рейтингов**: Статистика по всем 5 звездам

## Health Check

```bash
curl http://localhost:8004/health
```
