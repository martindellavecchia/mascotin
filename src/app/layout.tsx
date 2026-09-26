import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SITE_URL } from "@/lib/site-url";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Huella | Comunidad, cuidado y encuentros para mascotas",
    template: "%s | Huella",
  },
  description:
    "Una red cercana para conocer mascotas, coordinar ayuda, participar en comunidad y encontrar servicios confiables.",
  keywords: ["Huella", "mascotas", "hogares de tránsito", "adopción", "servicios", "comunidad"],
  authors: [{ name: "Huella" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Huella",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=huella-1", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/icons/favicon-32.png?v=huella-1", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=huella-1",
    apple: [{ url: "/icons/apple-touch-icon.png?v=huella-1", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Huella",
    description: "Comunidad, cuidado y encuentros para mascotas",
    url: "/",
    siteName: "Huella",
    locale: "es_AR",
    type: "website",
    images: [{ url: "/images/hero-dogs.webp", alt: "Dos perros jugando al aire libre" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Huella",
    description: "Comunidad, cuidado y encuentros para mascotas",
    images: ["/images/hero-dogs.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#4b244a",
  width: "device-width",
  initialScale: 1,
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
