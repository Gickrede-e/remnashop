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

// Platega transaction statuses: PENDING, CONFIRMED, CANCELED, CHARGEBACKED.
export function mapPlategaStatus(status: string) {
  if (status === "confirmed") {
    return PaymentStatus.SUCCEEDED;
  }

  if (status === "canceled") {
    return PaymentStatus.CANCELED;
  }

  if (status === "chargebacked") {
    return PaymentStatus.FAILED;
  }

  return PaymentStatus.PENDING;
}
