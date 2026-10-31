import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk } from "@/lib/http";
import { logAdminAction } from "@/lib/services/admin-logs";
import { refreshPaymentStatus } from "@/lib/services/payments";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: Params) {
  let paymentId = "UNKNOWN";
  let adminId: string | null = null;

  try {
    const { id } = await params;
    paymentId = id;
    const session = await requireApiAdminSession();
    adminId = session.userId;
    const payment = await refreshPaymentStatus(id);

    await logAdminAction({
      adminId: session.userId,
      action: "REFRESH_PAYMENT_STATUS",
      targetType: "PAYMENT",
      targetId: id,
      details: {
        status: payment.status,
        provider: payment.provider
      }
    });

    return apiOk(payment);
  } catch (error) {
    // Anyone can POST here; only audit failures once the caller is a verified admin.
    if (adminId) {
      await logAdminAction({
        adminId,
        action: "REFRESH_PAYMENT_STATUS_FAILED",
        targetType: "PAYMENT",
        targetId: paymentId,
        details: {
          error: error instanceof Error ? error.message : "Unknown refresh error"
        }
      }).catch(() => null);
    }
    return apiErrorFrom(error, "Не удалось проверить статус платежа");
  }
}
