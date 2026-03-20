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

export function mapPlategaStatus(status: string) {
  if (status === "confirmed" || status === "completed" || status === "succeeded") {
    return PaymentStatus.SUCCEEDED;
  }

  if (status === "cancelled" || status === "canceled") {
    return PaymentStatus.CANCELED;
  }

  if (status === "failed" || status === "expired" || status === "declined" || status === "error" || status === "chargeback") {
    return PaymentStatus.FAILED;
  }

  return PaymentStatus.PENDING;
}
