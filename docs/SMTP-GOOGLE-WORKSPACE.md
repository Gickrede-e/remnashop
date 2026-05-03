# Настройка Google Workspace SMTP

Проект уже умеет отправлять письма через любой SMTP-сервер. Для Google Workspace не нужно менять код приложения: достаточно переключить `SMTP_*` и `EMAIL_FROM`.

Этот сценарий рассчитан на быстрый production rollout с `smtp.gmail.com`. Внутренний контейнер `smtp` на базе Maddy можно оставить в compose как есть, но приложение будет отправлять письма напрямую в Google Workspace.

## Когда этот вариант подходит

- у вас небольшой или средний объём писем
- нужны коды подтверждения, восстановление пароля и сервисные уведомления
- не хочется поднимать собственный SMTP с `PTR/rDNS`, `DKIM`-ключами из контейнера и открытым исходящим `25`

Если объём вырастет или понадобится централизованный relay-policy, следующим шагом имеет смысл перейти на `smtp-relay.gmail.com`.

## 1. Подготовить mailbox в Google Workspace

Создайте отдельный ящик для уведомлений, например:

```text
notifications@yourdomain.com
```

Для этого ящика:

- включите `2-Step Verification`
- создайте `App Password`
- используйте именно `App Password`, а не обычный пароль пользователя

## 2. Обновить `.env`

Откройте `.env` и задайте:

```env
EMAIL_ENABLED=true

MAIL_DOMAIN=yourdomain.com
MAIL_HOSTNAME=mail.yourdomain.com
MAIL_DKIM_SELECTOR=mail

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=REPLACE_WITH_GOOGLE_APP_PASSWORD

EMAIL_FROM="GickShop <notifications@yourdomain.com>"
```

Важно:

- `SMTP_PORT=587` и `SMTP_SECURE=false` означают `STARTTLS`
- `SMTP_USER` и `SMTP_PASS` должны быть заданы вместе
- `EMAIL_FROM` должен совпадать с доменом Google Workspace mailbox
- `MAIL_*` оставьте заполненными: текущий compose всё ещё поднимает контейнер `smtp`, даже если приложение им не пользуется

## 3. Настроить DNS домена отправки

### SPF

Добавьте или обновите SPF для домена отправки:

```dns
yourdomain.com.  TXT  "v=spf1 include:_spf.google.com -all"
```

Если у вас уже есть SPF, не создавайте вторую запись. Нужно отредактировать существующую и добавить `include:_spf.google.com`.

### DKIM

Включите DKIM в Google Admin для домена отправки и опубликуйте TXT, который покажет Google.

### DMARC

Минимальный безопасный старт:

```dns
_dmarc.yourdomain.com.  TXT  "v=DMARC1; p=none; rua=mailto:postmaster@yourdomain.com"
```

После проверки доставляемости можно ужесточить политику.

## 4. Перезапустить стек

Для image deploy:

```bash
docker compose up -d
```

Для локальной сборки:

```bash
docker compose -f docker-compose.hub.yml up -d --build
```

## 5. Проверить отправку

Прогоните оба сценария:

- регистрация с кодом подтверждения
- сброс пароля

Полезные команды:

```bash
docker compose logs -f app
docker compose logs -f smtp
```

`smtp` в этом rollout может быть неактивен с точки зрения реальной доставки. Ключевой сигнал успеха: в логах `app` нет `notification.email_send_failed`.

## 6. Что больше не требуется для этого rollout

Если приложение отправляет письма через Google Workspace, то для доставки кодов не нужны:

- `PTR/rDNS` для `MAIL_HOSTNAME`
- открытый исходящий TCP `25`
- DKIM-ключи Maddy из контейнера `smtp`
- `A`-запись для `MAIL_HOSTNAME` ради почтовой доставки

## Полезные ссылки Google

- Отправка из app/device через Google Workspace: https://support.google.com/a/answer/176600
- Лимиты отправки Gmail в Google Workspace: https://support.google.com/a/answer/166852
- App passwords: https://support.google.com/accounts/answer/185833
