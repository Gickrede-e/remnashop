import { AuthEntryPanel } from "@/components/blocks/auth/auth-entry-panel";
import { LoginForm } from "@/components/auth/login-form";
import { sanitizeNextPath } from "@/lib/auth/navigation";
import { publicEnv } from "@/lib/public-env";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);

  return (
    <div className="container flex min-h-dvh items-center justify-center px-4 py-8 sm:py-10">
      <AuthEntryPanel
        title="Вход в кабинет"
        description="Используйте email и пароль или Telegram, если он уже подключен к аккаунту."
        activeView="login"
        nextPath={nextPath}
      >
        <LoginForm telegramUsername={publicEnv.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME} nextPath={nextPath} />
      </AuthEntryPanel>
    </div>
  );
}
