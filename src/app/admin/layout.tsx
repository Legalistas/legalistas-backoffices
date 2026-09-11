"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import AnniversaryGreeting from "@/components/celebrations/AnniversaryGreeting";
import Header from "@/components/layout/Header";
import LayoutSidebar from "@/components/layout/Sidebar";
import { NotificationProvider } from "@/components/notification-provider";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { cn } from "@/lib/utils";

// Necesita estar dentro de <SidebarProvider> para leer el estado — por eso
// no puede ser el propio AdminLayout el que llame a useSidebar().
function AdminContent({ children }: { children: React.ReactNode }) {
	const { state } = useSidebar();
	return (
		<div className="flex-1 overflow-auto min-w-0">
			<div
				className={cn(
					state === "collapsed"
						? "w-full px-4"
						: "w-full p-6",
				)}
			>
				{children}
			</div>
		</div>
	);
}

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, status } = useSession();
	const router = useRouter();

	useSessionTracker();

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/signin");
		}
	}, [status, router]);

	if (!session) return null;

	const userId = Number(session.user.id);
	if (!userId) return null;

	// Chat (ChatProvider + FloatingChatBubble) y control de asistencia
	// (AttendanceProvider + AttendanceChecker + timer del header) quitados del
	// panel. Los componentes y el backend siguen existiendo.
	return (
		<NotificationProvider>
			<SidebarProvider>
				<LayoutSidebar />
				<SidebarInset>
					<Header />
					<AnniversaryGreeting />
					<AdminContent>{children}</AdminContent>
				</SidebarInset>
			</SidebarProvider>
			<Toaster />
		</NotificationProvider>
	);
}
