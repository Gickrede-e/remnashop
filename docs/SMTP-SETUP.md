# Настройка self-hosted SMTP

Проект использует внутренний SMTP-сервис `smtp` на базе **Maddy**. Приложение отправляет письма через него, а Maddy уже доставляет письма во внешние почтовые сервисы.

Эта инструкция покрывает только **исходящую почту**. Входящие ящики, IMAP/POP3 и приём писем проект не настраивает.

## Что нужно заранее

- VPS с публичным IPv4
- домен, которым вы управляете
- возможность настроить `A`, `TXT` и `PTR/rDNS`
- VPS-провайдер не должен блокировать исходящий TCP `25`

Если порт `25` заблокирован, direct-to-MX доставка работать не будет.

## 1. Заполнить `.env`

Откройте `.env` и задайте:

```env
EMAIL_ENABLED=true

MAIL_DOMAIN=example.com
MAIL_HOSTNAME=mail.example.com
MAIL_DKIM_SELECTOR=mail

SMTP_HOST=smtp
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

EMAIL_FROM="GickShop <notifications@example.com>"
```

Правила:

- `MAIL_DOMAIN` — домен отправки, например `example.com`
- `MAIL_HOSTNAME` — отдельный почтовый hostname, например `mail.example.com`
- `EMAIL_FROM` должен быть в домене `MAIL_DOMAIN`
- `SMTP_HOST=smtp` и `SMTP_PORT=2525` оставьте как есть для встроенного SMTP
- `SMTP_USER` и `SMTP_PASS` можно оставить пустыми для внутреннего SMTP

Пример:

```env
EMAIL_ENABLED=true
MAIL_DOMAIN=myvpn.site
MAIL_HOSTNAME=mail.myvpn.site
MAIL_DKIM_SELECTOR=mail
SMTP_HOST=smtp
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="MyVPN <notifications@myvpn.site>"
```

## 2. Поднять стек

Для локальной сборки:

```bash
docker compose -f docker-compose.hub.yml up -d --build
```

Для pull-only деплоя:

```bash
docker compose up -d
```

Для image deploy отдельный `entrypoint.sh` на сервере не нужен: SMTP bootstrap уже встроен в compose.

После старта должны подняться как минимум:

- `app`
- `smtp`
- `postgres`
- `worker`
- `caddy`

Проверка:

```bash
docker compose ps
docker compose logs -f smtp
```

## 3. Настроить DNS

### A-запись

Почтовый hostname должен смотреть на IP сервера:

```dns
mail.example.com.  A  <IP_СЕРВЕРА>
```

Где `mail.example.com` — это `MAIL_HOSTNAME`.

### PTR / rDNS

У IP сервера обратная запись должна указывать на `MAIL_HOSTNAME`.

То есть должно работать так:

- `mail.example.com -> A -> <IP>`
- `<IP> -> PTR -> mail.example.com`

Это обычно настраивается в панели VPS-провайдера.

### SPF

Добавьте TXT на корневой домен отправки:

```dns
example.com.  TXT  "v=spf1 a:mail.example.com -all"
```

Подставьте сюда свои `MAIL_DOMAIN` и `MAIL_HOSTNAME`.

### DMARC

Минимальный рабочий вариант:

```dns
_dmarc.example.com.  TXT  "v=DMARC1; p=quarantine; adkim=s; aspf=s"
```

### DKIM

После первого запуска `smtp` Maddy сам создаст DKIM-ключ.

Получить готовую DNS-запись:

```bash
docker compose exec smtp sh -lc 'cat /data/dkim_keys/${MAIL_DOMAIN}_${MAIL_DKIM_SELECTOR}.dns'
```

Скопируйте выведенный TXT record в DNS.

## 4. Проверить, что SMTP реально работает

Сначала посмотрите, что `smtp` жив:

```bash
docker compose logs --tail=200 smtp
```

Потом вызовите любой email-flow приложения:

- регистрация с email-верификацией
- `forgot password`
- успешная оплата

Логи:

```bash
docker compose logs -f app
docker compose logs -f smtp
```

Если письмо ушло успешно, в логах `app` не будет SMTP-ошибки, а в `smtp` появится попытка доставки.

## 5. Что проверить снаружи

После отправки письма на Gmail / Outlook / Mail.ru проверьте:

- письмо не попало в спам
- `SPF=pass`
- `DKIM=pass`
- `DMARC=pass`
- `Return-Path` и `From` соответствуют вашему домену

Если письма не доходят:

- проверьте `PTR/rDNS`
- проверьте, что провайдер не режет исходящий `25`
- проверьте `A`, `SPF`, `DKIM`, `DMARC`
- проверьте, что `EMAIL_FROM` использует `MAIL_DOMAIN`

## 6. Что не нужно для текущего проекта

Для текущего проекта **не нужна** `MX`-запись, если вы не принимаете входящую почту.

То есть достаточно:

- `A`
- `PTR/rDNS`
- `SPF`
- `DKIM`
- `DMARC`

## Быстрый чек-лист

1. Заполнить `MAIL_DOMAIN`, `MAIL_HOSTNAME`, `EMAIL_FROM`, `EMAIL_ENABLED=true`
2. Оставить `SMTP_HOST=smtp`, `SMTP_PORT=2525`
3. Поднять `docker compose up -d`
4. Настроить `A` и `PTR/rDNS`
5. Добавить `SPF`
6. Поднять `smtp`, снять DKIM TXT из контейнера и добавить в DNS
7. Добавить `DMARC`
8. Отправить тестовое письмо и проверить `SPF/DKIM/DMARC=pass`
