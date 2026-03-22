import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-sm shadow-black/20 hover:brightness-110",
        secondary: "bg-white/10 text-foreground hover:bg-white/15",
        outline: "border border-white/15 bg-transparent hover:bg-white/5",
        ghost: "hover:bg-white/5 hover:text-foreground",
        destructive: "bg-red-500/90 text-white hover:bg-red-500"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-11 rounded-xl px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11 rounded-xl"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
