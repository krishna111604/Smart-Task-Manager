import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Category variants
        scheduling: "border-transparent bg-category-scheduling/20 text-category-scheduling",
        finance: "border-transparent bg-category-finance/20 text-category-finance",
        technical: "border-transparent bg-category-technical/20 text-category-technical",
        safety: "border-transparent bg-category-safety/20 text-category-safety",
        general: "border-transparent bg-category-general/20 text-category-general",
        // Priority variants
        high: "border-transparent bg-priority-high/20 text-priority-high",
        medium: "border-transparent bg-priority-medium/20 text-priority-medium",
        low: "border-transparent bg-priority-low/20 text-priority-low",
        // Status variants
        pending: "border-transparent bg-status-pending/20 text-status-pending",
        in_progress: "border-transparent bg-status-in-progress/20 text-status-in-progress",
        completed: "border-transparent bg-status-completed/20 text-status-completed",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
