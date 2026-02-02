# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copy source code
COPY . .

# Download dependencies and generate go.sum
RUN go mod download && go mod tidy

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o auth-service .

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary
COPY --from=builder /app/auth-service .

EXPOSE 8001

CMD ["./auth-service"]
