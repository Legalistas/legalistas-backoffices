import type { Metadata, Viewport } from 'next'
import { Outfit } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-outfit-sans",
  subsets: ["latin"],
});
 

export const metadata: Metadata = {
  title: 'BackOffices - Legalistas',
  description: 'Panel Administrativo de Legalistas',
  applicationName: 'Legalistas BackOffices',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Legalistas',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    apple: [
      { url: '/images/logo/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/images/logo/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <Providers>{children}</Providers>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
