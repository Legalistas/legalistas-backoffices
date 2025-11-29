import type { Metadata } from 'next'
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
  icons: {
    icon: '/favicon.ico',
  },
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
