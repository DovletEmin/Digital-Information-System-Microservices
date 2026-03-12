package handlers

import (
	"bytes"
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

// allowedMIMETypes is the whitelist of accepted MIME types.
var allowedMIMETypes = map[string]bool{
	"image/jpeg":               true,
	"image/png":                true,
	"image/webp":               true,
	"image/gif":                true,
	"application/pdf":          true,
	"application/epub+zip":     true,
}

// detectMIME reads the first 512 bytes to determine the real MIME type.
// It returns the MIME type string and a new reader starting from the beginning.
func detectMIME(src io.Reader) (string, io.Reader, error) {
	buf := make([]byte, 512)
	n, err := io.ReadAtLeast(src, buf, 1)
	if err != nil && err != io.ErrUnexpectedEOF {
		return "", nil, err
	}
	buf = buf[:n]
	mimeType := http.DetectContentType(buf)
	// Strip parameters like "; charset=utf-8"
	if idx := strings.Index(mimeType, ";"); idx != -1 {
		mimeType = strings.TrimSpace(mimeType[:idx])
	}
	// Combine the already-read bytes with the rest of the stream
	combined := io.MultiReader(bytes.NewReader(buf), src)
	return mimeType, combined, nil
}

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

	// Detect and validate actual MIME type (prevents extension spoofing)
	detectedMIME, combinedReader, err := detectMIME(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file content"})
		return
	}
	if !allowedMIMETypes[detectedMIME] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("File type '%s' is not allowed. Accepted types: JPEG, PNG, WebP, GIF, PDF, EPUB.", detectedMIME),
		})
		return
	}

	// Определяем Content-Type
	contentType := detectedMIME

	// Загружаем в MinIO
	ctx := context.Background()
	_, err = h.minioClient.PutObject(
		ctx,
		h.config.MinioBucket,
		filename,
		combinedReader,
		file.Size,
		minio.PutObjectOptions{ContentType: contentType},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	// Генерируем URL для доступа (используем публичный URL)
	fileURL := fmt.Sprintf("%s/%s/%s", h.config.MinioPublicURL, h.config.MinioBucket, filename)

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

		// Detect real MIME type and validate
		detectedMIME, combinedSrc, mimeErr := detectMIME(src)
		src.Close()
		if mimeErr != nil {
			results = append(results, gin.H{"filename": file.Filename, "success": false, "error": "Failed to read file"})
			continue
		}
		if !allowedMIMETypes[detectedMIME] {
			results = append(results, gin.H{
				"filename": file.Filename,
				"success":  false,
				"error":    fmt.Sprintf("File type '%s' not allowed", detectedMIME),
			})
			continue
		}
		contentType = detectedMIME

		_, err = h.minioClient.PutObject(
			ctx,
			h.config.MinioBucket,
			filename,
			combinedSrc,
			file.Size,
			minio.PutObjectOptions{ContentType: contentType},
		)

		if err != nil {
			results = append(results, gin.H{
				"filename": file.Filename,
				"success":  false,
				"error":    "Failed to upload",
			})
			continue
		}

		fileURL := fmt.Sprintf("%s/%s/%s", h.config.MinioPublicURL, h.config.MinioBucket, filename)

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
