# Локальный запуск проекта SMU-Microservices

Короткая инструкция для быстрой локальной разработки и тестирования на Windows.

1. Требования

- Docker Desktop (с включённым WSL2) — рекомендуется для запуска всех сервисов через docker-compose.
- Node.js 16+ и npm или pnpm — для запуска фронтенда и админ-панели.
- (Опционально) Git, PowerShell с правами на выполнение скриптов.

2. Быстрый запуск (рекомендуется) — запустить всё через docker-compose

- Откройте терминал в корне репозитория и выполните:

```powershell
docker-compose up --build
```

- После этого сервисы будут доступны по портам, описанным в `docker-compose.yml` (обычно фронтенд на 3002, media-service на 9000 и т.д.).

3. Режим разработки (локально, для правок фронтенда)

- Откройте новый терминал и запустите фронтенд:

```powershell
cd frontend
npm install
npm run dev
```

- Для админ-панели:

```powershell
cd admin-panel
npm install
npm run dev
```

- Если вы хотите запускать отдельные бекенд-сервисы локально, в папках `services/<service-name>` проверьте `package.json` и используйте `npm install` + `npm run dev` (если присутствует).

4. Запуск с помощью готовых PowerShell-скриптов

- В корне есть скрипты `run-api-gateway.ps1`, `run-auth-service.ps1`, `run-content-service.ps1` и т.д. Их можно использовать для удобного старта отдельных сервисов:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\\run-api-gateway.ps1
```

5. Инструкция по проблемам с встраиванием (CSP/iframe)

- Если при открытии PDF или страницы вы видите в консоли ошибки типа:
  - "Refused to frame 'http://192.168.x.x:9000/' because an ancestor violates the following Content Security Policy directive: \"frame-ancestors 'self'\"."
  - или предупреждения `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy` — это заголовки, которые сервер media-service присылает, и браузер блокирует фрейминг из другого origin.

- Варианты решения:
  - Открывать PDF в новой вкладке (прямой URL) вместо iframe.
  - Настроить прокси на фронтенде: отдать файл с того же origin (вытянуть/передать через фронтенд), тогда ограничение `frame-ancestors` не сработает.
  - Изменить заголовок `Content-Security-Policy` на стороне `media-service`, добавить ваш фронтенд- origin (только в dev): `frame-ancestors 'self' http://192.168.55.154:3002`.
  - Для корректной работы COOP/COEP используйте HTTPS или `localhost` в разработке — многие современные политики работают только в "trustworthy" контексте.

6. Дополнительно

- Файлы и скрипты для запуска находятся в корне: `docker-compose.yml`, а также набор `run-*.ps1`.
- Если хотите, могу:
  - добавить скрипт `run-local.ps1`, который поднимает набор сервисов для разработки;
  - реализовать прокси-роуту в фронтенде для отдачи PDF с того же origin;
  - показать пример изменения заголовков Nginx/Express для `media-service`.

Если нужно — сделаю один из пунктов прямо сейчас.
