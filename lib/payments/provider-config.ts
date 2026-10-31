import "server-only";

import { PaymentProvider } from "@prisma/client";

import { env } from "@/lib/env";

// YooKassa is the only live provider. PLATEGA survives in the enum for
// historical rows only and is never offered at checkout or accepted by
// createPaymentForUser.
export function getEnabledPaymentProvidersFromEnv(): PaymentProvider[] {
  return env.YOOKASSA_ENABLED ? [PaymentProvider.YOOKASSA] : [];
}

export function isPaymentProviderEnabledFromEnv(provider: PaymentProvider) {
  return getEnabledPaymentProvidersFromEnv().includes(provider);
}
