package config

import (
	"log"
	"os"
)

type Config struct {
	Port          string
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	JWTSecret     string
	JWTExpiration string
	RedisURL      string
	RabbitMQURL   string
}

func LoadConfig() *Config {
	cfg := &Config{
		Port:          getEnv("PORT", "8001"),
		DBHost:        getEnv("DB_HOST", "localhost"),
		DBPort:        getEnv("DB_PORT", "5432"),
		DBUser:        getEnv("DB_USER", "auth_user"),
		DBPassword:    getEnv("DB_PASSWORD", "auth_pass"),
		DBName:        getEnv("DB_NAME", "auth_db"),
		JWTSecret:     getEnv("JWT_SECRET", "your-secret-key"),
		JWTExpiration: getEnv("JWT_EXPIRATION", "24h"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		RabbitMQURL:   getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
	}

	log.Println("Configuration loaded successfully")
	return cfg
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
