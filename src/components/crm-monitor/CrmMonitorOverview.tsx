"use client";

import { AlertTriangle, Bell, ShieldAlert, UserMinus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { MonitorReportResponse } from "@/types/crm-monitor";

interface Props {
	data: MonitorReportResponse | null;
}

// 4 tarjetas de resumen: total, críticas, warnings, sin responsable asignado.
export function CrmMonitorOverview({ data }: Props) {
	const total = data?.totals.all ?? 0;
	const critical = data?.totals.bySeverity.critical ?? 0;
	const warn = data?.totals.bySeverity.warn ?? 0;
	const unassigned =
		data?.byResponsible.find((b) => b.userId === null)?.count ?? 0;

	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-4">
			<Kpi
				icon={<Bell className="h-4 w-4" />}
				label="Alertas de la semana"
				value={total}
				tone="neutral"
			/>
			<Kpi
				icon={<ShieldAlert className="h-4 w-4" />}
				label="Críticas"
				value={critical}
				tone="critical"
			/>
			<Kpi
				icon={<AlertTriangle className="h-4 w-4" />}
				label="Advertencias"
				value={warn}
				tone="warn"
			/>
			<Kpi
				icon={<UserMinus className="h-4 w-4" />}
				label="Sin responsable"
				value={unassigned}
				tone="neutral"
			/>
		</div>
	);
}

function Kpi({
	icon,
	label,
	value,
	tone,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
	tone: "neutral" | "warn" | "critical";
}) {
	const toneClass =
		tone === "critical"
			? "text-red-600"
			: tone === "warn"
				? "text-amber-600"
				: "text-slate-700";
	return (
		<Card>
			<CardContent className="flex items-center gap-3 p-4">
				<div className={`rounded-md bg-slate-100 p-2 ${toneClass}`}>
					{icon}
				</div>
				<div className="min-w-0">
					<div className="truncate text-xs text-slate-500">{label}</div>
					<div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
				</div>
			</CardContent>
		</Card>
	);
}
