# GickShop

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
| `NEXT_PUBLIC_SITE_URL` | Публичный URL сайта |
| `NEXT_PUBLIC_SITE_NAME` | Название сайта |
| `SITE_ADDRESS` | Домен для Caddy (`localhost` для локальной разработки) |
| `REMNAWAVE_BASE_URL` | URL Remnawave-панели |
| `REMNAWAVE_API_TOKEN` | API-токен Remnawave |
| `YOOKASSA_SHOP_ID` | ID магазина ЮKassa |
| `YOOKASSA_SECRET_KEY` | Секретный ключ ЮKassa |
| `CRON_SECRET` | Секрет для внутренних cron-задач (мин. 16 символов) |

### 3. Запустите через Docker

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
- **Пароль**: `change-me-admin-password`

> Смените пароль после первого входа.

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
| `npm run db:seed` | Заполнение начальными данными |
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
├── seed.ts           # Начальные данные
scripts/
├── worker.mjs        # Фоновый воркер
```

## Переменные окружения

Полный список — в файле [`.env.example`](.env.example).

## Лицензия

Частный проект.
