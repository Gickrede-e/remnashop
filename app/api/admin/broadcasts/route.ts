import { requireApiAdminSession } from "@/lib/api-session";
import { apiErrorFrom, apiOk, parseRequestBody } from "@/lib/http";
import { emailBroadcastSchema } from "@/lib/schemas/admin";
import { logger, serializeError } from "@/lib/server/logger";
import { logAdminAction } from "@/lib/services/admin-logs";
import { sendEmailBroadcast } from "@/lib/services/email-broadcasts";

export async function POST(request: Request) {
  try {
    const session = await requireApiAdminSession();
    const body = await parseRequestBody(request, emailBroadcastSchema);
    const summary = await sendEmailBroadcast(body);

    // The mail is already out, so a failed audit write must not turn the response into an error.
    try {
      await logAdminAction({
        adminId: session.userId,
        action: "SEND_EMAIL_BROADCAST",
        targetType: "EMAIL_BROADCAST",
        targetId: body.audience === "ONE" ? body.email : body.audience,
        details: {
          audience: body.audience,
          subject: body.subject,
          text: body.text,
          total: summary.total,
          sent: summary.sent,
          failed: summary.failed,
          failedEmails: summary.failedEmails
        }
      });
    } catch (error) {
      logger.error("admin_log.write_failed", {
        action: "SEND_EMAIL_BROADCAST",
        adminId: session.userId,
        error: serializeError(error)
      });
    }

    return apiOk(summary);
  } catch (error) {
    return apiErrorFrom(error, "Не удалось отправить рассылку");
  }
}
