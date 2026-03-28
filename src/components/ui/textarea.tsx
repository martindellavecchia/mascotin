import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-gray-200 placeholder:text-gray-400 focus-visible:border-teal-500 focus-visible:ring-teal-500/20 aria-invalid:ring-red-500/20 aria-invalid:border-red-500 flex field-sizing-content min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-base shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-gray-300",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
