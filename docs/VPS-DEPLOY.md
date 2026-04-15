# Деплой на VPS через Docker Hub

Гайд для чистого Ubuntu/Debian VPS. Собирать ничего не нужно — образ тянется из `gickrede/remnashop:latest`.

## Что понадобится

- VPS с Ubuntu 22.04+ / Debian 12+, открытые порты `80` и `443`
- Желательно не меньше 15 GB диска под root/docker. На маленьких VPS Docker image cache быстро забивает `/`
- Домен, `A`-запись которого смотрит на IP сервера
- Доступы к YooKassa / Platega / Remnawave (ключи и URL)

## Шаги

### 1. Поставить Docker (один раз, если его ещё нет)

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Создать рабочий каталог и скачать 3 конфига

```bash
mkdir -p /opt/remnashop && cd /opt/remnashop
curl -fsSLO https://raw.githubusercontent.com/Gickrede-e/remnashop/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/Gickrede-e/remnashop/main/Caddyfile
curl -fsSL  https://raw.githubusercontent.com/Gickrede-e/remnashop/main/.env.example -o .env
```

### 3. Заполнить `.env`

```bash
nano .env
```

Обязательно поменять:

| Переменная | Значение |
|---|---|
| `SITE_ADDRESS` | ваш домен, например `vpn.example.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://vpn.example.com` |
| `POSTGRES_PASSWORD` | длинный случайный пароль |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 16` |
| `ADMIN_EMAILS` | ваш email |
| `REMNAWAVE_BASE_URL` / `REMNAWAVE_API_TOKEN` | из панели Remnawave |
| `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` / `YOOKASSA_WEBHOOK_SECRET` | из ЛК YooKassa |
| `PLATEGA_API_KEY` / `PLATEGA_WEBHOOK_SECRET` | из ЛК Platega |
| `SMTP_*` / `EMAIL_FROM` | для писем |

Совет: сгенерировать секреты одной командой:

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"; echo "CRON_SECRET=$(openssl rand -hex 16)"
```

### 4. Поднять стек

```bash
docker compose up -d
```

Docker сам стянет образ `gickrede/remnashop:latest`, поднимет Postgres, применит миграции, запустит приложение, воркер и Caddy. Caddy автоматически получит Let's Encrypt-сертификат по домену из `SITE_ADDRESS`.

### 5. Проверить, что всё поднялось

```bash
docker compose ps
curl -I https://<ваш-домен>/api/health
```

Должно вернуться `200 OK`. Если `503` — смотри логи:

```bash
docker compose logs -f app
```

Полезно сразу проверить свободное место:

```bash
df -h
docker system df
```

### 6. Первый вход в админку

- URL: `https://<ваш-домен>/login`
- Email: значение из `ADMIN_EMAILS`
- Пароль: `change-me-admin-password`

**Сразу смените пароль** в `/dashboard/settings` после первого входа.

---

## Обновление до новой версии

```bash
cd /opt/remnashop
docker compose pull && docker compose up -d
```

Миграции применятся автоматически сервисом `migrate`.

## Остановка / перезапуск

```bash
docker compose down          # остановить
docker compose up -d         # поднять снова
docker compose restart app   # перезапустить только приложение
```

## Troubleshooting

### `postgres` unhealthy / `No space left on device`

Симптомы:

- `docker compose ps` показывает `postgres` в `unhealthy`
- в `docker compose logs postgres` есть `PANIC: ... No space left on device`
- сайт начинает сыпать ошибками, потому что `migrate` и `app` зависят от healthy PostgreSQL

Порядок восстановления:

```bash
cd /opt/remnashop
df -h
docker system df
docker image prune -af
docker compose restart postgres
docker compose ps
docker compose logs --tail=100 postgres
docker compose up -d
curl -I https://<ваш-домен>/api/health
```

Если данные в текущей БД не нужны и контейнер всё равно не поднимается:

```bash
cd /opt/remnashop
docker compose down
docker volume rm remnashop_postgres_data
docker compose up -d
```

Важно: не используйте `docker compose down -v`, если хотите сохранить Caddy volume с сертификатами.

## Бэкап базы

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz
```

## Откат на конкретный тег образа

В `.env` задать `APP_IMAGE=gickrede/remnashop:<tag>` и выполнить `docker compose up -d`.
