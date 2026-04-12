import "server-only";

import { PaymentProvider } from "@prisma/client";

import { env } from "@/lib/env";
import {
  getEnabledPaymentProviders,
  isPaymentProviderEnabled,
  type PaymentProviderFlags
} from "@/lib/payments/providers";

export function getPaymentProviderFlagsFromEnv(): PaymentProviderFlags {
  return {
    [PaymentProvider.YOOKASSA]: env.YOOKASSA_ENABLED,
    [PaymentProvider.PLATEGA]: env.PLATEGA_ENABLED
  };
}

export function getEnabledPaymentProvidersFromEnv() {
  return getEnabledPaymentProviders(getPaymentProviderFlagsFromEnv());
}

export function isPaymentProviderEnabledFromEnv(provider: PaymentProvider) {
  return isPaymentProviderEnabled(provider, getPaymentProviderFlagsFromEnv());
}
