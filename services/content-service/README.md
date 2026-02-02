# Content Service (Python + FastAPI)

Микросервис управления контентом - статьи, книги, диссертации.

## Технологии

- **Python 3.11**
- **FastAPI** - веб-фреймворк
- **SQLAlchemy** - ORM
- **PostgreSQL** - база данных
- **Pydantic** - валидация данных

## Функциональность

- ✅ CRUD для статей, книг, диссертаций
- ✅ Управление категориями
- ✅ Пагинация и фильтрация
- ✅ Поиск по контенту
- ✅ Счетчики просмотров
- ✅ Рейтинги и статистика
- ✅ Многоязычность (tm, ru, en)
- ✅ Интеграция с Auth Service
- ✅ Автоматическая документация API

## API Endpoints

### Articles

```
GET    /api/v1/articles          - Список статей
GET    /api/v1/articles/{id}     - Статья по ID
POST   /api/v1/articles          - Создание статьи
PUT    /api/v1/articles/{id}     - Обновление статьи
DELETE /api/v1/articles/{id}     - Удаление статьи
```

### Books

```
GET    /api/v1/books             - Список книг
GET    /api/v1/books/{id}        - Книга по ID
POST   /api/v1/books             - Создание книги
PUT    /api/v1/books/{id}        - Обновление книги
DELETE /api/v1/books/{id}        - Удаление книги
```

### Dissertations

```
GET    /api/v1/dissertations     - Список диссертаций
GET    /api/v1/dissertations/{id}- Диссертация по ID
POST   /api/v1/dissertations     - Создание диссертации
PUT    /api/v1/dissertations/{id}- Обновление диссертации
DELETE /api/v1/dissertations/{id}- Удаление диссертации
```

### Categories

```
GET  /api/v1/categories/articles      - Категории статей
POST /api/v1/categories/articles      - Создать категорию
GET  /api/v1/categories/books         - Категории книг
POST /api/v1/categories/books         - Создать категорию
GET  /api/v1/categories/dissertations - Категории диссертаций
POST /api/v1/categories/dissertations - Создать категорию
```

## Запуск

### С Docker

```bash
docker-compose up content-service
```

### Локально

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

## Документация API

После запуска доступна по адресам:

- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

## Переменные окружения

```env
PORT=8002
DATABASE_URL=postgresql://content_user:content_pass@postgres-content:5432/content_db
REDIS_URL=redis://redis:6379
RABBITMQ_URL=amqp://rabbitmq_user:rabbitmq_pass@rabbitmq:5672/
AUTH_SERVICE_URL=http://auth-service:8001
```
