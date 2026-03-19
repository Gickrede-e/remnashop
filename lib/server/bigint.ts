export function toNumber(value: bigint | number | null | undefined) {
  if (value == null) {
    return null;
  }

  return typeof value === "bigint" ? Number(value) : value;
}

export function serializeBigInts<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, currentValue) => {
      if (typeof currentValue === "bigint") {
        return currentValue.toString();
      }

      return currentValue;
    })
  ) as T;
}
