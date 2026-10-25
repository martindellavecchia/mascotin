"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--color-surface)",
          "--normal-text": "var(--color-foreground)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-lg)",
          fontFamily: "var(--font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "shadow-md", description: "text-muted-foreground" } }}
      {...props}
    />
  )
}

export { Toaster }
