export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-gickvpn_session" : "gickvpn_session";

export const PAGINATION_DEFAULT_LIMIT = 20;
export const PAGINATION_MAX_LIMIT = 100;

export const PAYMENT_PROVIDER_LABELS = {
  YOOKASSA: "ЮKassa",
  // Removed provider — label kept so historical payments still render a name.
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
