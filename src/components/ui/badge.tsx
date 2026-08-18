import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-semibold transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary-soft text-primary [a&]:hover:bg-teal-100",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-teal-100",
        verified:
          "border-info/20 bg-info/10 text-info",
        success:
          "border-success/20 bg-success/10 text-success",
        warning:
          "border-warning/20 bg-warning/10 text-warning",
        info:
          "border-info/20 bg-info/10 text-info",
        neutral:
          "border-border bg-surface-soft text-muted-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive [a&]:hover:bg-destructive/15",
        outline:
          "border-border text-foreground [a&]:hover:bg-primary-soft [a&]:hover:text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
