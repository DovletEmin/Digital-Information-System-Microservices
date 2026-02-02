#!/bin/bash

# SMU Admin User Creation Script

echo "=== SMU Admin User Creator ==="
echo ""

# Проверка, запущен ли auth-service
if ! docker ps | grep -q smu-auth-service; then
    echo "Error: auth-service is not running"
    echo "Please start it with: docker-compose up auth-service"
    exit 1
fi

# Ввод данных
read -p "Enter username: " USERNAME
read -p "Enter email: " EMAIL
read -p "Enter first name: " FIRSTNAME
read -p "Enter last name: " LASTNAME
read -sp "Enter password: " PASSWORD
echo ""

# Создание пользователя через API
RESPONSE=$(curl -s -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"first_name\": \"$FIRSTNAME\",
    \"last_name\": \"$LASTNAME\"
  }")

# Проверка ответа
if echo "$RESPONSE" | grep -q "error"; then
    echo "Error: $RESPONSE"
    exit 1
fi

# Получение ID пользователя
USER_ID=$(echo "$RESPONSE" | grep -o '"id":[0-9]*' | cut -d':' -f2)

# Обновление пользователя до админа через БД
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "UPDATE users SET is_staff = true WHERE id = $USER_ID;"

echo ""
echo "✓ Admin user created successfully!"
echo "  Username: $USERNAME"
echo "  Email: $EMAIL"
echo ""
echo "You can now login to the admin panel at http://localhost:3001"
