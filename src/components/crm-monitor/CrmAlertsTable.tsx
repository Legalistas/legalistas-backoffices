"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type {
	AlertSeverity,
	CrmAlert,
	MonitorReportUser,
} from "@/types/crm-monitor";

interface Props {
	alerts: CrmAlert[];
	users: MonitorReportUser[];
}

// Ruta admin al detalle según entityType. El backend emite entityType/entityId
// y acá decidimos a dónde linkear en el sidebar existente.
function detailHref(a: CrmAlert): string {
	switch (a.entityType) {
		case "CASE":
			return `/admin/legal-cases/${a.entityId}`;
		case "OPPORTUNITY":
			return `/admin/crm/leads/${a.entityId}`;
		case "NEGOTIATION":
			// No hay ruta /admin/negotiation/[id] — el detalle se abre con
			// query param en la misma página (ver admin/negotiation/page.tsx).
			return `/admin/negotiation?openId=${a.entityId}`;
		default:
			return "#";
	}
}

function severityVariant(
	s: AlertSeverity,
): "destructive" | "default" | "secondary" {
	if (s === "CRITICAL") return "destructive";
	if (s === "WARN") return "default";
	return "secondary";
}

export function CrmAlertsTable({ alerts, users }: Props) {
	const usersById = new Map(users.map((u) => [u.id, u]));

	if (alerts.length === 0) {
		return (
			<div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
				Sin alertas para esta regla en la semana seleccionada.
			</div>
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[80px]">Sev</TableHead>
						<TableHead>Entidad</TableHead>
						<TableHead>Responsable</TableHead>
						<TableHead className="w-[100px] text-right">Días</TableHead>
						<TableHead className="w-[60px]" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{alerts.map((a) => {
						const owner =
							a.responsibleUserId !== null
								? usersById.get(a.responsibleUserId)
								: null;
						return (
							<TableRow key={a.id}>
								<TableCell>
									<Badge variant={severityVariant(a.severity)}>
										{a.severity}
									</Badge>
								</TableCell>
								<TableCell className="max-w-md">
									<div className="truncate font-medium">{a.message}</div>
								</TableCell>
								<TableCell className="text-sm text-slate-600">
									{owner?.name ?? (
										<span className="italic text-slate-400">Sin asignar</span>
									)}
								</TableCell>
								<TableCell className="text-right font-mono text-sm">
									{a.ageDays}
								</TableCell>
								<TableCell>
									<Link
										href={detailHref(a)}
										className="inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
										aria-label="Ver detalle"
									>
										<ExternalLink className="h-4 w-4" />
									</Link>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
