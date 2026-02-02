package handlers

import (
	"context"
	"fmt"
	"io"
	"media-service/config"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
)

type MediaHandler struct {
	minioClient *minio.Client
	config      *config.Config
}

func NewMediaHandler(client *minio.Client, cfg *config.Config) *MediaHandler {
	return &MediaHandler{
		minioClient: client,
		config:      cfg,
	}
}

// UploadFile - загрузка одного файла
func (h *MediaHandler) UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Проверка размера файла
	if file.Size > h.config.MaxFileSize {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("File too large. Max size: %d MB", h.config.MaxFileSize/(1024*1024)),
		})
		return
	}

	// Генерация уникального имени файла
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// Открываем файл
	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open file"})
		return
	}
	defer src.Close()

	// Определяем Content-Type
	contentType := file.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Загружаем в MinIO
	ctx := context.Background()
	_, err = h.minioClient.PutObject(
		ctx,
		h.config.MinioBucket,
		filename,
		src,
		file.Size,
		minio.PutObjectOptions{ContentType: contentType},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	// Генерируем URL для доступа
	fileURL := fmt.Sprintf("http://%s/%s/%s", h.config.MinioEndpoint, h.config.MinioBucket, filename)

	c.JSON(http.StatusOK, gin.H{
		"message":       "File uploaded successfully",
		"filename":      filename,
		"original_name": file.Filename,
		"size":          file.Size,
		"url":           fileURL,
	})
}

// UploadMultipleFiles - загрузка нескольких файлов
func (h *MediaHandler) UploadMultipleFiles(c *gin.Context) {
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid multipart form"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files provided"})
		return
	}

	var results []gin.H
	ctx := context.Background()

	for _, file := range files {
		// Проверка размера
		if file.Size > h.config.MaxFileSize {
			results = append(results, gin.H{
				"filename": file.Filename,
				"success":  false,
				"error":    "File too large",
			})
			continue
		}

		// Генерация имени
		ext := filepath.Ext(file.Filename)
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

		// Открываем и загружаем
		src, err := file.Open()
		if err != nil {
			results = append(results, gin.H{
				"filename": file.Filename,
				"success":  false,
				"error":    "Failed to open file",
			})
			continue
		}

		contentType := file.Header.Get("Content-Type")
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		_, err = h.minioClient.PutObject(
			ctx,
			h.config.MinioBucket,
			filename,
			src,
			file.Size,
			minio.PutObjectOptions{ContentType: contentType},
		)
		src.Close()

		if err != nil {
			results = append(results, gin.H{
				"filename": file.Filename,
				"success":  false,
				"error":    "Failed to upload",
			})
			continue
		}

		fileURL := fmt.Sprintf("http://%s/%s/%s", h.config.MinioEndpoint, h.config.MinioBucket, filename)

		results = append(results, gin.H{
			"filename":      filename,
			"original_name": file.Filename,
			"size":          file.Size,
			"url":           fileURL,
			"success":       true,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Upload completed",
		"files":   results,
	})
}

// GetFile - получение файла (stream)
func (h *MediaHandler) GetFile(c *gin.Context) {
	filename := c.Param("filename")
	ctx := context.Background()

	object, err := h.minioClient.GetObject(ctx, h.config.MinioBucket, filename, minio.GetObjectOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}
	defer object.Close()

	stat, err := object.Stat()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.Header("Content-Type", stat.ContentType)
	c.Header("Content-Length", fmt.Sprintf("%d", stat.Size))

	io.Copy(c.Writer, object)
}

// DownloadFile - скачивание файла (с attachment)
func (h *MediaHandler) DownloadFile(c *gin.Context) {
	filename := c.Param("filename")
	ctx := context.Background()

	object, err := h.minioClient.GetObject(ctx, h.config.MinioBucket, filename, minio.GetObjectOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}
	defer object.Close()

	stat, err := object.Stat()
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", stat.ContentType)
	c.Header("Content-Length", fmt.Sprintf("%d", stat.Size))

	io.Copy(c.Writer, object)
}

// DeleteFile - удаление файла
func (h *MediaHandler) DeleteFile(c *gin.Context) {
	filename := c.Param("filename")
	ctx := context.Background()

	err := h.minioClient.RemoveObject(ctx, h.config.MinioBucket, filename, minio.RemoveObjectOptions{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

// ListFiles - список файлов
func (h *MediaHandler) ListFiles(c *gin.Context) {
	prefix := c.Query("prefix")
	ctx := context.Background()

	objectCh := h.minioClient.ListObjects(ctx, h.config.MinioBucket, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})

	var files []gin.H
	for object := range objectCh {
		if object.Err != nil {
			continue
		}

		files = append(files, gin.H{
			"name":          object.Key,
			"size":          object.Size,
			"last_modified": object.LastModified,
			"content_type":  object.ContentType,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"count": len(files),
	})
}

// GetFileInfo - информация о файле
func (h *MediaHandler) GetFileInfo(c *gin.Context) {
	filename := c.Param("filename")
	ctx := context.Background()

	stat, err := h.minioClient.StatObject(ctx, h.config.MinioBucket, filename, minio.StatObjectOptions{})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	fileURL := fmt.Sprintf("http://%s/%s/%s", h.config.MinioEndpoint, h.config.MinioBucket, filename)

	c.JSON(http.StatusOK, gin.H{
		"name":          stat.Key,
		"size":          stat.Size,
		"content_type":  stat.ContentType,
		"last_modified": stat.LastModified,
		"etag":          stat.ETag,
		"url":           fileURL,
	})
}

// GetThumbnail - получение превью изображения (упрощенная версия)
func (h *MediaHandler) GetThumbnail(c *gin.Context) {
	filename := c.Param("filename")

	// Проверяем, является ли файл изображением
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is not an image"})
		return
	}

	// Для упрощения, просто возвращаем оригинальное изображение
	// В production здесь должна быть генерация thumbnail
	h.GetFile(c)
}

// GeneratePresignedURL - генерация временной ссылки на файл
func (h *MediaHandler) GeneratePresignedURL(c *gin.Context) {
	filename := c.Param("filename")
	expiryStr := c.DefaultQuery("expiry", "3600") // по умолчанию 1 час

	var expiry time.Duration
	fmt.Sscanf(expiryStr, "%d", &expiry)
	expiry = expiry * time.Second

	ctx := context.Background()
	presignedURL, err := h.minioClient.PresignedGetObject(ctx, h.config.MinioBucket, filename, expiry, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":     presignedURL.String(),
		"expires": time.Now().Add(expiry).Unix(),
	})
}
