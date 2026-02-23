# ---------- Build stage ----------
FROM golang:1.23-alpine AS builder

WORKDIR /app

# 🔥 важно для нестабильных сетей
ENV GOPROXY=https://goproxy.io,direct
ENV GOSUMDB=off

# ✅ сначала только модули (кешируется!)
COPY go.mod go.sum ./

RUN go mod download

# ✅ теперь остальной код
COPY . .

RUN go mod tidy

# Build binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o auth-service .

# ---------- Runtime stage ----------
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /app/auth-service .

EXPOSE 8001

CMD ["./auth-service"]
