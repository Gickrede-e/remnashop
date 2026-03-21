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
  DISABLED: "Отключена",
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
    question: "Как быстро начнёт работать VPN после оплаты?",
    answer: "Мгновенно. Доступ активируется автоматически — заходите в кабинет и подключайтесь."
  },
  {
    question: "Можно ли продлить подписку, пока она ещё активна?",
    answer: "Да. Оставшиеся дни и трафик сохраняются — новый срок добавляется сверху."
  },
  {
    question: "На каких устройствах работает GickVPN?",
    answer: "Windows, macOS, Linux, iOS, Android и роутеры. После оплаты все данные для подключения доступны в личном кабинете."
  },
  {
    question: "Какие способы оплаты доступны?",
    answer: "Банковские карты, электронные кошельки — через ЮKassa и Platega."
  },
  {
    question: "Есть ли реферальная программа?",
    answer: "Да. Приглашайте друзей по своей ссылке и получайте бонусы на счёт."
  },
  {
    question: "Что будет, если трафик закончится раньше срока?",
    answer: "Вы можете перейти на тариф с большим лимитом или продлить текущий."
  }
] as const;
