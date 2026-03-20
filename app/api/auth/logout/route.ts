import { clearSessionCookie } from "@/lib/auth/session";
import { apiOk } from "@/lib/http";

export async function POST() {
  await clearSessionCookie();
  return apiOk({ success: true });
}
