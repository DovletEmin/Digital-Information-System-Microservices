package main

import (
	"auth-service/config"
	"auth-service/database"
	"auth-service/routes"
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func main() {
	// Загрузка конфигурации
	cfg := config.LoadConfig()

	// Подключение к БД
	db := database.Connect(cfg)
	database.AutoMigrate(db)

	// Настройка роутера
	router := gin.Default()

	corsOriginsEnv := os.Getenv("CORS_ORIGINS")
	allowAllOrigins := false
	allowedOrigins := map[string]bool{}

	if strings.TrimSpace(corsOriginsEnv) == "" || strings.TrimSpace(corsOriginsEnv) == "*" {
		allowAllOrigins = true
	} else {
		for _, origin := range strings.Split(corsOriginsEnv, ",") {
			trimmed := strings.TrimSpace(origin)
			if trimmed != "" {
				allowedOrigins[trimmed] = true
			}
		}
	}

	// CORS middleware
	router.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if allowAllOrigins {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin != "" && allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			if !allowAllOrigins && origin != "" && !allowedOrigins[origin] {
				c.AbortWithStatus(403)
				return
			}
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "auth-service"})
	})

	// Инициализация маршрутов
	routes.SetupRoutes(router, db, cfg)

	// Запуск сервера
	log.Printf("Auth Service starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
