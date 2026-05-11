"use client";

import {
	AlertTriangle,
	Calendar,
	CheckCheck,
	CheckCircle,
	FileText,
	Info,
	Scale,
	Settings,
	SquareKanban,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Notification } from "@/components/notification-provider";
import { useNotifications } from "@/components/notification-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow, formatLocalDateTime } from "@/utils/format";

interface NotificationCardProps {
	notification: Notification;
}

export default function NotificationCard({
	notification,
}: NotificationCardProps) {
	const { markNotificationAsRead } = useNotifications();
	const [relativeDate, setRelativeDate] = useState<string>("");
	const [localDate, setLocalDate] = useState<string>("");

	useEffect(() => {
		try {
			setRelativeDate(formatDistanceToNow(notification.createdAt));
			setLocalDate(formatLocalDateTime(notification.createdAt));
		} catch (error) {
			console.error("Error formatting dates:", error);
			setRelativeDate("fecha desconocida");
			setLocalDate("fecha desconocida");
		}
	}, [notification.createdAt]);

	const handleMarkAsRead = () => {
		markNotificationAsRead(notification.id);
	};

	const getIcon = () => {
		switch (notification.type) {
			case "system":
				return <Settings className="h-5 w-5 text-blue-500" />;
			case "crm":
				return <SquareKanban className="h-5 w-5 text-purple-500" />;
			case "cases":
				return <Scale className="h-5 w-5 text-amber-500" />;
			case "causes_files":
				return <FileText className="h-5 w-5 text-green-500" />;
			case "events":
				return <Calendar className="h-5 w-5 text-indigo-500" />;
			case "success":
				return <CheckCircle className="h-5 w-5 text-green-500" />;
			case "warning":
				return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
			case "error":
				return <AlertTriangle className="h-5 w-5 text-red-500" />;
			case "normal":
			case "info":
			default:
				return <Info className="h-5 w-5 text-blue-500" />;
		}
	};

	const getTypeLabel = () => {
		switch (notification.type) {
			case "system":
				return "Sistema";
			case "crm":
				return "CRM";
			case "cases":
				return "Casos";
			case "causes_files":
				return "Archivos";
			case "events":
				return "Eventos";
			case "success":
				return "Éxito";
			case "warning":
				return "Advertencia";
			case "error":
				return "Error";
			case "normal":
				return "Normal";
			case "info":
				return "Info";
			default:
				return notification.type;
		}
	};

	const getTypeColor = () => {
		switch (notification.type) {
			case "system":
				return "bg-blue-100 text-blue-800";
			case "crm":
				return "bg-purple-100 text-purple-800";
			case "cases":
				return "bg-amber-100 text-amber-800";
			case "causes_files":
				return "bg-green-100 text-green-800";
			case "events":
				return "bg-indigo-100 text-indigo-800";
			case "success":
				return "bg-green-100 text-green-800";
			case "warning":
				return "bg-yellow-100 text-yellow-800";
			case "error":
				return "bg-red-100 text-red-800";
			case "normal":
			case "info":
			default:
				return "bg-blue-100 text-blue-800";
		}
	};

	return (
		<Card
			className={`overflow-hidden transition-all ${notification.read ? "bg-background" : "bg-muted/30"}`}
		>
			<CardContent className="p-4">
				<div className="flex items-start gap-4">
					<div className="mt-1">{getIcon()}</div>
					<div className="flex-1 min-w-0">
						<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
							<div className="flex items-center gap-2">
								<span
									className={`text-xs px-2 py-1 rounded-full ${getTypeColor()} font-medium`}
								>
									{getTypeLabel()}
								</span>
								{!notification.read && (
									<span
										className="inline-block w-2 h-2 rounded-full bg-blue-500"
										title="No leída"
									></span>
								)}
							</div>
							<span className="text-xs text-muted-foreground" title={localDate}>
								{relativeDate}
							</span>
						</div>
						<p
							className={`text-sm whitespace-pre-wrap wrap-break-word ${notification.read ? "" : "font-medium"}`}
						>
							{notification.message}
						</p>
						{!notification.read && (
							<div className="flex justify-end mt-3">
								<Button
									variant="outline"
									size="sm"
									onClick={handleMarkAsRead}
								>
									<CheckCheck className="h-4 w-4 mr-1.5" />
									Marcar como leída
								</Button>
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
