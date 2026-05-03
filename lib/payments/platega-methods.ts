export const SUPPORTED_PLATEGA_PAYMENT_METHODS = [2, 10, 13] as const;

export type SupportedPlategaPaymentMethod =
  (typeof SUPPORTED_PLATEGA_PAYMENT_METHODS)[number];

export const PLATEGA_PAYMENT_METHOD_LABELS: Record<
  SupportedPlategaPaymentMethod,
  string
> = {
  2: "СБП",
  10: "Карты РФ",
  13: "Крипта"
};

export function isSupportedPlategaPaymentMethod(
  value: number
): value is SupportedPlategaPaymentMethod {
  return SUPPORTED_PLATEGA_PAYMENT_METHODS.includes(
    value as SupportedPlategaPaymentMethod
  );
}

export function parsePlategaPaymentMethods(input?: string | null) {
  const invalidValues: string[] = [];
  const methods: SupportedPlategaPaymentMethod[] = [];

  for (const rawValue of String(input ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)) {
    const parsedValue = Number(rawValue);
    if (!Number.isInteger(parsedValue) || !isSupportedPlategaPaymentMethod(parsedValue)) {
      invalidValues.push(rawValue);
      continue;
    }

    if (!methods.includes(parsedValue)) {
      methods.push(parsedValue);
    }
  }

  return {
    methods,
    invalidValues
  };
}

export function normalizePlategaPaymentMethods(input?: string | null) {
  return parsePlategaPaymentMethods(input).methods;
}

export function getPlategaPaymentMethodLabel(method: number) {
  return isSupportedPlategaPaymentMethod(method)
    ? PLATEGA_PAYMENT_METHOD_LABELS[method]
    : `Метод ${method}`;
}
