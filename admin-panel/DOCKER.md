# SMU Admin Panel - Docker Setup

Containerized Next.js admin panel for SMU Microservices.

## 🐳 Quick Start with Docker

### Using Docker Compose (Recommended)

```bash
# From the root directory
docker-compose up admin-panel

# Or build and start all services
docker-compose up --build
```

The admin panel will be available at **http://localhost:3001**

### Manual Docker Build

```bash
cd admin-panel

# Build the image
docker build -t smu-admin-panel .

# Run the container
docker run -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3000 \
  -e API_GATEWAY_URL=http://localhost:3000 \
  smu-admin-panel
```

## 🔧 Configuration

### Environment Variables

| Variable              | Description                   | Default                   |
| --------------------- | ----------------------------- | ------------------------- |
| `NEXT_PUBLIC_API_URL` | API Gateway URL (client-side) | `http://api-gateway:3000` |
| `API_GATEWAY_URL`     | API Gateway URL (server-side) | `http://api-gateway:3000` |
| `NODE_ENV`            | Environment mode              | `production`              |
| `PORT`                | Application port              | `3001`                    |

### Docker Compose Configuration

In `docker-compose.yml`:

```yaml
admin-panel:
  build:
    context: ./admin-panel
    dockerfile: Dockerfile
  container_name: smu-admin-panel
  ports:
    - "3001:3001"
  environment:
    - NODE_ENV=production
    - NEXT_PUBLIC_API_URL=http://api-gateway:3000
    - API_GATEWAY_URL=http://api-gateway:3000
  depends_on:
    - api-gateway
  networks:
    - smu-network
  restart: unless-stopped
```

## 📦 Docker Image Details

### Multi-stage Build

The Dockerfile uses a multi-stage build for optimization:

1. **deps**: Install dependencies
2. **builder**: Build the Next.js application
3. **runner**: Minimal runtime image (~100MB)

### Image Size

- Base image: `node:18-alpine`
- Final size: ~150MB (optimized)
- Standalone output for minimal footprint

## 🚀 Development vs Production

### Development (Local)

```bash
npm install
npm run dev
```

Runs on `http://localhost:3001`

### Production (Docker)

```bash
docker-compose up admin-panel
```

Runs on `http://localhost:3001`

## 🔍 Troubleshooting

### Cannot connect to API Gateway

Make sure:

1. API Gateway is running
2. Services are on the same Docker network
3. Environment variables are correct

```bash
# Check if API Gateway is accessible
docker exec smu-admin-panel curl http://api-gateway:3000/health
```

### Port already in use

```bash
# Stop existing container
docker stop smu-admin-panel
docker rm smu-admin-panel

# Or change port in docker-compose.yml
ports:
  - "3002:3001"
```

### Rebuild after code changes

```bash
# Rebuild the image
docker-compose build admin-panel

# Start with new image
docker-compose up -d admin-panel
```

## 📊 Container Management

### View logs

```bash
docker logs smu-admin-panel -f
```

### Restart container

```bash
docker restart smu-admin-panel
```

### Stop container

```bash
docker stop smu-admin-panel
```

### Remove container

```bash
docker rm smu-admin-panel
```

## 🔐 Security Notes

- Admin panel runs as non-root user (nextjs:1001)
- No sensitive data in image layers
- Environment variables for configuration
- Health checks can be added if needed

## 📝 Notes

- First build may take 2-5 minutes
- Subsequent builds are faster (cached layers)
- Hot reload not available in production mode
- Use development mode for active development

## 🌐 Network Architecture

```
Browser → localhost:3001 (admin-panel)
             ↓
       smu-network (Docker)
             ↓
       api-gateway:3000
             ↓
    [auth, content, media, user-activity services]
```

## 🛠️ Advanced Usage

### Custom network

```bash
docker network create smu-custom-network

docker run -p 3001:3001 \
  --network smu-custom-network \
  --name admin-panel \
  smu-admin-panel
```

### Volume mounting for development

```bash
docker run -p 3001:3001 \
  -v $(pwd)/src:/app/src \
  -e NODE_ENV=development \
  smu-admin-panel
```

## 📚 Resources

- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Alpine Images](https://hub.docker.com/_/node)
