# Creating Admin User for SMU Admin Panel

There are multiple ways to create an admin user for the SMU Admin Panel.

## Method 1: Using PowerShell Script (Windows)

```powershell
cd scripts
.\create-admin.ps1
```

Follow the prompts to enter:

- Username
- Email
- First name
- Last name
- Password

## Method 2: Using Bash Script (Linux/Mac)

```bash
cd scripts
chmod +x create-admin.sh
./create-admin.sh
```

## Method 3: Manual via API + Database

### Step 1: Register user via API

```bash
curl -X POST http://localhost:8001/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "first_name": "Admin",
    "last_name": "User"
  }'
```

### Step 2: Make user admin via database

```bash
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db
```

Then run:

```sql
UPDATE users SET is_staff = true WHERE username = 'admin';
\q
```

## Method 4: Using Go CLI Tool

```bash
cd services/auth-service
go run cmd/create-admin/main.go
```

## Method 5: Direct Database Insert

Connect to database:

```bash
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db
```

Insert admin user (replace password hash):

```sql
-- First, hash your password using bcrypt (use online tool or Go/Python)
-- Example with password "admin123"

INSERT INTO users (username, email, password, first_name, last_name, is_active, is_staff, created_at, updated_at)
VALUES (
  'admin',
  'admin@example.com',
  '$2a$10$YourBcryptHashHere', -- Replace with actual bcrypt hash
  'Admin',
  'User',
  true,
  true,
  NOW(),
  NOW()
);
```

## Default Credentials (if you used Method 1 or 2)

After running the script, you can login with the credentials you provided.

## Testing Login

Once created, test login at:

- **Admin Panel**: http://localhost:3001
- **API Endpoint**: http://localhost:8001/api/v1/login

Example login request:

```bash
curl -X POST http://localhost:8001/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

## Troubleshooting

### Error: User already exists

```bash
# Delete existing user
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "DELETE FROM users WHERE username = 'admin';"
```

### Error: auth-service not running

```bash
# Start auth-service
docker-compose up -d auth-service

# Check status
docker-compose ps auth-service
```

### Error: Cannot connect to database

```bash
# Restart database
docker-compose restart postgres-auth

# Check logs
docker logs smu-postgres-auth
```

## Security Notes

- Change default credentials immediately in production
- Use strong passwords (minimum 8 characters)
- Enable 2FA if available
- Limit admin access to trusted IPs
- Regularly audit admin accounts

## Checking Admin Status

To verify if a user is admin:

```bash
docker exec -it smu-postgres-auth psql -U auth_user -d auth_db -c \
  "SELECT id, username, email, is_staff FROM users WHERE username = 'admin';"
```

Should return `is_staff = t` (true) for admin users.
