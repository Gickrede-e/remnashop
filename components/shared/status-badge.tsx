import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/lib/constants";

export function SubscriptionStatusBadge({ status }: { status: keyof typeof SUBSCRIPTION_STATUS_LABELS }) {
  const variant =
    status === "ACTIVE" ? "success" : status === "PENDING" ? "secondary" : "destructive";
  return <Badge variant={variant}>{SUBSCRIPTION_STATUS_LABELS[status]}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: keyof typeof PAYMENT_STATUS_LABELS }) {
  const variant =
    status === "SUCCEEDED" ? "success" : status === "PENDING" ? "secondary" : "destructive";
  return <Badge variant={variant}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
