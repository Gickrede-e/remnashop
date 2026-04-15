import { PaymentProvider } from "@prisma/client";

import { PAYMENT_PROVIDER_LABELS } from "@/lib/constants";

export type PaymentProviderFlags = Record<PaymentProvider, boolean>;

export const ALL_PAYMENT_PROVIDERS = Object.values(PaymentProvider) as PaymentProvider[];

export function isPaymentProviderEnabled(
  provider: PaymentProvider,
  flags: PaymentProviderFlags
) {
  return Boolean(flags[provider]);
}

export function getEnabledPaymentProviders(flags: PaymentProviderFlags) {
  return ALL_PAYMENT_PROVIDERS.filter((provider) => isPaymentProviderEnabled(provider, flags));
}

export function getPaymentProviderLabel(provider: PaymentProvider) {
  return PAYMENT_PROVIDER_LABELS[provider];
}
