# GickShop

[![CI](https://github.com/Gickrede-e/remnashop/actions/workflows/ci.yml/badge.svg)](https://github.com/Gickrede-e/remnashop/actions/workflows/ci.yml)

Магазин подписок на базе [Remnawave](https://github.com/remnawave) с личным кабинетом, админ-панелью и оплатой через ЮKassa / Platega.

Поисковая индексация отключена для всего сайта через `noindex, nofollow` в метаданных и заголовке `X-Robots-Tag`. В `robots.txt` обход разрешён, чтобы поисковики могли прочитать запрет и удалить ранее найденные страницы после повторного обхода.

## Стек

- **Next.js 16** + React 19 + TypeScript
- **PostgreSQL 16** через Prisma ORM
- **Tailwind CSS 4** — стили и UI-компоненты
- **SMTP через Nodemailer** — письма через Google Workspace или self-hosted Maddy
- **Docker** + Caddy — деплой и reverse proxy
- **Vitest** — тесты

## Возможности

- Регистрация и вход по email или Telegram
- Тарифные планы с лимитом трафика и сроком действия
- Оплата через ЮKassa и Platega
- Промокоды (скидки, бесплатные дни, трафик)
- Реферальная программа с наградами
- Админ-панель: пользователи, платежи, тарифы, логи
- Синхронизация с Remnawave-панелью
- Email- и Telegram-уведомления
- Фоновый воркер для асинхронных задач

## Быстрый старт

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/Gickrede-e/remnashop.git
cd remnashop
```

### 2. Создайте файл окружения

```bash
cp .env.example .env
```

Откройте `.env` и заполните обязательные переменные:

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `JWT_SECRET` | Секрет для JWT-токенов (мин. 32 символа) |
| `ADMIN_EMAILS` | Email администратора (через запятую) |
| `ADMIN_INITIAL_PASSWORD` | Начальный пароль администратора для первого `db:seed` |
| `NEXT_PUBLIC_SITE_URL` | Публичный URL сайта |
| `NEXT_PUBLIC_SITE_NAME` | Название сайта |
| `SITE_ADDRESS` | Домен для Caddy (`localhost` для локальной разработки) |
| `EMAIL_ENABLED` | Включает email-верификацию регистрации и восстановление пароля |
| `REMNAWAVE_BASE_URL` | URL Remnawave-панели |
| `REMNAWAVE_API_TOKEN` | API-токен Remnawave |
| `SMTP_HOST` | SMTP-хост: `smtp` для встроенного Maddy или `smtp.gmail.com` для Google Workspace |
| `SMTP_PORT` | SMTP-порт |
| `SMTP_SECURE` | `true` для SMTPS/465, `false` для STARTTLS/587 |
| `SMTP_USER` | SMTP-логин, если провайдер требует авторизацию |
| `SMTP_PASS` | SMTP-пароль или app password; должен быть задан вместе с `SMTP_USER` |
| `MAIL_DOMAIN` | Домен исходящей почты; обязателен для встроенного Maddy и оставляется заполненным в compose-режиме |
| `MAIL_HOSTNAME` | FQDN почтового хоста для встроенного Maddy, например `mail.example.com` |
| `MAIL_DKIM_SELECTOR` | DKIM selector для встроенного Maddy, обычно `mail` |
| `EMAIL_FROM` | Адрес отправителя; для встроенного Maddy должен быть в домене `MAIL_DOMAIN` |
| `YOOKASSA_SHOP_ID` | ID магазина ЮKassa |
| `YOOKASSA_SECRET_KEY` | Секретный ключ ЮKassa |
| `CRON_SECRET` | Секрет для внутренних cron-задач (мин. 16 символов) |
| `LOG_LEVEL` | Минимальный уровень логирования (`debug` / `info` / `warn` / `error`). По умолчанию `info`. |
| `LOG_FORMAT` | Формат логов (`json` или `pretty`). По умолчанию `pretty` в dev, `json` в prod. |

### 3. Запустите локальную сборку через Docker

```bash
docker compose -f docker-compose.hub.yml up -d --build
```

Это поднимет:
- **PostgreSQL** — база данных
- **migrate** — применит миграции и создаст администратора
- **app** — Next.js на порту 3000
- **smtp** — self-hosted SMTP-сервис для писем приложения
- **worker** — фоновый воркер
- **caddy** — reverse proxy на портах 80/443

Сайт будет доступен по адресу, указанному в `SITE_ADDRESS` (по умолчанию http://localhost).

### Вход в админку

После первого запуска создаётся администратор:
- **Email**: значение из `ADMIN_EMAILS`
- **Пароль**: значение из `ADMIN_INITIAL_PASSWORD`

> Установите `ADMIN_INITIAL_PASSWORD` в `.env` перед первым `db:seed` и сразу смените пароль после первого входа.

## Развёртывание из Docker Hub

Для продакшн-деплоя без локальной сборки используйте дефолтный compose-файл с готовым образом из Docker Hub:

```bash
docker compose up -d
```

По умолчанию используется образ `gickrede/remnashop:latest`.

При необходимости можно переопределить его через `APP_IMAGE`:

```bash
APP_IMAGE=gickrede/remnashop:stable docker compose up -d
```

## Google Workspace SMTP

Приложение умеет отправлять письма через любой SMTP-провайдер. Для быстрого production rollout без собственной SMTP-инфраструктуры можно использовать Google Workspace через `smtp.gmail.com` и `app password`.

Пошаговая инструкция: [docs/SMTP-GOOGLE-WORKSPACE.md](docs/SMTP-GOOGLE-WORKSPACE.md)

Если позже понадобится больше контроля и higher-volume relay, следующим шагом можно перейти на `smtp-relay.gmail.com`.

## Self-hosted SMTP

В compose по умолчанию поднимается внутренний SMTP-сервис `smtp` на базе Maddy. Это опциональный путь для self-hosted отправки писем.

Подробная пошаговая инструкция: [docs/SMTP-SETUP.md](docs/SMTP-SETUP.md)

Для реальной доставляемости в продакшене обязательно подготовить:

- `A`-запись для `MAIL_HOSTNAME`, указывающую на IP сервера
- `PTR/rDNS`, указывающий IP сервера обратно в `MAIL_HOSTNAME`
- `SPF` для `MAIL_DOMAIN`, например `v=spf1 a:mail.example.com -all`
- `DMARC` для `MAIL_DOMAIN`
- открыть исходящий TCP `25` у VPS-провайдера

DKIM-ключ Maddy сгенерирует сам после первого старта. Посмотреть готовую DNS-запись можно так:

```bash
docker compose exec smtp sh -lc 'cat /data/dkim_keys/${MAIL_DOMAIN}_${MAIL_DKIM_SELECTOR}.dns'
```

`MX`-запись для `MAIL_DOMAIN` не обязательна, если вы используете только исходящую почту и не принимаете письма обратно.

Для image deploy на VPS отдельные SMTP-файлы рядом с compose не нужны: bootstrap Maddy встроен прямо в compose-манифест.

## Разработка без Docker

```bash
npm install
npm run db:generate
npm run dev
```

Для работы нужен запущенный PostgreSQL и заполненный `.env`.

## Webhook ЮKassa

Webhook ЮKassa обрабатывается в режиме `hint + API verification`: из тела
используется только `object.metadata.paymentId`, а каноничный статус платежа
подтверждается обратным вызовом в YooKassa API. Shared secret не используется;
защита строится на IP-allowlist, per-IP rate-limit, сверке
`metadata.paymentId` и reconciliation для `PENDING` платежей.

Webhook Platega.io защищён по той же модели re-fetch: тело используется
только как hint для `paymentId`, а актуальный статус платежа подтверждается
вызовом `/transaction/{id}` к Platega API с `X-Secret`. Любой статус из тела
игнорируется — атакующий не может «активировать» подписку, отправив
поддельный callback.

## Логирование

Сервер использует structured-логгер `lib/server/logger.ts`. Критичные API-routes
проходят через обёртку `withApiLogging`, которая кладёт в AsyncLocalStorage
контекст запроса (`requestId`, `route`, `method`, `ip`). Вложенные вызовы
сервисов автоматически логируют с этим контекстом, ничего не передавая явно.

**Request correlation:** каждый ответ содержит заголовок `X-Request-Id`.
Этот же id попадает в поле `correlationId` тела ошибочных ответов и в
серверные логи. При расследовании инцидента клиенту достаточно прислать
этот id — по нему находится вся цепочка логов на сервере.

**Уровни:** настраиваются переменной `LOG_LEVEL`. В production по
умолчанию `info`; для отладки временно переключи на `debug`.

**Формат:** `LOG_FORMAT=json` (production) или `LOG_FORMAT=pretty` (dev).
В prod JSON-строки удобно парсятся любым log-aggregator'ом.

**Маскирование:** поля с именами `password`, `token`, `secret`,
`authorization`, `cookie`, `session`, `apiKey` автоматически заменяются
на `[REDACTED]` при сериализации. Это защита от случайных утечек в
логи.

**Воркер:** `scripts/worker.mjs` использует собственный inline-логгер
`scripts/worker-logger.mjs` с тем же JSON-форматом. Все строки воркера
помечены полем `component: "worker"`. После миграции воркера на TS
(см. `docs/TZ_FIXES.md` задача 5) он перейдёт на основной логгер.

### Полезные команды

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск dev-сервера |
| `npm run build` | Сборка для продакшена |
| `npm run test` | Запуск тестов |
| `npm run test:coverage` | Тесты с покрытием |
| `npm run db:generate` | Генерация Prisma-клиента |
| `npm run db:migrate` | Создание миграции |
| `npm run db:deploy` | Применение миграций |
| `npm run db:seed` | Заполнение начальными данными через `node --env-file=.env prisma/seed.mjs` |
| `npm run lint` | Проверка линтером |

## Структура проекта

```
app/                  # Next.js страницы и API-маршруты
├── admin/            # Админ-панель
├── dashboard/        # Личный кабинет пользователя
├── api/              # API endpoints
├── login/, register/ # Авторизация
components/
├── admin/            # Компоненты админки
├── blocks/           # Бизнес-блоки (dashboard, auth)
├── shell/            # Навигация и layout
├── shared/           # Общие компоненты
├── ui/               # UI-примитивы (кнопки, карточки)
lib/
├── auth/             # Сессии, роли, JWT
├── services/         # Бизнес-логика (платежи, подписки, Remnawave)
├── ui/               # Конфигурация навигации
prisma/
├── schema.prisma     # Схема базы данных
├── seed.mjs          # Начальные данные
scripts/
├── worker.mjs        # Фоновый воркер
```

## Переменные окружения

Полный список — в файле [`.env.example`](.env.example).

## Лицензия

Частный проект.
