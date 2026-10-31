import { AuthScene } from "@/components/blocks/auth/auth-scene";
import { AuthStandaloneCard } from "@/components/blocks/auth/auth-standalone-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <AuthScene>
      <AuthStandaloneCard title="Восстановление пароля">
        <ForgotPasswordForm turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />
      </AuthStandaloneCard>
    </AuthScene>
  );
}
