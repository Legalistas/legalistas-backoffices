"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import AttendanceChecker from "@/components/attendance/AttendanceChecker";
import FloatingChatBubble from "@/components/FloatingChatBubble";
import Header from "@/components/layout/Header";
import LayoutSidebar from "@/components/layout/Sidebar";
import { NotificationProvider } from "@/components/notification-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ChatProvider } from "@/context/ChatContext";
import { useSessionTracker } from "@/hooks/useSessionTracker";

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

	return (
		<ChatProvider userId={userId}>
			<NotificationProvider>
				<SidebarProvider>
					<LayoutSidebar />
					<SidebarInset>
						<Header />
						<div className="flex-1 overflow-auto">
							<div className="p-4 mx-auto max-w-screen-2xl md:p-6">
								{children}
							</div>
						</div>
					</SidebarInset>
				</SidebarProvider>
				<FloatingChatBubble />
				<AttendanceChecker />
				<Toaster />
			</NotificationProvider>
		</ChatProvider>
	);
}
