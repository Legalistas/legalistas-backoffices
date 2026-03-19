"use client";

import {
	AlertTriangle,
	Bell,
	Briefcase,
	Calendar,
	CheckCircle,
	FileText,
	Folder,
	Info,
	Settings,
	Users,
} from "lucide-react";
import type React from "react";
import type { Notification } from "@/components/notification-provider";
import { Card, CardContent } from "@/components/ui/card";

interface NotificationStatsProps {
	notifications: Notification[];
}

export default function NotificationStats({
	notifications,
}: NotificationStatsProps) {
	const totalCount = notifications.length;
	const unreadCount = notifications.filter((n) => !n.read).length;
	const readCount = totalCount - unreadCount;

	// Contadores para tipos estándar
	const infoCount = notifications.filter(
		(n) => n.type === "info" || n.type === "normal",
	).length;
	const successCount = notifications.filter((n) => n.type === "success").length;
	const warningCount = notifications.filter((n) => n.type === "warning").length;
	const errorCount = notifications.filter((n) => n.type === "error").length;

	// Contadores para tipos específicos
	const systemCount = notifications.filter((n) => n.type === "system").length;
	const crmCount = notifications.filter((n) => n.type === "crm").length;
	const casesCount = notifications.filter((n) => n.type === "cases").length;
	const causesFilesCount = notifications.filter(
		(n) => n.type === "causes_files",
	).length;
	const expedienteCount = notifications.filter(
		(n) => n.type === "expediente",
	).length;
	const eventsCount = notifications.filter((n) => n.type === "events").length;

	return (
		<div className="space-y-6">
			{/* Estadísticas generales */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					icon={<Bell className="h-5 w-5 text-blue-500" />}
					title="Total"
					value={totalCount}
					description={`${unreadCount} no leídas`}
					color="blue"
				/>
				<StatCard
					icon={<Info className="h-5 w-5 text-blue-500" />}
					title="Información"
					value={infoCount}
					description="Notificaciones informativas"
					color="blue"
				/>
				<StatCard
					icon={<CheckCircle className="h-5 w-5 text-green-500" />}
					title="Éxito"
					value={successCount}
					description="Operaciones exitosas"
					color="green"
				/>
				<StatCard
					icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
					title="Advertencias"
					value={warningCount + errorCount}
					description={`${warningCount} advertencias, ${errorCount} errores`}
					color="yellow"
				/>
			</div>

			{/* Estadísticas por tipo específico */}
			<h3 className="text-lg font-medium mt-6 mb-3">Por categoría</h3>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				<StatCard
					icon={<Settings className="h-5 w-5 text-blue-500" />}
					title="Sistema"
					value={systemCount}
					description="Notificaciones del sistema"
					color="blue"
				/>
				<StatCard
					icon={<Users className="h-5 w-5 text-purple-500" />}
					title="CRM"
					value={crmCount}
					description="Gestión de clientes"
					color="purple"
				/>
				<StatCard
					icon={<Briefcase className="h-5 w-5 text-amber-500" />}
					title="Casos"
					value={casesCount}
					description="Notificaciones de casos"
					color="amber"
				/>
				<StatCard
					icon={<FileText className="h-5 w-5 text-green-500" />}
					title="Archivos"
					value={causesFilesCount}
					description="Archivos de causas"
					color="green"
				/>
				{/* <StatCard
                    icon={<Folder className="h-5 w-5 text-red-500" />}
                    title="Expediente"
                    value={expedienteCount}
                    description="Notificaciones de expedientes"
                    color="red"
                /> */}
				<StatCard
					icon={<Calendar className="h-5 w-5 text-indigo-500" />}
					title="Eventos"
					value={eventsCount}
					description="Calendario y eventos"
					color="indigo"
				/>
			</div>
		</div>
	);
}

interface StatCardProps {
	icon: React.ReactNode;
	title: string;
	value: number;
	description: string;
	color: "blue" | "green" | "yellow" | "red" | "purple" | "amber" | "indigo";
}

function StatCard({ icon, title, value, description, color }: StatCardProps) {
	const colorClasses = {
		blue: "bg-blue-50 border-blue-100",
		green: "bg-green-50 border-green-100",
		yellow: "bg-yellow-50 border-yellow-100",
		red: "bg-red-50 border-red-100",
		purple: "bg-purple-50 border-purple-100",
		amber: "bg-amber-50 border-amber-100",
		indigo: "bg-indigo-50 border-indigo-100",
	};

	return (
		<Card className={`border ${colorClasses[color]}`}>
			<CardContent className="p-4">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm font-medium text-muted-foreground">{title}</p>
						<p className="text-2xl font-bold">{value}</p>
						<p className="text-xs text-muted-foreground mt-1">{description}</p>
					</div>
					<div className="p-2 rounded-full bg-white shadow-sm">{icon}</div>
				</div>
			</CardContent>
		</Card>
	);
}
