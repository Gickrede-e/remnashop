# Webhook ЮKassa: hint + API verification

## Почему не shared secret

ЮKassa не подписывает webhook'и криптографически (нет HMAC/JWT). Shared secret в
заголовке защищает от случайного любопытного, но не доказывает, что событие
пришло именно от ЮKassa, и не устойчив против утечки секрета (логи, backup,
экс-сотрудник с доступом к `.env`).

## Модель доверия

Мы считаем тело webhook'а **ненадёжным hint'ом**. Единственный источник истины —
ответ GET `/v3/payments/{id}` из YooKassa API. Из тела webhook'а используется
только одно поле — `object.metadata.paymentId`, чтобы понять, какой именно
наш внутренний платёж нужно проверить.

## Порядок обработки

1. **Rate-limit по IP** (30 req/min/IP). Мягкий лимит, настраивается в
   `app/api/webhook/yookassa/route.ts`.
2. **IP-allowlist** (хардкод в `lib/services/yookassa.ts`, константа
   `YOOKASSA_ALLOWED_IPS`). Источник: официальная документация ЮKassa.
3. **Structural validation** тела через Zod. Body должен содержать
   `object.id` и `object.metadata.paymentId`.
4. **Local lookup**: `prisma.payment.findUnique({ where: { id: paymentIdFromMetadata } })`.
   Если запись не найдена — отказ (silent drop).
5. **Short-circuit**: если локальный платёж уже `SUCCEEDED` и имеет привязанную
   подписку — возвращаем его сразу, не ходим в ЮKassa.
6. **Remote fetch**: `getYooKassaPayment(remoteId)` — получаем каноничное
   состояние.
7. **Cross-check**: `remotePayment.metadata.paymentId === localPayment.id`.
   Это защита от атаки «подменить remoteId с валидным metadata.paymentId».
   При несовпадении — `WebhookIntegrityError`, админ-лог, отказ.
8. **Process**: `processYooKassaRemotePayment(...)` → активация подписки.

## Коды ответов

Роут всегда отвечает **HTTP 200** с телом `{ accepted: true }`, независимо от
результата обработки. Причины:

- ЮKassa ретраит любой не-2xx. Мы не хотим бесконечных ретраев из-за нашей
  внутренней ошибки — пропущенный платёж всё равно подхватит reconciliation-loop
  (см. `scripts/worker.mjs` и запланированный reconciliation loop для
  `PENDING` платежей).
- Атакующий не получает информации о том, почему его запрос «не сработал».

Все отказы (IP forbidden, silent drop, integrity violation, unexpected error)
фиксируются в логах через `logger.warn` или `logger.error`, критичные —
дополнительно в `admin_logs`.

## Что делать, если ЮKassa меняет свои IP

Обновить константу `YOOKASSA_ALLOWED_IPS` в `lib/services/yookassa.ts` и
выпустить новый релиз образа. Альтернативные подходы (перенос в Caddyfile,
динамическое обновление) — возможны в будущем, но не входят в текущую
реализацию.

## Что делать, если ЮKassa начнёт подписывать webhook'и

Добавить проверку подписи как первый шаг после IP-allowlist, но сохранить
весь остальной pipeline (local lookup → API verify → cross-check). Подпись
станет ещё одним слоем defence-in-depth, а не заменой текущей модели.

## Связанные задачи

- Запланированная дедупликация webhook-событий.
- Запланированный reconciliation loop для `PENDING` платежей
  (основной backstop, если webhook полностью пропал).
