#!/bin/bash

# SMU Admin User Creation Script

echo "=== SMU Admin User Creator ==="
echo ""

# Проверка, установлен ли jq
if ! command -v jq &> /dev/null; then
    echo "Installing jq for JSON parsing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y jq
    elif command -v yum &> /dev/null; then
        sudo yum install -y jq
    else
        echo "Please install jq manually: https://stedolan.github.io/jq/download/"
        exit 1
    fi
fi

# Проверка, запущен ли auth-service
if ! docker ps | grep -q smu-auth-service; then
    echo "Error: auth-service is not running"
    echo "Please start it with: docker-compose up -d auth-service"
    exit 1
fi

# Проверка доступности API
echo "Checking auth-service API..."
HEALTH_CHECK=$(curl -s http://localhost:8001/health 2>/dev/null)
if [ -z "$HEALTH_CHECK" ]; then
    echo "Error: Cannot connect to auth-service on port 8001"
    echo "Please check if auth-service is running and accessible"
    exit 1
fi
echo "✓ Auth-service is accessible"
echo ""

# Ввод данных
read -p "Enter username: " USERNAME
read -p "Enter email: " EMAIL
read -p "Enter first name: " FIRSTNAME
read -p "Enter last name: " LASTNAME
read -sp "Enter password: " PASSWORD
echo ""
echo ""

echo "Creating user via API..."

# Создание пользователя через API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8001/api/v1/register \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"first_name\": \"$FIRSTNAME\",
    \"last_name\": \"$LASTNAME\"
  }")

# Разделение тела ответа и HTTP кода
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: $HTTP_BODY"
echo ""

# Проверка HTTP кода
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    echo "Error: Failed to create user (HTTP $HTTP_CODE)"
    if echo "$HTTP_BODY" | jq -e '.error' > /dev/null 2>&1; then
        echo "Error message: $(echo "$HTTP_BODY" | jq -r '.error')"
    fi
    exit 1
fi

# Проверка ответа
if echo "$HTTP_BODY" | jq -e '.error' > /dev/null 2>&1; then
    echo "Error: $(echo "$HTTP_BODY" | jq -r '.error')"
    exit 1
fi

# Получение ID пользователя из JSON
USER_ID=$(echo "$HTTP_BODY" | jq -r '.user.id // .id // empty')

echo "User created with ID: $USER_ID"
echo ""

if [ -z "$USER_ID" ]; then
    echo "Warning: Could not extract user ID from response"
    echo "Trying to update by username..."
    RESULT=$(docker exec -i smu-postgres-auth psql -U auth_user -d auth_db -t -c \
      "UPDATE users SET is_staff = true WHERE username = '$USERNAME'; SELECT ROW_COUNT();" 2>&1)
    
    # Проверка результата обновления
    UPDATED=$(docker exec -i smu-postgres-auth psql -U auth_user -d auth_db -t -c \
      "SELECT COUNT(*) FROM users WHERE username = '$USERNAME' AND is_staff = true;")
    
    if [ "$(echo $UPDATED | tr -d ' ')" = "1" ]; then
        echo "✓ User updated to admin successfully!"
    else
        echo "Error: Failed to update user to admin"
        echo "User may not exist in database"
        exit 1
    fi
else
    # Обновление пользователя до админа через БД
    echo "Updating user to admin..."
    docker exec -i smu-postgres-auth psql -U auth_user -d auth_db -c \
      "UPDATE users SET is_staff = true WHERE id = $USER_ID;"
    
    # Проверка результата
    IS_ADMIN=$(docker exec -i smu-postgres-auth psql -U auth_user -d auth_db -t -c \
      "SELECT is_staff FROM users WHERE id = $USER_ID;")
    
    if [ "$(echo $IS_ADMIN | tr -d ' ')" = "t" ]; then
        echo "✓ User is now admin!"
    else
        echo "Error: Failed to set admin privileges"
        exit 1
    fi
fi

echo ""
echo "========================================="
echo "✓ Admin user created successfully!"
echo "========================================="
echo "  Username: $USERNAME"
echo "  Email: $EMAIL"
echo "  Is Admin: Yes"
echo ""
echo "You can now login to the admin panel at:"
echo "  http://localhost:3001"
echo ""
echo "To verify admin status, run:"
echo "  docker exec -i smu-postgres-auth psql -U auth_user -d auth_db -c \\"
echo "    \"SELECT id, username, email, is_staff FROM users WHERE username = '$USERNAME';\""
echo ""
