import { PaymentStatus } from "@prisma/client";

const finalStatuses = new Set<PaymentStatus>([
  PaymentStatus.SUCCEEDED,
  PaymentStatus.FAILED,
  PaymentStatus.CANCELED
]);

export function isFinalPaymentStatus(status: PaymentStatus) {
  return finalStatuses.has(status);
}
