import { AuthStandaloneCard } from "@/components/blocks/auth/auth-standalone-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="authScene">
      <div className="authSceneViewport">
        <AuthStandaloneCard title="Восстановление пароля">
          <ForgotPasswordForm />
        </AuthStandaloneCard>
      </div>
    </main>
  );
}
