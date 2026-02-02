package main

import (
	"log"
	"media-service/config"
	"media-service/handlers"
	"media-service/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	// Загрузка конфигурации
	cfg := config.LoadConfig()

	// Инициализация MinIO
	minioClient, err := storage.InitMinIO(cfg)
	if err != nil {
		log.Fatal("Failed to initialize MinIO:", err)
	}

	// Создание bucket если не существует
	if err := storage.EnsureBucket(minioClient, cfg.MinioBucket); err != nil {
		log.Fatal("Failed to ensure bucket:", err)
	}

	// Настройка роутера
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "media-service"})
	})

	// Создаем handler
	mediaHandler := handlers.NewMediaHandler(minioClient, cfg)

	// API маршруты
	api := router.Group("/api/v1")
	{
		// Загрузка файлов
		api.POST("/upload", mediaHandler.UploadFile)
		api.POST("/upload/multiple", mediaHandler.UploadMultipleFiles)

		// Скачивание файлов
		api.GET("/file/:filename", mediaHandler.GetFile)
		api.GET("/download/:filename", mediaHandler.DownloadFile)

		// Удаление файлов
		api.DELETE("/file/:filename", mediaHandler.DeleteFile)

		// Список файлов
		api.GET("/files", mediaHandler.ListFiles)

		// Информация о файле
		api.GET("/info/:filename", mediaHandler.GetFileInfo)

		// Генерация превью (для изображений)
		api.GET("/thumbnail/:filename", mediaHandler.GetThumbnail)
	}

	// Запуск сервера
	log.Printf("Media Service starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
