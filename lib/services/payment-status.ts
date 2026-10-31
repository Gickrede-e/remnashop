import { PaymentStatus } from "@prisma/client";

export function mapYooKassaStatus(status: string) {
  if (status === "succeeded") {
    return PaymentStatus.SUCCEEDED;
  }

  if (status === "canceled") {
    return PaymentStatus.CANCELED;
  }

  return PaymentStatus.PENDING;
}
