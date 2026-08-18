import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/25 focus-visible:ring-[3px] active:translate-y-px aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground hover:bg-accent-hover active:bg-lime-600",
        brand:
          "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-teal-800",
        tonal:
          "bg-primary-soft text-primary hover:bg-teal-100 active:bg-teal-200",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border border-primary bg-surface text-primary hover:bg-primary-soft active:bg-teal-100",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-teal-100 active:bg-teal-200",
        ghost:
          "text-foreground hover:bg-primary-soft hover:text-primary active:bg-teal-100",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 py-2 has-[>svg]:px-3",
        sm: "min-h-10 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "min-h-12 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-11 gap-0 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
