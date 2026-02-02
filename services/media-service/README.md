# Media Service (Go + MinIO)

Микросервис для работы с медиа файлами - загрузка, хранение, скачивание.

## Технологии

- **Go 1.21**
- **Gin** - HTTP фреймворк
- **MinIO** - S3-совместимое объектное хранилище

## Функциональность

- ✅ Загрузка файлов (одиночная и множественная)
- ✅ Скачивание файлов
- ✅ Удаление файлов
- ✅ Список файлов
- ✅ Информация о файле
- ✅ Генерация уникальных имен
- ✅ Поддержка больших файлов
- ✅ Streaming файлов
- ✅ Превью изображений (базовая версия)

## API Endpoints

### Загрузка

```
POST   /api/v1/upload              - Загрузить один файл
POST   /api/v1/upload/multiple     - Загрузить несколько файлов
```

### Получение

```
GET    /api/v1/file/:filename      - Получить файл (stream)
GET    /api/v1/download/:filename  - Скачать файл (attachment)
GET    /api/v1/thumbnail/:filename - Превью изображения
```

### Управление

```
DELETE /api/v1/file/:filename      - Удалить файл
GET    /api/v1/files               - Список файлов
GET    /api/v1/info/:filename      - Информация о файле
```

## Примеры использования

### Загрузка файла

```bash
# Одиночный файл
curl -X POST http://localhost:8005/api/v1/upload \
  -F "file=@document.pdf"

# Множественная загрузка
curl -X POST http://localhost:8005/api/v1/upload/multiple \
  -F "files=@file1.pdf" \
  -F "files=@file2.jpg" \
  -F "files=@file3.docx"
```

### Скачивание файла

```bash
# Просмотр (stream)
curl http://localhost:8005/api/v1/file/<filename>

# Скачивание
curl -O http://localhost:8005/api/v1/download/<filename>
```

### Удаление файла

```bash
curl -X DELETE http://localhost:8005/api/v1/file/<filename>
```

### Список файлов

```bash
# Все файлы
curl http://localhost:8005/api/v1/files

# С префиксом (папка)
curl "http://localhost:8005/api/v1/files?prefix=books/"
```

### Информация о файле

```bash
curl http://localhost:8005/api/v1/info/<filename>
```

## Запуск

### С Docker

```bash
docker-compose up media-service
```

### Локально

```bash
go mod download
go run main.go
```

## Переменные окружения

```env
PORT=8005
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=smu-media
```

## Поддерживаемые форматы

### Документы

- PDF
- DOC, DOCX
- XLS, XLSX
- PPT, PPTX
- TXT

### Изображения

- JPG, JPEG
- PNG
- GIF
- BMP
- WEBP

### Другое

- ZIP, RAR
- MP3, MP4
- Любые другие форматы

## Ограничения

- **Максимальный размер файла**: 100 MB (настраивается)
- **Уникальные имена**: Автоматическая генерация UUID
- **Безопасность**: Валидация типов файлов

## Интеграция с Content Service

Content Service использует Media Service для хранения обложек книг и PDF файлов:

```go
// Загрузка обложки книги
file, _ := os.Open("book_cover.jpg")
resp := uploadToMediaService(file)
bookCoverURL := resp.URL

// Загрузка PDF книги
pdfFile, _ := os.Open("book.pdf")
resp := uploadToMediaService(pdfFile)
bookPDFURL := resp.URL
```

## MinIO Console

Доступ к веб-интерфейсу MinIO:

- URL: http://localhost:9001
- Login: minioadmin
- Password: minioadmin

## Структура хранения

```
smu-media/
├── books/
│   ├── covers/
│   └── pdfs/
├── articles/
│   └── images/
├── dissertations/
│   └── pdfs/
└── uploads/
```

## Health Check

```bash
curl http://localhost:8005/health
```

## Безопасность

В production рекомендуется:

1. Включить SSL/TLS (MINIO_USE_SSL=true)
2. Изменить ACCESS_KEY и SECRET_KEY
3. Добавить аутентификацию для загрузки
4. Ограничить размеры файлов
5. Валидировать MIME types
6. Сканировать файлы на вирусы
