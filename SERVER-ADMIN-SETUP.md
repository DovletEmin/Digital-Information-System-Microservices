# 🚀 Создание администратора на сервере

## Быстрый старт (одна команда)

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@smu.edu",
    "password": "Admin123!",
    "first_name": "Admin",
    "last_name": "User"
  }' && echo -e "\n✅ Admin created! Login at http://YOUR_SERVER_IP:3001"
```

## Учетные данные

После выполнения команды используйте:

- **Username:** `admin`
- **Password:** `Admin123!`
- **URL:** `http://YOUR_SERVER_IP:3001/login`

## Проверка работы

### 1. Проверьте, что сервисы запущены

```bash
docker compose ps
```

Должны быть запущены:

- api-gateway (порт 3000)
- auth-service (порт 8001)
- admin-panel (порт 3001)
- postgres-auth

### 2. Проверьте логи, если есть проблемы

```bash
# Gateway
docker compose logs api-gateway --tail=50

# Auth Service
docker compose logs auth-service --tail=50

# Admin Panel
docker compose logs admin-panel --tail=50
```

### 3. Тест логина через API

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }'
```

Должен вернуть токен:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

## Если пользователь уже существует

Если видите ошибку `"error": "User already exists"`, значит админ уже создан. Просто используйте учетные данные выше для входа.

## Удаление пользователя (если нужно пересоздать)

```bash
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "DELETE FROM users WHERE username = 'admin';"
```

После этого снова выполните команду создания.

## Изменение пароля администратора

### Через API (требует токен)

```bash
# Сначала получите токен
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# Затем измените пароль
curl -X PUT http://localhost:3000/api/v1/auth/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "old_password": "Admin123!",
    "new_password": "NewSecurePassword123!"
  }'
```

### Через базу данных напрямую

```bash
# ВНИМАНИЕ: Это обходит хеширование. Используйте только в крайнем случае!
# Сгенерируйте bcrypt хеш пароля отдельно и вставьте его
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "UPDATE users SET password = 'your_bcrypt_hash_here' WHERE username = 'admin';"
```

## Создание дополнительных пользователей

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "editor",
    "email": "editor@smu.edu",
    "password": "Editor123!",
    "first_name": "Editor",
    "last_name": "User"
  }'
```

## Проверка портов

Убедитесь, что порты открыты:

```bash
# Проверка локально на сервере
curl -I http://localhost:3000/health
curl -I http://localhost:8001/health
curl -I http://localhost:3001

# Проверка извне (замените YOUR_SERVER_IP)
curl -I http://YOUR_SERVER_IP:3001
```

Если не отвечает извне, проверьте firewall:

```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 3001/tcp

# CentOS/RHEL
sudo firewall-cmd --list-all
sudo firewall-cmd --add-port=3001/tcp --permanent
sudo firewall-cmd --reload
```

## Использование скрипта

Если хотите использовать готовый скрипт:

```bash
# Сделать скрипт исполняемым
chmod +x scripts/quick-admin.sh

# Запустить
./scripts/quick-admin.sh
```

## Troubleshooting

### Ошибка: "Connection refused"

```bash
# Перезапустите сервисы
docker compose restart api-gateway auth-service admin-panel
```

### Ошибка: "Auth service unavailable"

```bash
# Проверьте, что auth-service запущен и здоров
docker compose ps auth-service
docker compose logs auth-service --tail=100
```

### Админка не открывается в браузере

```bash
# Проверьте логи admin-panel
docker compose logs admin-panel --tail=50

# Перезапустите админку
docker compose restart admin-panel
```

### База данных не инициализирована

```bash
# Пересоздайте базу
docker compose down postgres-auth
docker volume rm smu-microservices_postgres-auth-data
docker compose up -d postgres-auth
# Подождите 10 секунд
docker compose restart auth-service
```

## Полезные команды

```bash
# Список всех пользователей
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "SELECT id, username, email, is_staff, is_active FROM users;"

# Сделать пользователя администратором
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "UPDATE users SET is_staff = true WHERE username = 'admin';"

# Активировать/деактивировать пользователя
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "UPDATE users SET is_active = true WHERE username = 'admin';"
```
