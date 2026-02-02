# SMU Library Microservices - Quick Start 🚀

## Предварительные требования

- Docker Desktop установлен и запущен
- 8GB RAM минимум
- 20GB свободного места на диске

## Быстрый старт (5 минут)

### 1. Перейти в папку проекта

```powershell
cd SMU-Microservices
```

### 2. Скопировать конфигурацию

```powershell
copy .env.example .env
```

### 3. Запустить все сервисы

```powershell
docker-compose up -d
```

Это запустит:

- ✅ PostgreSQL (Auth DB)
- ✅ PostgreSQL (Content DB)
- ✅ MongoDB (Activity DB)
- ✅ Elasticsearch (Search)
- ✅ Redis (Cache)
- ✅ RabbitMQ (Message Broker)
- ✅ MinIO (File Storage)
- ✅ API Gateway (Node.js)
- ✅ Auth Service (Go)
- ✅ Content Service (Python)
- ✅ Search Service (Python)
- ✅ User Activity Service (Node.js)
- ✅ Media Service (Go)

### 4. Проверить статус сервисов

```powershell
docker-compose ps
```

Все сервисы должны быть в статусе "Up" (healthy).

### 5. Проверить работоспособность

```powershell
# API Gateway
curl http://localhost:8000/health

# Auth Service
curl http://localhost:8001/health

# Content Service
curl http://localhost:8002/health
```

### 6. Тестовый запрос - регистрация пользователя

```powershell
curl -X POST http://localhost:8000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{
    "username": "testuser",
    "email": "test@smu.edu.tm",
    "password": "password123",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### 7. Вход

```powershell
curl -X POST http://localhost:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

Скопируйте `access_token` из ответа.

### 8. Создать статью (с токеном)

```powershell
$token = "ваш_токен_здесь"

curl -X POST http://localhost:8000/api/v1/content/articles `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $token" `
  -d '{
    "title": "Искусственный интеллект в образовании",
    "author": "Иванов И.И.",
    "content": "Полный текст статьи...",
    "abstract": "Краткое описание",
    "keywords": "AI, образование, машинное обучение",
    "language": "ru"
  }'
```

## 📊 Доступ к сервисам

| Сервис               | URL                        | Описание                 |
| -------------------- | -------------------------- | ------------------------ |
| **API Gateway**      | http://localhost:8000      | Главная точка входа      |
| **Auth Service**     | http://localhost:8001      | Аутентификация           |
| **Content Service**  | http://localhost:8002/docs | CRUD контента + Swagger  |
| **Search Service**   | http://localhost:8003/docs | Поиск + Swagger          |
| **Activity Service** | http://localhost:8004      | Активность пользователей |
| **Media Service**    | http://localhost:8005      | Файлы и медиа            |
| **RabbitMQ UI**      | http://localhost:15672     | guest / guest            |
| **MinIO Console**    | http://localhost:9001      | minioadmin / minioadmin  |

## 🔥 Полезные команды

### Просмотр логов

```powershell
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f auth-service
docker-compose logs -f content-service
docker-compose logs -f api-gateway
```

### Перезапуск сервиса

```powershell
docker-compose restart auth-service
```

### Остановка всех сервисов

```powershell
docker-compose down
```

### Остановка + удаление данных

```powershell
docker-compose down -v
```

### Пересборка после изменений

```powershell
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Порт уже занят

```powershell
# Проверить занятые порты
netstat -ano | findstr :8000
netstat -ano | findstr :5432

# Изменить порты в docker-compose.yml или остановить конфликтующий процесс
```

### Сервис не запускается

```powershell
# Проверить логи
docker-compose logs service-name

# Проверить здоровье
docker-compose ps

# Пересоздать контейнер
docker-compose up -d --force-recreate service-name
```

### База данных не готова

```powershell
# Дождаться инициализации (30-60 секунд)
docker-compose logs postgres-auth
docker-compose logs postgres-content

# Перезапустить зависимые сервисы
docker-compose restart auth-service content-service
```

### Очистить все и начать заново

```powershell
docker-compose down -v --remove-orphans
docker system prune -a
docker-compose up -d --build
```

## 📚 Следующие шаги

1. **Изучите API документацию**
   - Content Service: http://localhost:8002/docs
   - Search Service: http://localhost:8003/docs

2. **Протестируйте все endpoints**
   - Используйте Postman или curl
   - Примеры в файлах API_EXAMPLES.md каждого сервиса

3. **Настройте production окружение**
   - Измените пароли и секреты в .env
   - Настройте HTTPS
   - Добавьте мониторинг

4. **Разверните на сервере**
   - См. DEPLOYMENT.md

## 🎯 Архитектура

```
Клиент → API Gateway → [Auth, Content, Search, Activity, Media]
                  ↓
        [PostgreSQL, MongoDB, Elasticsearch, Redis, RabbitMQ, MinIO]
```

## 💡 Советы

- **Разработка**: Используйте `docker-compose logs -f` для отладки
- **Production**: Настройте reverse proxy (Nginx) перед API Gateway
- **Масштабирование**: Добавьте реплики через `docker-compose scale`
- **Мониторинг**: Интегрируйте Prometheus + Grafana

## 🆘 Помощь

Если возникли проблемы:

1. Проверьте логи сервисов
2. Убедитесь что все порты свободны
3. Проверьте Docker Desktop (должен быть запущен)
4. Перезапустите проблемный сервис

**Готово! Ваша микросервисная архитектура запущена! 🎉**
