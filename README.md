# GickShop

[![CI](https://github.com/Gickrede-e/remnashop/actions/workflows/ci.yml/badge.svg)](https://github.com/Gickrede-e/remnashop/actions/workflows/ci.yml)

Магазин VPN-подписок на базе [Remnawave](https://github.com/remnawave) с личным кабинетом, админ-панелью и оплатой через ЮKassa / Platega.

## Стек

- **Next.js 16** + React 19 + TypeScript
- **PostgreSQL 16** через Prisma ORM
- **Tailwind CSS 4** — стили и UI-компоненты
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

## Качество

- Руководство по тестированию и текущие метрики: [`docs/TESTING.md`](docs/TESTING.md)
- Патчноуты по текущей ветке: [`CHANGELOG.md`](CHANGELOG.md)

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
| `REMNAWAVE_BASE_URL` | URL Remnawave-панели |
| `REMNAWAVE_API_TOKEN` | API-токен Remnawave |
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

Подробности модели обработки — в [`docs/WEBHOOK_YOOKASSA.md`](docs/WEBHOOK_YOOKASSA.md).

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
| `npm run test` | Запуск тестов в watch-режиме |
| `npm run test:unit` | Юнит-слой: `lib`, `components`, `scripts`, `prisma`, proxy/config |
| `npm run test:integration` | Интеграционные проверки routes/pages из `__tests__/app` |
| `npm run test:coverage` | Тесты с покрытием |
| `npm run test:load` | Нагрузочный smoke через `autocannon` |
| `npm run test:mutation` | Mutation testing через Stryker |
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
