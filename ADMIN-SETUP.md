# 🔐 Admin Panel Setup Guide

## Проблема: "Login failed" в админ-панели

Если вы видите ошибку "Login failed" при попытке входа в админ-панель, это означает, что **в базе данных нет пользователя**.

## Быстрое решение

### Вариант 1: Автоматический скрипт (рекомендуется)

#### Windows (PowerShell)

```powershell
.\scripts\create-admin.ps1
```

#### Linux/Mac (Bash)

```bash
chmod +x scripts/create-admin.sh
./scripts/create-admin.sh
```

Скрипт создаст администратора со следующими данными:

- **Username:** `admin`
- **Email:** `admin@smu.edu`
- **Password:** `Admin123!`

### Вариант 2: Через API вручную (curl)

```bash
# Регистрация администратора
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@smu.edu",
    "password": "Admin123!",
    "first_name": "Admin",
    "last_name": "User"
  }'
```

### Вариант 3: Через Postman/Insomnia

**Endpoint:** `POST http://localhost:3000/api/v1/auth/register`

**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "username": "admin",
  "email": "admin@smu.edu",
  "password": "Admin123!",
  "first_name": "Admin",
  "last_name": "User"
}
```

## Проверка работы

После создания пользователя:

1. Откройте админ-панель: http://localhost:3001/login
2. Введите учетные данные:
   - Username: `admin`
   - Password: `Admin123!`
3. Нажмите "Login"

Если все настроено правильно, вы будете перенаправлены на дашборд.

## Устранение неполадок

### Ошибка: "Connection refused" или "Service unavailable"

**Причина:** Сервисы не запущены

**Решение:**

```bash
docker compose up -d
```

Подождите 30-60 секунд, пока все сервисы запустятся и станут доступны.

### Ошибка: "User already exists"

**Причина:** Пользователь уже создан

**Решение:** Просто используйте существующие учетные данные для входа.

### Ошибка: "Invalid credentials"

**Причина:** Неправильный username или password

**Решение:**

1. Убедитесь, что вводите правильные данные (с учетом регистра)
2. Или создайте нового пользователя с другим username

### Сервисы не отвечают

Проверьте статус сервисов:

```bash
docker compose ps
```

Проверьте логи:

```bash
# Gateway
docker compose logs api-gateway

# Auth Service
docker compose logs auth-service

# Admin Panel
docker compose logs admin-panel
```

## Архитектура логина

```
Browser → Admin Panel (localhost:3001)
           ↓
    API Gateway (localhost:3000)
           ↓
    Auth Service (auth-service:8001)
           ↓
    PostgreSQL (postgres-auth:5432)
```

**Важно:**

- Браузер обращается к `localhost:3000` (API Gateway)
- Внутри Docker контейнеры общаются через имена сервисов (например, `auth-service:8001`)

## Продакшн

⚠️ **Перед деплоем в продакшн:**

1. Измените пароль администратора на более сложный
2. Обновите `JWT_SECRET` в docker-compose.yml на случайную строку
3. Используйте переменные окружения вместо хардкода
4. Включите HTTPS

```bash
# Генерация случайного JWT secret
openssl rand -base64 32
```

## Тестирование API

### Проверка регистрации

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"Test123!"}'
```

### Проверка логина

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'
```

### Проверка профиля (с токеном)

```bash
# Сначала получите токен из ответа логина
TOKEN="your_access_token_here"

curl http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

## Дополнительная информация

- Auth Service API документация: [services/auth-service/README.md](services/auth-service/README.md)
- Admin Panel документация: [admin-panel/README.md](admin-panel/README.md)
- API Gateway документация: [services/api-gateway/README.md](services/api-gateway/README.md)
