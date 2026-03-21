import { AuthEntryPanel } from "@/components/blocks/auth/auth-entry-panel";
import { RegisterForm } from "@/components/auth/register-form";
import { sanitizeNextPath } from "@/lib/auth/navigation";

export default async function RegisterPage({
  searchParams
}: {
  searchParams?: Promise<{ ref?: string; next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const referralCode = resolvedSearchParams?.ref;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);

  return (
    <div className="container flex min-h-dvh items-center justify-center px-4 py-8 sm:py-10">
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
  );
}
