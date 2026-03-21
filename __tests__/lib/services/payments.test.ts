import { PaymentStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { mapPlategaStatus, mapYooKassaStatus } from "@/lib/services/payment-status";

describe("payment status mapping", () => {
  it.each([
    ["succeeded", PaymentStatus.SUCCEEDED],
    ["canceled", PaymentStatus.CANCELED],
    ["pending", PaymentStatus.PENDING],
    ["waiting_for_capture", PaymentStatus.PENDING]
  ])("maps YooKassa status %s", (input, expected) => {
    expect(mapYooKassaStatus(input)).toBe(expected);
  });

  it.each([
    ["confirmed", PaymentStatus.SUCCEEDED],
    ["completed", PaymentStatus.SUCCEEDED],
    ["succeeded", PaymentStatus.SUCCEEDED],
    ["cancelled", PaymentStatus.CANCELED],
    ["canceled", PaymentStatus.CANCELED],
    ["failed", PaymentStatus.FAILED],
    ["expired", PaymentStatus.FAILED],
    ["declined", PaymentStatus.FAILED],
    ["error", PaymentStatus.FAILED],
    ["chargeback", PaymentStatus.FAILED],
    ["processing", PaymentStatus.PENDING]
  ])("maps Platega status %s", (input, expected) => {
    expect(mapPlategaStatus(input)).toBe(expected);
  });
});
