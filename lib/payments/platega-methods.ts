// Platega payment-method ids and their checkout labels. Client-safe: checkout renders the labels.
export const PLATEGA_PAYMENT_METHOD_LABELS: Record<number, string> = {
  2: "СБП",
  10: "Карты РФ",
  13: "Крипта"
};

// Parses a comma list such as "2,10,13" into unique supported ids, keeping the invalid entries
// so env validation can name them.
export function parsePlategaPaymentMethods(input: string) {
  const methods: number[] = [];
  const invalidValues: string[] = [];

  for (const rawValue of input.split(",").map((value) => value.trim()).filter(Boolean)) {
    const method = Number(rawValue);
    if (!(method in PLATEGA_PAYMENT_METHOD_LABELS)) {
      invalidValues.push(rawValue);
    } else if (!methods.includes(method)) {
      methods.push(method);
    }
  }

  return { methods, invalidValues };
}
