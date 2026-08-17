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
  title: "MascoTin | Conecta con cuidadores y servicios para tu mascota",
  description:
    "Plataforma para conectar dueños de mascotas con cuidadores profesionales, servicios veterinarios y comunidad local.",
  keywords: ["MascoTin", "mascotas", "cuidadores", "veterinarios", "servicios", "comunidad"],
  authors: [{ name: "MascoTin" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "MascoTin",
    description: "Conecta con cuidadores y servicios para el bienestar de tu mascota",
    url: "https://mascotin.app",
    siteName: "MascoTin",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MascoTin",
    description: "Conecta con cuidadores y servicios para el bienestar de tu mascota",
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
        className={`${plusJakartaSans.variable} font-sans antialiased bg-slate-50`}
      >
        <ErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
