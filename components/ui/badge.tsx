import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.14em]",
  {
    variants: {
      variant: {
        default: "border-violet-400/30 bg-violet-500/10 text-violet-200",
        secondary: "border-blue-400/30 bg-blue-500/10 text-blue-200",
        success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
        muted: "border-white/10 bg-white/5 text-muted-foreground",
        destructive: "border-red-400/30 bg-red-500/10 text-red-200"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
