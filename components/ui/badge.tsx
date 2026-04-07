import { cn } from "@/lib/utils";

const BADGE_VARIANTS = {
  default: "badgeDefault",
  secondary: "badgeSecondary",
  success: "badgeSuccess",
  muted: "badgeMuted",
  destructive: "badgeDestructive"
} as const;

type BadgeVariant = keyof typeof BADGE_VARIANTS;

export function badgeVariants({ variant = "default", className }: { variant?: BadgeVariant; className?: string } = {}) {
  return cn("badge", BADGE_VARIANTS[variant], className);
}

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return <div className={badgeVariants({ variant, className })} {...props} />;
}
