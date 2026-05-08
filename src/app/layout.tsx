import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { Providers } from "./providers";

const outfit = Outfit({
	variable: "--font-outfit-sans",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "BackOffices - Legalistas",
	description: "Panel Administrativo de Legalistas",
	applicationName: "Legalistas BackOffices",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Legalistas",
	},
	formatDetection: {
		telephone: false,
	},
	icons: {
		icon: "/favicon.ico",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

// Hola

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es">
			<body className={`${outfit.variable} font-sans dark:bg-gray-900 antialiased`}>
				<ThemeProvider>
					<Providers>{children}</Providers>
				</ThemeProvider>
			</body>
		</html>
	);
}
