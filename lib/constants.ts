export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-gickvpn_session" : "gickvpn_session";

export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export const PAYMENT_PROVIDER_LABELS = {
  YOOKASSA: "ЮKassa",
  PLATEGA: "Platega"
} as const;

export const SUBSCRIPTION_STATUS_LABELS = {
  PENDING: "Ожидает",
  ACTIVE: "Активна",
  EXPIRED: "Истекла",
  CANCELED: "Отменена"
} as const;

export const PAYMENT_STATUS_LABELS = {
  PENDING: "Ожидает",
  SUCCEEDED: "Оплачен",
  CANCELED: "Отменен",
  FAILED: "Ошибка"
} as const;

export const PROMO_TYPE_LABELS = {
  DISCOUNT_PERCENT: "Скидка в процентах",
  DISCOUNT_FIXED: "Фиксированная скидка",
  FREE_DAYS: "Бесплатные дни",
  FREE_TRAFFIC_GB: "Бесплатный трафик"
} as const;

export const marketingFaq = [
  {
    question: "Как быстро активируется подписка?",
    answer: "Обычно за несколько секунд после подтверждения платежа и обработки webhook."
  },
  {
    question: "Можно ли продлить активную подписку?",
    answer: "Да. GickVPN добавляет срок и трафик поверх уже действующей подписки."
  },
  {
    question: "Есть ли клиент для телефона и ноутбука?",
    answer: "Да. На странице настройки есть инструкции для iOS, Android, Windows, macOS и Linux."
  },
  {
    question: "Работают ли промокоды и реферальные бонусы?",
    answer: "Да. Скидки и бонусы применяются в кабинете при создании платежа."
  }
] as const;

export const setupGuides = [
  {
    platform: "iOS",
    steps: ["Установите клиент.", "Откройте subscription URL из кабинета.", "Импортируйте конфиг и подключитесь."]
  },
  {
    platform: "Android",
    steps: ["Скачайте клиент.", "Вставьте subscription URL.", "Проверьте список узлов и подключитесь."]
  },
  {
    platform: "Windows",
    steps: ["Установите десктопный клиент.", "Импортируйте URL подписки.", "Настройте автозапуск при необходимости."]
  },
  {
    platform: "macOS",
    steps: ["Установите приложение клиента.", "Добавьте профиль по URL.", "Разрешите сетевые расширения."]
  },
  {
    platform: "Linux",
    steps: ["Установите CLI или GUI-клиент.", "Подключите subscription URL.", "Проверьте туннель через терминал."]
  }
] as const;
