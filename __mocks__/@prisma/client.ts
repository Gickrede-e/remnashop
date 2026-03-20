export const Role = {
  USER: "USER",
  ADMIN: "ADMIN"
} as const;

export const SubscriptionStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  EXPIRED: "EXPIRED",
  CANCELED: "CANCELED"
} as const;

export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCEEDED: "SUCCEEDED",
  CANCELED: "CANCELED",
  FAILED: "FAILED"
} as const;

export const PaymentProvider = {
  YOOKASSA: "YOOKASSA",
  PLATEGA: "PLATEGA"
} as const;

export const PromoCodeType = {
  DISCOUNT_PERCENT: "DISCOUNT_PERCENT",
  DISCOUNT_FIXED: "DISCOUNT_FIXED",
  FREE_DAYS: "FREE_DAYS",
  FREE_TRAFFIC_GB: "FREE_TRAFFIC_GB"
} as const;

export class PrismaClient {
  constructor() {}
}
