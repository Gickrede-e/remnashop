import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SubscriptionStatusBadge({ status }: { status: keyof typeof SUBSCRIPTION_STATUS_LABELS }) {
  const variant =
    status === "ACTIVE"
      ? "success"
      : status === "PENDING"
        ? "secondary"
      : status === "DISABLED"
          ? "muted"
          : "destructive";
  return (
    <Badge
      variant={variant}
      className={cn(
        "statusBadge",
        status === "ACTIVE" && "statusBadgeActive",
        status === "PENDING" && "statusBadgePending",
        status === "DISABLED" && "statusBadgeDisabled",
        status === "EXPIRED" && "statusBadgeExpired"
      )}
    >
      {SUBSCRIPTION_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: keyof typeof PAYMENT_STATUS_LABELS }) {
  const variant =
    status === "SUCCEEDED" ? "success" : status === "PENDING" ? "secondary" : "destructive";
  return (
    <Badge
      variant={variant}
      className={cn(
        "statusBadge",
        status === "SUCCEEDED" && "statusBadgeActive",
        status === "PENDING" && "statusBadgePending",
        status === "CANCELED" && "statusBadgeExpired"
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
