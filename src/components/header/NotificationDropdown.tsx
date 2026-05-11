"use client";
import {
	AlertTriangle,
	Bell,
	Calendar,
	CheckCircle,
	FileText,
	Info,
	RefreshCcw,
	Scale,
	Settings,
	SquareKanban,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDistanceToNow } from "@/utils/format";
import { useNotifications } from "../notification-provider";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/shared/Dropdown";

export interface Notification {
	id: number;
	message: string;
	type: string;
	link?: string | null;
	read: boolean;
	userId: number;
	createdAt: string;
	updatedAt: string;
}

export default function NotificationDropdown() {
	const router = useRouter();
	const {
		unreadCount,
		refreshNotifications,
		notifications,
		loading,
		markNotificationAsRead,
	} = useNotifications();
	const [isOpen, setIsOpen] = useState(false);
	const [notifying, setNotifying] = useState(true);

	function toggleDropdown() {
		setIsOpen(!isOpen);
	}

	function closeDropdown() {
		setIsOpen(false);
	}

	const handleClick = () => {
		toggleDropdown();
		setNotifying(false);
	};

	const handleNotificationClick = (notification: Notification) => {
		closeDropdown();
		if (!notification.read) {
			markNotificationAsRead(notification.id);
		}
		if (notification.link) {
			router.push(notification.link);
		} else {
			router.push("/admin/notifications");
		}
	};

	const getIcon = (type: string) => {
		switch (type) {
			case "system":
				return <Settings className="h-4 w-4 text-blue-500" />;
			case "crm":
				return <SquareKanban className="h-4 w-4 text-purple-500" />;
			case "cases":
				return <Scale className="h-4 w-4 text-amber-500" />;
			case "causes_files":
				return <FileText className="h-4 w-4 text-green-500" />;
			case "events":
				return <Calendar className="h-4 w-4 text-indigo-500" />;
			case "success":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "warning":
				return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
			case "error":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			case "normal":
			case "info":
			default:
				return <Info className="h-4 w-4 text-blue-500" />;
		}
	};

	return (
		<div className="relative">
			<button
				className="relative dropdown-toggle flex items-center justify-center size-10 rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				onClick={handleClick}
			>
				{unreadCount > 0 && (
					<span
						className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 flex`}
					>
						<span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
					</span>
				)}
				<Bell className="w-5 h-5" />
			</button>
			<Dropdown
				isOpen={isOpen}
				onClose={closeDropdown}
				className="absolute -right-[240px] mt-[17px] z-9999 flex w-[320px] flex-col rounded-xl border border-border bg-card p-0 shadow-lg lg:right-0"
			>
				<div className="flex items-center justify-between px-4 py-3 border-b border-border">
					<h5 className="text-sm font-semibold text-foreground">
						Notificaciones{" "}
						{unreadCount > 0 && (
							<span className="text-xs font-normal text-muted-foreground">
								({unreadCount})
							</span>
						)}
					</h5>
					<div className="flex gap-1">
						<button
							className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
							onClick={() => refreshNotifications()}
						>
							<RefreshCcw className="w-4 h-4" />
						</button>
						<button
							onClick={toggleDropdown}
							className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				</div>
				<ul className="flex flex-col max-h-[300px] overflow-y-auto">
					{loading ? (
						<div className="flex justify-center py-6 text-sm text-muted-foreground">
							Cargando...
						</div>
					) : notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-6 text-center px-4">
							<Bell className="h-8 w-8 text-muted-foreground mb-2" />
							<p className="text-sm font-medium text-foreground">Sin notificaciones</p>
							<p className="text-xs text-muted-foreground">
								Aparecerán aquí cuando las recibas.
							</p>
						</div>
					) : (
						notifications.map((notification: Notification) => (
							<li key={String(notification.id)}>
								<button
									type="button"
									onClick={() => handleNotificationClick(notification)}
									className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-muted border-b border-border last:border-b-0 transition-colors"
								>
									<span className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted mt-0.5">
										{getIcon(notification.type)}
									</span>
									<span className="flex-1 min-w-0">
										<p
											className={`text-xs leading-snug text-foreground text-left line-clamp-2 ${notification.read ? "" : "font-medium"}`}
										>
											{notification.message}
										</p>
										<span className="text-[11px] text-muted-foreground mt-0.5 block text-left">
											{formatDistanceToNow(
												new Date(notification.createdAt).getTime(),
											)}
										</span>
									</span>
									{!notification.read && (
										<span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
									)}
								</button>
							</li>
						))
					)}
				</ul>
				<div className="border-t border-border p-2">
					{notifications.length === 0 ? (
						<Button
							variant="default"
							size="sm"
							className="w-full"
							onClick={() => refreshNotifications()}
						>
							Actualizar
						</Button>
					) : (
						<Link
							href="/admin/notifications"
							className="block py-1.5 text-xs font-medium text-center text-primary hover:underline"
							onClick={closeDropdown}
						>
							Ver todas las notificaciones
						</Link>
					)}
				</div>
			</Dropdown>
		</div>
	);
}
