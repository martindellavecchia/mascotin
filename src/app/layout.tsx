import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Huella | Comunidad, cuidado y encuentros para mascotas",
  description:
    "Una red cercana para conocer mascotas, coordinar ayuda, participar en comunidad y encontrar servicios confiables.",
  keywords: ["Huella", "mascotas", "hogares de tránsito", "adopción", "servicios", "comunidad"],
  authors: [{ name: "Huella" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/huella-logo.png", sizes: "any", type: "image/png" }],
    apple: "/brand/huella-logo.png",
  },
  openGraph: {
    title: "Huella",
    description: "Comunidad, cuidado y encuentros para mascotas",
    url: "https://mascotin.app",
    siteName: "Huella",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Huella",
    description: "Comunidad, cuidado y encuentros para mascotas",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} bg-background font-sans text-foreground antialiased`}
      >
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
        {process.env.VERCEL ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
