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
  - Встроенный **FTP-сервер** (`FTP_SERVER_ENABLED=true`, порт `21` и passive порты `21100-21110`) — прямо в контейнере backend для прямого приёма выгрузок из Cisco CUCM Billing Server без настройки сторонних служб на хосте.
  - Ручная загрузка через веб-интерфейс (Drag & Drop, CSV, .gz, .zip).
  - Автоматический мониторинг директории `./data/cdr_inbox` (`watch-dir`) с переносом в `cdr_archive` / `cdr_error` — удобно при использовании системного SFTP-сервера (порт `22`) на хосте.
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

## Настройка выгрузки из Cisco CUCM по протоколу FTP (встроенный FTP-сервер)

CDRReader содержит встроенный FTP-сервер на порту `21`, запущенный прямо в контейнере `backend`:

1. В `.env` задайте логин и пароль для приёма файлов (или используйте значения по умолчанию):
   ```bash
   FTP_SERVER_ENABLED=true
   FTP_PORT=21
   FTP_SERVER_USER=cucm_ftp
   FTP_SERVER_PASSWORD=cucm_secret_change_me
   # Если сервер за NAT / внешним IP, укажите его для пассивного режима:
   FTP_SERVER_MASQUERADE_ADDRESS=
   ```
2. В интерфейсе **Cisco Unified Serviceability** → **Tools** → **CDR Management**:
   - Нажмите **Add Application Billing Server**.
   - **Host Name / IP Address**: IP-адрес хоста с CDRReader.
   - **User Name**: `cucm_ftp` (из `FTP_SERVER_USER`).
   - **Password**: `cucm_secret_change_me` (из `FTP_SERVER_PASSWORD`).
   - **Protocol**: выберите **FTP**.
   - **Directory Path**: `/` (или `/cdr`).
   - Нажмите **Add**. CUCM автоматически проверит подключение и начнёт отправлять файлы выгрузок в CDRReader.
3. Убедитесь, что в **CUCM Administration** → **System** → **Service Parameters** → **Cisco CallManager** включены параметры:
   - `CDR Enabled Flag = True`
   - `Call Diagnostics Enabled = True` (для метрик CMR).

## Настройка выгрузки в Cisco CUCM через системный SFTP (порт 22)

Поскольку Cisco CUCM работает по SFTP только через стандартный порт `22`, проще всего использовать системный `sshd` на хосте:

1. Создайте пользователя `cucm_cdr` и настройте chroot-папку для SFTP в `/etc/ssh/sshd_config`:
   ```bash
   sudo useradd -m -s /usr/sbin/nologin cucm_cdr
   sudo passwd cucm_cdr
   sudo mkdir -p /srv/cucm_sftp/cdr
   sudo chown root:root /srv/cucm_sftp
   sudo chmod 755 /srv/cucm_sftp
   sudo chown cucm_cdr:cucm_cdr /srv/cucm_sftp/cdr
   ```
   Добавьте в конец `/etc/ssh/sshd_config` и перезапустите `sshd` (`sudo systemctl reload sshd`):
   ```text
   Match User cucm_cdr
       ChrootDirectory /srv/cucm_sftp
       ForceCommand internal-sftp
       AllowTcpForwarding no
       X11Forwarding no
   ```
2. Примонтируйте `/srv/cucm_sftp/cdr` к сервису `backend` в `docker-compose.yml` вместо `./data/cdr_inbox:/data/cdr_inbox` (и убедитесь, что у контейнера `backend` есть права на чтение/перемещение файлов из этой папки, например `chmod 777 /srv/cucm_sftp/cdr` или общая группа).
3. В **Cisco Unified Serviceability** → **Tools** → **CDR Management** добавьте Billing Application Server:
   - **Host Name / IP**: IP-адрес сервера.
   - **User Name / Password**: `cucm_cdr` и заданный пароль (порт `22`).
   - **Directory Path**: `/cdr`.
4. Убедитесь, что в **CUCM Administration** → **System** → **Service Parameters** → **Cisco CallManager** включён параметр `CDR Enabled Flag = True` (и при необходимости `Call Diagnostics Enabled = True` для CMR).

## CI / Тестирование на GitHub

Workflow [ci.yml](.github/workflows/ci.yml) автоматически запускает при каждом `push` / `pull_request`:
- Миграции Alembic и `pytest` с тестовым контейнером PostgreSQL 16.
- Проверку типов TypeScript (`tsc --noEmit`) и сборку Vite (`npm run build`).
- Проверку сборки Docker-образов (`docker compose build`).
