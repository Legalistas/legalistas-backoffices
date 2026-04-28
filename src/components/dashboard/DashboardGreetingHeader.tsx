"use client";

import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import AttendanceHeaderIndicator from "@/components/attendance/AttendanceHeaderIndicator";
import { Button } from "@/components/ui/button";

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Buenos días";
	if (hour < 19) return "Buenas tardes";
	return "Buenas noches";
}

function formatDate(): string {
	return new Date()
		.toLocaleDateString("es-AR", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		})
		.replace(/^\w/, (c) => c.toUpperCase());
}

interface DashboardGreetingHeaderProps {
	subtitle?: ReactNode;
	onRefresh?: () => void;
	lastUpdated?: string;
	isRefreshing?: boolean;
}

export default function DashboardGreetingHeader({
	subtitle,
	onRefresh,
	lastUpdated,
	isRefreshing,
}: DashboardGreetingHeaderProps) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">{getGreeting()}</h1>
				<p className="text-sm text-muted-foreground mt-1">{formatDate()}</p>
				{subtitle && (
					<p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
				)}
				<div className="mt-3">
					<AttendanceHeaderIndicator />
				</div>
			</div>
			{onRefresh && (
				<div className="flex flex-col items-end gap-1 shrink-0">
					<Button
						variant="outline"
						onClick={onRefresh}
						disabled={isRefreshing}
					>
						<RefreshCw
							className={`size-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
						/>
						Actualizar
					</Button>
					{lastUpdated && (
						<span className="text-xs text-muted-foreground">{lastUpdated}</span>
					)}
				</div>
			)}
		</div>
	);
}
