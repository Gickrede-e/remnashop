import { AuthScene } from "@/components/blocks/auth/auth-scene";
import { AuthStandaloneCard } from "@/components/blocks/auth/auth-standalone-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/auth/navigation";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams
}: {
  searchParams?: Promise<{ ref?: string; next?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const referralCode = resolvedSearchParams?.ref;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);

  return (
    <AuthScene>
      <AuthStandaloneCard title="Регистрация">
        <RegisterForm
          emailEnabled={env.EMAIL_ENABLED}
          turnstileSiteKey={env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          referralCode={referralCode}
          nextPath={nextPath}
        />
      </AuthStandaloneCard>
    </AuthScene>
  );
}
