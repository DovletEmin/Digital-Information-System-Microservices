# Makefile для SMU Microservices

.PHONY: help build up down logs restart clean ps

help: ## Показать помощь
	@echo "SMU Digital Library - Microservices"
	@echo ""
	@echo "Доступные команды:"
	@echo "  make build     - Собрать все сервисы"
	@echo "  make up        - Запустить все сервисы"
	@echo "  make down      - Остановить все сервисы"
	@echo "  make restart   - Перезапустить все сервисы"
	@echo "  make logs      - Показать логи всех сервисов"
	@echo "  make ps        - Статус сервисов"
	@echo "  make clean     - Удалить все контейнеры и данные"
	@echo ""

build: ## Собрать все Docker образы
	docker-compose build

up: ## Запустить все сервисы
	docker-compose up -d
	@echo "✅ Все сервисы запущены!"
	@echo ""
	@echo "API Gateway: http://localhost:8000"
	@echo "Auth Service: http://localhost:8001"
	@echo "Content Service: http://localhost:8002"
	@echo ""

down: ## Остановить все сервисы
	docker-compose down

restart: ## Перезапустить все сервисы
	docker-compose restart

logs: ## Показать логи
	docker-compose logs -f

ps: ## Статус сервисов
	docker-compose ps

clean: ## Удалить все (контейнеры + volumes)
	docker-compose down -v --remove-orphans
	docker system prune -f

test: ## Тест health endpoints
	@echo "Testing services..."
	@curl -s http://localhost:8000/health || echo "❌ API Gateway down"
	@curl -s http://localhost:8001/health || echo "❌ Auth Service down"
	@curl -s http://localhost:8002/health || echo "❌ Content Service down"
	@echo "✅ Tests complete"
