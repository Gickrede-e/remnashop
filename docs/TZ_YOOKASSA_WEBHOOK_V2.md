# ТЗ для ChatGPT-5.4 xhigh — Webhook ЮKassa как hint, API-ответ как источник истины

## Контекст

Репозиторий — GickShop, магазин VPN-подписок на базе Remnawave. Стек: Next.js 16 + Prisma 7 + PostgreSQL + TypeScript + Zod + Vitest. Reverse-proxy — Caddy. Платёжные провайдеры — ЮKassa и Platega.

В коммите `d4c6c85` («fix(yookassa): move webhook secret to headers») сделан первый подход к защите webhook-эндпоинта `/api/webhook/yookassa`: shared secret перенесён из query-параметра в HTTP-заголовок `X-Webhook-Secret` (с fallback `Authorization: Bearer`), введён класс `WebhookAuthorizationError`, добавлены Zod-схема и тесты. Список IP-адресов ЮKassa захардкожен в `lib/services/yookassa.ts` как константа `YOOKASSA_ALLOWED_IPS`.

**Это ТЗ меняет подход.** Мы уходим от модели «shared secret как доказательство подлинности» к модели «webhook — это hint, единственный источник истины — ответ API ЮKassa». Причины:

1. **ЮKassa не подписывает webhook'и** (нет HMAC / JWT). Shared secret не доказывает подлинность события — только то, что кто-то знает секрет. Это даёт ложное чувство безопасности и требует ротации.
2. **Тело webhook'а уже не используется как источник правды**. В текущем `handleYookassaWebhook` после верификации секрета делается `getYooKassaPayment(remoteId)` — и именно ответ этого API-вызова даёт каноничный статус. То есть секрет защищает нас не от подделки события, а от DoS и мусора в логах.
3. Для защиты от DoS и мусора есть **лучшие средства**: rate-limit, IP-allowlist, local-payment-precheck. Они дают сопоставимый уровень защиты без единого shared secret.
4. **Reconciliation loop** (планируется задачей 4 в `docs/TZ_FIXES.md`) делает весь webhook-путь «best effort»: даже если webhook полностью пропадёт, платёж поднимется через поллинг `PENDING` платежей.

## Принципы новой реализации

1. **Никакого shared secret для ЮKassa webhook'ов.** Переменная `YOOKASSA_WEBHOOK_SECRET`, класс `WebhookAuthorizationError` и функция `compareWebhookSecret` — удаляются (в части ЮKassa; Platega не трогаем, у неё есть HMAC-подпись).
2. **Тело webhook'а — только hint.** Из body достаётся `metadata.paymentId` (наш внутренний id), и это всё, чему мы доверяем из body. Любые статусы, суммы, состояния — игнорируются на уровне роутa и сервиса.
3. **Порядок обработки — local first, remote second.** Сначала проверяем, что в нашей БД есть такой платёж; только потом ходим в ЮKassa API за каноничным статусом.
4. **Перекрёстная верификация.** Получив ответ от `getYooKassaPayment`, мы проверяем, что `remote.metadata.paymentId === localPayment.id`. Если нет — дропаем обработку и логируем инцидент.
5. **IP-allowlist остаётся.** Как defence-in-depth и фильтр трафика до rate-limit'а. Реализация текущая (`verifyYooKassaIp` + хардкод-константа в `lib/services/yookassa.ts`) — **не меняется** в рамках этой задачи.
6. **Rate-limit по IP.** Новый барьер — перед любыми обращениями к БД и ЮKassa API.
7. **«Тихий» отказ.** Любой запрос, который не проходит проверки (IP, rate-limit, отсутствие payment в БД, mismatch metadata), завершается HTTP 200 с пустым телом `{ accepted: true }` и warn-логом на сервере. Атакующий не должен различать «дропнуто» от «обработано». Легитимная ЮKassa от этого не пострадает — она ждёт 2xx.
8. **Идемпотентность и дедуп событий** (задача 3 из `docs/TZ_FIXES.md`) — **не в скоупе** этой задачи. Сделаем отдельно.

## Общие требования

- Только правки в рамках webhook'а ЮKassa. Platega не трогаем.
- Стиль кода: TS/ESM, 2 пробела, `;`, двойные кавычки. PascalCase — компоненты, camelCase — функции/переменные.
- Коммит-сообщения на английском, императивом, в стиле истории: `refactor(yookassa): ...` / `fix(yookassa): ...`.
- Перед завершением: `npm run lint && npm run test`. Оба обязаны быть зелёными.
- Новые env-переменные — в `lib/env.ts` (Zod), `.env.example`, README. В этой задаче новых env-переменных НЕТ, есть только удаляемая (`YOOKASSA_WEBHOOK_SECRET`).
- Prisma-схема и миграции — не трогаем.
- Пользовательские сообщения — на русском (если вдруг потребуются); код/коммиты/комментарии — английский.

---

## Задача 1 — Удалить shared secret из YooKassa webhook-flow

**Файлы:**
- `lib/services/payments.ts`
- `app/api/webhook/yookassa/route.ts`
- `lib/env.ts`
- `.env.example`
- `README.md`
- `__tests__/lib/services/payments.test.ts`
- `__tests__/app/api/webhook/yookassa.route.test.ts`

**Что сделать:**

### 1.1. `lib/services/payments.ts`

- Удалить класс `WebhookAuthorizationError` (строки ~117–123).
- Удалить функцию `compareWebhookSecret` (строки ~125–139).
- Удалить импорт `import { timingSafeEqual } from "node:crypto";` (если он больше не нужен — проверить).
- Удалить импорт `import { env } from "@/lib/env";` **только если** после изменений он больше не используется в файле (почти наверняка всё ещё нужен для других мест — оставить).
- В сигнатуре `handleYookassaWebhook` убрать параметр `providedSecret`. Функция теперь принимает:
  ```ts
  export async function handleYookassaWebhook(input: {
    ip: string;
    event: {
      object?: {
        id?: string;
        status?: string;
        metadata?: Record<string, string>;
      };
    };
  })
  ```
- Внутри функции удалить оба блока проверки секрета (`if (!input.providedSecret) ...` и `if (!compareWebhookSecret(...)) ...`).
- **Порядок проверок внутри функции должен стать таким** (оставить то, что уже есть, в новом порядке):

  1. `if (!verifyYooKassaIp(input.ip))` → бросить новую ошибку `WebhookIpForbiddenError` (см. 1.2).
  2. Извлечь `remoteId = input.event.object?.id`. Если пусто → бросить `WebhookDropSilentlyError("remote id missing")` (см. 1.2).
  3. Извлечь `hintedLocalPaymentId = input.event.object?.metadata?.paymentId`. Если пусто → `WebhookDropSilentlyError("local payment id missing in hint")`.
  4. `localPayment = await prisma.payment.findUnique({ where: { id: hintedLocalPaymentId } })`. Если null → `WebhookDropSilentlyError("local payment not found")`.
  5. Если `localPayment.status === PaymentStatus.SUCCEEDED && localPayment.subscriptionId` → return `localPayment` (уже обработано, ничего не делаем, не ходим в ЮKassa).
  6. `remotePayment = await getYooKassaPayment(remoteId)`.
  7. **Cross-check:** `if (remotePayment.metadata?.paymentId !== localPayment.id)` → бросить `WebhookIntegrityError("metadata paymentId mismatch")` (см. 1.2). Это ВАЖНАЯ проверка — она защищает от атаки, где злоумышленник прислал чужой `remoteId` с нашим `localPaymentId`.
  8. Вызвать `processYookassaRemotePayment({ localPaymentId: localPayment.id, remotePayment, source: "WEBHOOK" })`.

- Вернуть результат `processYookassaRemotePayment`.

### 1.2. Новые классы ошибок в `lib/services/payments.ts`

Вместо удалённого `WebhookAuthorizationError` ввести три узкоспециализированных класса:

```ts
export class WebhookIpForbiddenError extends Error {
  constructor(message = "Webhook source IP is not allowlisted") {
    super(message);
    this.name = "WebhookIpForbiddenError";
  }
}

export class WebhookDropSilentlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookDropSilentlyError";
  }
}

export class WebhookIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookIntegrityError";
  }
}
```

Экспортировать их из модуля.

**Назначение:**
- `WebhookIpForbiddenError` — IP не в allowlist. Роут отвечает **HTTP 200** и `logger.warn` (чтобы не давать атакующему сигнала).
- `WebhookDropSilentlyError` — вход корректен структурно, но нет чего нужно (нет `remoteId`, нет `localPayment`, и т.п.). Роут отвечает **HTTP 200** и `logger.warn`.
- `WebhookIntegrityError` — серьёзное расхождение между hint'ом и API-ответом. Роут отвечает **HTTP 200**, но пишет `logger.error` и `logAdminAction({ action: "PAYMENT_WEBHOOK_INTEGRITY" })`. Это индикатор атаки или жёсткого бага.

### 1.3. `app/api/webhook/yookassa/route.ts`

- Удалить функцию `getProvidedSecret`.
- Удалить импорт `WebhookAuthorizationError`, заменить на импорт трёх новых классов (см. 1.2).
- `handleYookassaWebhook({ ip, event })` вызывать без `providedSecret`.
- Zod-схему `yookassaWebhookSchema` **сделать строгой**: `object` обязателен, `object.id` обязателен и непустой, `object.metadata.paymentId` обязателен и непустой. Это даёт нам pre-validation на уровне роутa.

  ```ts
  const yookassaWebhookSchema = z.object({
    object: z.object({
      id: z.string().min(1),
      status: z.string().optional(),
      metadata: z
        .object({
          paymentId: z.string().min(1)
        })
        .passthrough()
    })
  });
  ```
- Добавить per-IP rate-limit **первым шагом** в `try`, до парсинга body:
  ```ts
  const ip = getClientIp(request);
  try {
    enforceRateLimit({
      key: `webhook:yookassa:${ip || "unknown"}`,
      max: 30,
      windowMs: 60_000
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      logger.warn("webhook.rate_limited", { provider: "YOOKASSA", ip });
      return apiOk({ accepted: true });
    }
    throw error;
  }
  ```
  Нужные импорты — `enforceRateLimit`, `RateLimitExceededError` из `@/lib/server/rate-limit`. Лимит `30/min/IP` — стартовое значение; комментарий в коде «initial tuning, adjust based on real traffic».
- Новая форма `catch`:
  ```ts
  } catch (error) {
    const message = error instanceof Error ? error.message : "YooKassa webhook failed";

    if (error instanceof WebhookIpForbiddenError) {
      logger.warn("webhook.ip_forbidden", { provider: "YOOKASSA", ip, paymentId: remoteId });
      return apiOk({ accepted: true });
    }

    if (error instanceof WebhookDropSilentlyError) {
      logger.warn("webhook.dropped", {
        provider: "YOOKASSA",
        ip,
        paymentId: remoteId,
        reason: message
      });
      return apiOk({ accepted: true });
    }

    if (error instanceof WebhookIntegrityError) {
      logger.error("webhook.integrity", {
        provider: "YOOKASSA",
        ip,
        paymentId: remoteId,
        reason: message
      });
      await logAdminAction({
        action: "PAYMENT_WEBHOOK_INTEGRITY",
        targetType: "PAYMENT",
        targetId: remoteId,
        details: { provider: "YOOKASSA", ip, reason: message }
      }).catch(() => null);
      return apiOk({ accepted: true });
    }

    // Неизвестная ошибка — скорее всего баг или проблема с ЮKassa API.
    // Здесь можно вернуть 500, чтобы ЮKassa ретраила. НО: при этом мы потеряем идемпотентность,
    // пока нет задачи 3. Безопаснее — 200 + error-лог + admin-log, и полагаться на reconcile (задача 4).
    await logAdminAction({
      action: "PAYMENT_WEBHOOK_ERROR",
      targetType: "PAYMENT",
      targetId: remoteId,
      details: { provider: "YOOKASSA", message }
    }).catch(() => null);
    logger.error("webhook.failed", {
      provider: "YOOKASSA",
      paymentId: remoteId,
      error: serializeError(error)
    });
    return apiOk({ accepted: true });
  }
  ```

  **Важно:** роут в этой реализации **не возвращает ни 400, ни 401, ни 500**. Всегда 200 с `{ accepted: true }`. Это сознательное решение:
  - ЮKassa считает не-2xx за провал и ретраит. Мы не хотим ретраев на нашей внутренней ошибке, потому что reconcile-loop всё равно подхватит платёж.
  - Атакующий не получает информации о том, почему его запрос «не сработал».
- `const ip = getClientIp(request)` вынести **до `try`** (чтобы был доступен в catch).
- Переменную `remoteId` оставить как «best-effort breadcrumb» для логов.

### 1.4. `lib/env.ts`

- Удалить `YOOKASSA_WEBHOOK_SECRET` из `DEV_ENV_FALLBACKS`.
- Удалить `YOOKASSA_WEBHOOK_SECRET` из `rawEnv`.
- Удалить `YOOKASSA_WEBHOOK_SECRET` из `envSchema`.
- Проверить, что ни один из `requiredSecret(...)` / `base.YOOKASSA_WEBHOOK_SECRET` больше не используется.
- Экспорт `env` не менять.

### 1.5. `.env.example`

- Удалить строку `YOOKASSA_WEBHOOK_SECRET=REPLACE_WITH_YOOKASSA_WEBHOOK_SECRET # Send as X-Webhook-Secret header`.

### 1.6. `README.md`

- Удалить строку таблицы env-переменных про `YOOKASSA_WEBHOOK_SECRET`.
- Удалить или заменить раздел «Webhook ЮKassa» (добавлен в d4c6c85).
- Добавить новый короткий раздел «Webhook ЮKassa» со следующим содержанием (примерно):

  > ЮKassa webhook обрабатывается в режиме «hint + API verification». Тело webhook'а используется только для того, чтобы извлечь наш внутренний `paymentId` из `metadata`. Каноничный статус платежа берётся обратным вызовом в ЮKassa API. Shared secret не используется: это сознательное архитектурное решение, так как ЮKassa не подписывает webhook'и. Защита от DoS и фрода обеспечивается: (1) IP-allowlist (встроен в приложение), (2) per-IP rate-limit на `/api/webhook/yookassa`, (3) сверкой `metadata.paymentId` из ответа API с локальной записью, (4) reconciliation-циклом для PENDING платежей (worker). В кабинете ЮKassa настраивать ничего, кроме URL webhook'а, не требуется.

- В таблицу переменных окружения добавить пояснение, что `YOOKASSA_WEBHOOK_SECRET` больше не используется. (Или ничего не добавлять — просто удалить строку, если считаешь это избыточным.)

### 1.7. Тесты

**`__tests__/app/api/webhook/yookassa.route.test.ts`** — переписать:

Удалить тесты про «401 missing secret» / «401 mismatch secret» / «200 valid secret». Вместо них — следующие кейсы:

1. **`returns 200 and drops silently when body is structurally invalid`** — пустой body, `object` отсутствует, `metadata.paymentId` отсутствует. Во всех случаях 200 + `logger.warn("webhook.dropped", ...)` или через общий invalid-body path (у `parseRequestBody` это `ZodError` → попадёт в общий catch → будет `webhook.failed` + `apiOk({ accepted: true })`). **Обрати внимание:** `parseRequestBody` кидает `ZodError` — он не наследник нашего `WebhookDropSilentlyError`. Реши один из вариантов:
   - (A) В роуте перед `parseRequestBody` завернуть в свой try/catch и при `ZodError` / любой ошибке парсинга бросать `WebhookDropSilentlyError("invalid body")`.
   - (B) Добавить дополнительную ветку в общий catch: `if (error instanceof z.ZodError)` → тот же path, что и `WebhookDropSilentlyError`.

   **Выбери (A)** — проще и предсказуемее.

2. **`returns 200 silently when handleYookassaWebhook throws WebhookDropSilentlyError`** — мок-сервис кидает ошибку, роут отвечает 200 + warn. Проверь, что `logger.warn` вызван с правильным event-name и `logger.error` — нет.

3. **`returns 200 and logs error when handleYookassaWebhook throws WebhookIntegrityError`** — роут отвечает 200 + `logger.error` + `logAdminAction` вызван с `action: "PAYMENT_WEBHOOK_INTEGRITY"`.

4. **`returns 200 and logs error when handleYookassaWebhook throws WebhookIpForbiddenError`** — роут отвечает 200 + `logger.warn("webhook.ip_forbidden")`. `logAdminAction` **НЕ** вызывается (иначе атакующий легко наспамит админ-лог).

5. **`returns 200 successfully when valid webhook is processed`** — мок возвращает успешный результат, роут отдаёт `apiOk(result)`. Проверь, что `enforceRateLimit` вызван ровно один раз с ключом `webhook:yookassa:<ip>`.

6. **`returns 200 and drops when rate limit exceeded`** — замокай `enforceRateLimit`, чтобы он кидал `RateLimitExceededError`. Проверь, что роут отдаёт 200 + `logger.warn("webhook.rate_limited")` и `handleYookassaWebhook` НЕ вызывается.

Используй `vi.hoisted` + `vi.mock` так же, как в текущем тесте. Импорты `WebhookIpForbiddenError`, `WebhookDropSilentlyError`, `WebhookIntegrityError` замокай как классы (аналогично `MockWebhookAuthorizationError` в старом тесте).

**`__tests__/lib/services/payments.test.ts`** — блок `describe("handleYookassaWebhook", ...)` переписать:

1. Удалить тесты «rejects when secret is missing» и «rejects when secret mismatches».
2. Добавить:
   - **`throws WebhookIpForbiddenError when IP is not allowlisted`** — `mockVerifyYooKassaIp.mockReturnValue(false)`. Проверь, что `getYooKassaPayment` НЕ вызван и `prisma.payment.findUnique` НЕ вызван.
   - **`throws WebhookDropSilentlyError when remoteId is missing`** — event без `object.id`. `getYooKassaPayment` НЕ вызван.
   - **`throws WebhookDropSilentlyError when metadata.paymentId is missing`** — event с `object.id`, но без `metadata.paymentId`. `getYooKassaPayment` НЕ вызван.
   - **`throws WebhookDropSilentlyError when local payment is not found`** — `mockPrisma.payment.findUnique.mockResolvedValue(null)`. `getYooKassaPayment` НЕ вызван.
   - **`returns existing payment without remote call when it is already SUCCEEDED with subscription`** — мок findUnique возвращает SUCCEEDED + subscriptionId. Проверь, что `getYooKassaPayment` НЕ вызван.
   - **`throws WebhookIntegrityError when remote metadata.paymentId does not match local payment id`** — мок findUnique вернул платёж `id: "payment-1"`, `getYooKassaPayment` вернул `metadata: { paymentId: "payment-SOMETHING-ELSE" }`. Проверь, что `activateSubscriptionFromPayment` НЕ вызван.
   - **`processes the payment when all checks pass`** — happy path: IP ок, remoteId есть, metadata paymentId есть, local payment есть (PENDING), cross-check совпал → вызывается процессинг. Проверить порядок вызовов.
3. Убрать моки для `YOOKASSA_WEBHOOK_SECRET` из `mockEnv` — больше не нужно.

**Критерий приёмки задачи 1:**
- Код не содержит упоминаний `YOOKASSA_WEBHOOK_SECRET`, `providedSecret`, `WebhookAuthorizationError`, `compareWebhookSecret` (ищи `grep -rn` по всему репо, кроме `.git/`, `node_modules/`, `.next/`).
- `npm run lint` зелёный.
- `npm run test` зелёный.
- Новые тесты покрывают все 6+7 сценариев из списка выше.

---

## Задача 2 — Документация архитектурного решения

**Файлы:** `docs/WEBHOOK_YOOKASSA.md` (новый), `README.md`.

**Что сделать:**

Создать файл `docs/WEBHOOK_YOOKASSA.md` со следующей структурой:

```markdown
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
8. **Process**: `processYookassaRemotePayment(...)` → активация подписки.

## Коды ответов

Роут всегда отвечает **HTTP 200** с телом `{ accepted: true }`, независимо от
результата обработки. Причины:

- ЮKassa ретраит любой не-2xx. Мы не хотим бесконечных ретраев из-за нашей
  внутренней ошибки — пропущенный платёж всё равно подхватит reconciliation-loop
  (см. `scripts/worker.mjs` и задачу 4 в `docs/TZ_FIXES.md`).
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

- `docs/TZ_FIXES.md` задача 3 — дедупликация webhook-событий.
- `docs/TZ_FIXES.md` задача 4 — reconciliation loop для PENDING платежей
  (основной backstop, если webhook полностью пропал).
```

В `README.md` в разделе про webhook заменить текст на ссылку «Подробности модели
обработки — в [`docs/WEBHOOK_YOOKASSA.md`](docs/WEBHOOK_YOOKASSA.md)».

**Критерий приёмки задачи 2:**
- Файл `docs/WEBHOOK_YOOKASSA.md` создан.
- README ссылается на него и не содержит устаревшей инструкции про
  `X-Webhook-Secret`.

---

## Задача 3 — Обновление `docs/TZ_FIXES.md`

**Файл:** `docs/TZ_FIXES.md`.

**Что сделать:**

Задача 1 в существующем файле `docs/TZ_FIXES.md` описывает старый подход
(перенос секрета в заголовок). Заменить её текст на короткую шапку:

```markdown
## Задача 1 — Webhook ЮKassa: hint + API verification [ЗАМЕНЕНО]

Изначальный план (перенос secret в заголовок) был реализован коммитом
`d4c6c85` и затем заменён новой моделью. Актуальное ТЗ и документация —
в `docs/TZ_YOOKASSA_WEBHOOK_V2.md` и `docs/WEBHOOK_YOOKASSA.md`.
```

Остальные задачи 2–12 остаются без изменений.

**Критерий приёмки задачи 3:**
- Файл отражает реальный статус задачи 1.

---

## План работы

1. Задача 1 — одним коммитом: `refactor(yookassa): replace webhook secret with hint+api verification`.
2. Задача 2 — отдельным коммитом: `docs(yookassa): document hint+api verification model`.
3. Задача 3 — отдельным коммитом: `docs(fixes): mark yookassa secret task as superseded`.

После каждой задачи: `npm run lint && npm run test`.

## Что явно НЕ делать (out of scope)

- **Не трогать Platega.** У неё есть HMAC-подпись, там своя модель. Код
  `verifyPlategaSignature` и `handlePlategaWebhook` остаётся как есть.
- **Не вводить дедупликацию webhook-событий** (таблица `WebhookEvent`). Это
  задача 3 из `docs/TZ_FIXES.md`, делаем отдельно.
- **Не вводить reconciliation-loop** (задача 4 из `docs/TZ_FIXES.md`). Делаем
  отдельно. В рамках этой задачи ссылаемся на него только в документации.
- **Не переносить IP-allowlist в Caddyfile.** Хардкод в `lib/services/yookassa.ts`
  остаётся. Это отдельное архитектурное решение на будущее.
- **Не менять реализацию `verifyYooKassaIp`** и его тесты (кроме, возможно,
  добавления одного кейса — не обязательно). Функция продолжает работать с
  захардкоженным списком.
- **Не переписывать Zod-схемы других webhook'ов.** Только `yookassaWebhookSchema`.
- **Не обновлять версии npm-пакетов.**
- **Не добавлять новые зависимости.** `enforceRateLimit` и
  `RateLimitExceededError` уже есть в `lib/server/rate-limit.ts`.
- **Не вводить метрики/Sentry/OpenTelemetry.**
- **Не трогать Dockerfile, docker-compose, Caddyfile.**

## Проверочный чеклист перед commit'ом

- [ ] `grep -rn "YOOKASSA_WEBHOOK_SECRET" .` — должно показать только историю
      git и, возможно, CHANGELOG. В коде, тестах, env-файлах, README — ничего.
- [ ] `grep -rn "WebhookAuthorizationError" .` — пусто в текущем коде.
- [ ] `grep -rn "compareWebhookSecret" .` — пусто.
- [ ] `grep -rn "providedSecret" .` — пусто.
- [ ] `grep -rn "X-Webhook-Secret" .` — пусто (или только в changelog / git log).
- [ ] `app/api/webhook/yookassa/route.ts` возвращает **только** 200, никогда
      не вызывает `apiError`.
- [ ] `handleYookassaWebhook` нигде не читает `env.YOOKASSA_WEBHOOK_SECRET`.
- [ ] Новые классы ошибок экспортируются из `lib/services/payments.ts`.
- [ ] В `handleYookassaWebhook` cross-check `metadata.paymentId` обязательно
      выполняется и закрыт тестом.
- [ ] Rate-limit в роуте использует ключ с префиксом `webhook:yookassa:`.
- [ ] `npm run lint` — зелёный.
- [ ] `npm run test` — зелёный.
- [ ] `docs/WEBHOOK_YOOKASSA.md` создан.
- [ ] README и `docs/TZ_FIXES.md` обновлены.
