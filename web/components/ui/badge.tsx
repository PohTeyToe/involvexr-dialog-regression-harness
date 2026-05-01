import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]",
        outline: "border-[var(--border)] text-[var(--foreground)]",
        success:
          "border-transparent bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]",
        warning:
          "border-transparent bg-[color-mix(in_oklch,var(--warning)_18%,transparent)] text-[var(--warning)]",
        error:
          "border-transparent bg-[color-mix(in_oklch,var(--error)_18%,transparent)] text-[var(--error)]",
        primary:
          "border-transparent bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] text-[var(--primary)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
