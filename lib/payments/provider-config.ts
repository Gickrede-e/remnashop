import "server-only";

import { PaymentProvider } from "@prisma/client";

import { env } from "@/lib/env";

export function getEnabledPaymentProvidersFromEnv(): PaymentProvider[] {
  return [
    ...(env.YOOKASSA_ENABLED ? [PaymentProvider.YOOKASSA] : []),
    ...(env.PLATEGA_ENABLED ? [PaymentProvider.PLATEGA] : [])
  ];
}

export function isPaymentProviderEnabledFromEnv(provider: PaymentProvider) {
  return getEnabledPaymentProvidersFromEnv().includes(provider);
}
