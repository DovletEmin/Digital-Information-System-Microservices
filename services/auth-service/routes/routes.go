package routes

import (
	"auth-service/config"
	"auth-service/handlers"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB, cfg *config.Config) {
	// Создаем handler
	authHandler := handlers.NewAuthHandler(db, cfg)

	// API группа
	api := router.Group("/api/v1")
	{
		// Public маршруты
		api.POST("/register", authHandler.Register)
		api.POST("/login", authHandler.Login)
		api.POST("/refresh", authHandler.RefreshToken)

		// Protected маршруты
		protected := api.Group("/")
		protected.Use(authHandler.AuthMiddleware())
		{
			protected.GET("/me", authHandler.GetCurrentUser)
			protected.PUT("/me", authHandler.UpdateProfile)
			protected.POST("/logout", authHandler.Logout)
		}

		// Admin маршруты
		admin := api.Group("/admin")
		admin.Use(authHandler.AuthMiddleware(), authHandler.AdminMiddleware())
		{
			admin.GET("/users", authHandler.ListUsers)
			admin.GET("/users/:id", authHandler.GetUser)
			admin.PUT("/users/:id", authHandler.UpdateUser)
			admin.DELETE("/users/:id", authHandler.DeleteUser)
		}

		// Validation endpoint для других сервисов
		api.POST("/validate", authHandler.ValidateToken)
	}
}
