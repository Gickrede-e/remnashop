import { AuthStandaloneCard } from "@/components/blocks/auth/auth-standalone-card";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/auth/navigation";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);

  return (
    <main className="authScene">
      <div className="authSceneViewport">
        <AuthStandaloneCard
          title="Вход в кабинет"
          description="Используйте email и пароль, чтобы войти в кабинет."
        >
          <LoginForm nextPath={nextPath} />
        </AuthStandaloneCard>
      </div>
    </main>
  );
}
