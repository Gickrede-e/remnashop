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
    <div className="container flex min-h-[70vh] items-center justify-center py-16">
      <RegisterForm referralCode={referralCode} nextPath={nextPath} />
    </div>
  );
}
