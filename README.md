# Cisco CDR Reader (`CDRReader`)

Веб-приложение для парсинга, хранения и аналитики записей о вызовах **Cisco Unified Communications Manager (CUCM)** (CDR и CMR) с развёртыванием в Docker Compose.

## Возможности

- **Парсинг Cisco CUCM CDR и CMR**:
  - Поддержка CSV-файлов CUCM (включая 2-ю строку с типами данных `INTEGER`/`VARCHAR(...)`), файлов без расширения (`cdr_*` / `cmr_*`), а также архивов `.gz` и `.zip`.
  - Автоматическое декодирование 32-битных IP-адресов CUCM и Unix-таймстампов.
  - Расшифровка стандартных Q.850 и расширенных Cisco Cause Codes.
  - Дедупликация записей при повторном импорте (`record_hash`).
  - Привязка CMR-метрик качества речи (jitter, latency, packet loss, VQMetrics) к вызовам.
- **Способы загрузки данных**:
  - Ручная загрузка через веб-интерфейс (Drag & Drop).
  - Автоматический мониторинг директории `./data/cdr_inbox` (`watch-dir`) с переносом в `cdr_archive` / `cdr_error`.
  - Встроенный SFTP-приёмник (`atmoz/sftp`, порт `2222` по умолчанию) для прямой выгрузки из Cisco CUCM Billing Server.
  - Опциональный SFTP-клиент (`SFTP_POLLER_ENABLED=true`) для забора файлов с внешнего SFTP-сервера.
- **Веб-интерфейс**:
  - **Дашборд**: KPI, динамика звонков по дням/часам, распределение по причинам завершения, топ номеров и устройств/транков.
  - **Журнал звонков**: поиск и фильтрация, детальная карточка звонка с CMR-метриками, экспорт в **CSV** и **XLSX**.
  - **Импорт**: загрузка файлов и история задач импорта.

## Быстрый старт (Docker Compose)

1. Скопируйте `.env.example` в `.env` и при необходимости задайте пароли/порты:
   ```bash
   cp .env.example .env
   ```
2. Запустите сервисы (готовые образы автоматически скачаются из GitHub Container Registry, подходит для Portainer / Dockge / Arcane):
   ```bash
   docker compose up -d
   ```
   Если вы хотите собрать образы локально из исходников:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
   ```
3. Откройте веб-интерфейс: `http://localhost:8080` (или порт из `FRONTEND_PORT`).

## Настройка выгрузки в Cisco CUCM

1. В **Cisco Unified Serviceability** → **Tools** → **CDR Management** добавьте Billing Application Server:
   - **Host Name / IP**: IP-адрес сервера с Docker.
   - **User Name / Password**: значения `SFTP_SERVER_USER` и `SFTP_SERVER_PASSWORD` из `.env` (порт по умолчанию `2222` или проброшенный `22`).
   - **Directory Path**: `/cdr`.
2. Убедитесь, что в **CUCM Administration** → **System** → **Service Parameters** → **Cisco CallManager** включён параметр `CDR Enabled Flag = True` (и при необходимости `Call Diagnostics Enabled = True` для CMR).

## CI / Тестирование на GitHub

Workflow [ci.yml](.github/workflows/ci.yml) автоматически запускает при каждом `push` / `pull_request`:
- Миграции Alembic и `pytest` с тестовым контейнером PostgreSQL 16.
- Проверку типов TypeScript (`tsc --noEmit`) и сборку Vite (`npm run build`).
- Проверку сборки Docker-образов (`docker compose build`).
