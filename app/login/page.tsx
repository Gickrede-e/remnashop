import { LoginForm } from "@/components/auth/login-form";
import { sanitizeNextPath } from "@/lib/auth/navigation";
import { env } from "@/lib/env";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-16">
      <LoginForm telegramUsername={env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME} nextPath={nextPath} />
    </div>
  );
}
