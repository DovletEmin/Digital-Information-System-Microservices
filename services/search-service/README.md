# Search Service (Python + FastAPI + Elasticsearch)

Микросервис полнотекстового поиска для SMU Digital Library.

## Технологии

- **Python 3.11**
- **FastAPI** - веб-фреймворк
- **Elasticsearch 8.11** - поисковый движок

## Функциональность

- ✅ Полнотекстовый поиск по статьям, книгам, диссертациям
- ✅ Fuzzy matching (нечеткий поиск)
- ✅ Подсветка результатов (highlights)
- ✅ Фильтрация по типу контента и языку
- ✅ Автодополнение (suggestions)
- ✅ Пагинация результатов
- ✅ Индексация контента
- ✅ Переиндексация

## API Endpoints

### Search

```
GET /api/v1/search
  ?q=<query>              - Поисковый запрос (обязательно)
  &content_type=article   - Тип: article, book, dissertation
  &language=tm            - Язык: tm, ru, en
  &page=1                 - Страница
  &per_page=20            - Элементов на странице
```

### Autocomplete

```
GET /api/v1/suggest?q=<partial_query>
```

### Indexing (для Content Service)

```
POST   /api/v1/index/{type}/{id}     - Индексация документа
PUT    /api/v1/index/{type}/{id}     - Обновление индекса
DELETE /api/v1/index/{type}/{id}     - Удаление из индекса
POST   /api/v1/reindex                - Переиндексация всего
```

## Примеры использования

### Поиск

```bash
# Поиск по всему контенту
curl "http://localhost:8003/api/v1/search?q=машинное+обучение"

# Поиск только статей на русском
curl "http://localhost:8003/api/v1/search?q=AI&content_type=article&language=ru"

# Автодополнение
curl "http://localhost:8003/api/v1/suggest?q=искусств"
```

### Индексация (для Content Service)

```bash
curl -X POST http://localhost:8003/api/v1/index/article/123 \
  -H "Content-Type: application/json" \
  -d '{
    "id": 123,
    "title": "Заголовок статьи",
    "author": "Автор И.И.",
    "content": "Полный текст статьи...",
    "abstract": "Аннотация",
    "keywords": "ключевые слова",
    "language": "ru",
    "created_at": "2026-02-02T10:00:00Z"
  }'
```

## Запуск

### С Docker

```bash
docker-compose up search-service
```

### Локально

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8003
```

## Документация API

После запуска:

- Swagger UI: http://localhost:8003/docs
- ReDoc: http://localhost:8003/redoc

## Переменные окружения

```env
PORT=8003
ELASTICSEARCH_URL=http://elasticsearch:9200
```

## Поисковые возможности

### Fuzzy Search

Поиск с опечатками:

- `mashine learning` найдет `machine learning`
- `algoritm` найдет `algorithm`

### Highlighting

Подсветка найденных фрагментов в результатах:

```json
{
  "highlights": {
    "content": ["...текст с <em>найденным</em> словом..."]
  }
}
```

### Relevance Scoring

Приоритеты полей:

- **title** (x3) - наивысший приоритет
- **abstract** (x2) - высокий приоритет
- **author** (x2) - высокий приоритет
- **keywords** (x2) - высокий приоритет
- **content** (x1) - базовый приоритет

## Интеграция с Content Service

Content Service должен отправлять события индексации:

```python
# При создании контента
requests.post(f"http://search-service:8003/api/v1/index/article/{article.id}",
              json=article_data)

# При обновлении
requests.put(f"http://search-service:8003/api/v1/index/article/{article.id}",
             json=article_data)

# При удалении
requests.delete(f"http://search-service:8003/api/v1/index/article/{article.id}")
```

## Health Check

```bash
curl http://localhost:8003/health
```
