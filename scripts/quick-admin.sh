#!/bin/bash
# Быстрое создание администратора
# Использование: ./scripts/quick-admin.sh

echo "🔧 Creating default admin user..."
echo ""

# Регистрация через API Gateway
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:3000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@smu.edu",
    "password": "Admin123!",
    "first_name": "Admin",
    "last_name": "User"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Admin user created successfully!"
elif [ "$HTTP_CODE" -eq 409 ]; then
  echo "ℹ️  Admin user already exists"
else
  echo "❌ Failed to create admin user (HTTP $HTTP_CODE)"
  echo ""
  echo "Response: $BODY"
  echo ""
  echo "🔍 Troubleshooting:"
  echo "   1. Make sure services are running: docker compose ps"
  echo "   2. Check API Gateway logs: docker compose logs api-gateway"
  echo "   3. Check Auth Service logs: docker compose logs auth-service"
  exit 1
fi

echo ""
echo "📝 Login credentials:"
echo "   URL:      http://localhost:3001/login"
echo "   Username: admin"
echo "   Password: Admin123!"
echo ""

# Test login
echo "🧪 Testing login..."
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin123!"
  }')

LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)

if [ "$LOGIN_CODE" -eq 200 ]; then
  echo "✅ Login test successful!"
  TOKEN=$(echo "$LOGIN_RESPONSE" | head -n-1 | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  echo "   Token: ${TOKEN:0:50}..."
else
  echo "⚠️  Login test failed"
  echo "   Please try logging in manually at http://localhost:3001/login"
fi

echo ""
echo "✨ Setup complete! Open http://localhost:3001/login in your browser"
