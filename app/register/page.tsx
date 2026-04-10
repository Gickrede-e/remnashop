import { AuthEntryPanel } from "@/components/blocks/auth/auth-entry-panel";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession } from "@/lib/auth/session";
import { sanitizeNextPath } from "@/lib/auth/navigation";
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
    <main className="authScene">
      <div className="authSceneViewport">
        <AuthEntryPanel
          title="Создание аккаунта"
          description="Новый аккаунт сразу открывает доступ к покупке, продлению и управлению подпиской."
          activeView="register"
          nextPath={nextPath}
          referralCode={referralCode}
        >
          <RegisterForm referralCode={referralCode} nextPath={nextPath} />
        </AuthEntryPanel>
      </div>
    </main>
  );
}
