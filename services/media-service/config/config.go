package config

import (
	"log"
	"os"
)

type Config struct {
	Port           string
	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioUseSSL    bool
	MinioBucket    string
	MaxFileSize    int64 // в байтах
}

func LoadConfig() *Config {
	cfg := &Config{
		Port:           getEnv("PORT", "8005"),
		MinioEndpoint:  getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey: getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey: getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioUseSSL:    getEnv("MINIO_USE_SSL", "false") == "true",
		MinioBucket:    getEnv("MINIO_BUCKET", "smu-media"),
		MaxFileSize:    100 * 1024 * 1024, // 100MB
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
