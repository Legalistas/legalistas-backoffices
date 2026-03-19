"use client";

import {
	Activity,
	CalendarClock,
	Clock,
	DollarSign,
	FileText,
	Hash,
	Info,
	MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getServiceName } from "@/lib/functions";
import type { Cases } from "@/types/cases";

interface CaseStatsSidebarProps {
	caseData: Cases;
}

export const CaseStatsSidebar = ({ caseData }: CaseStatsSidebarProps) => {
	const createdAt = new Date(caseData.createdAt);
	const now = new Date();
	const diffMs = now.getTime() - createdAt.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	const updatedAt = new Date(caseData.updatedAt);
	const diffUpdateMs = now.getTime() - updatedAt.getTime();
	const diffUpdateDays = Math.floor(diffUpdateMs / (1000 * 60 * 60 * 24));
	const diffUpdateHours = Math.floor(diffUpdateMs / (1000 * 60 * 60));

	const lastUpdateLabel =
		diffUpdateDays > 0
			? `hace ${diffUpdateDays} día${diffUpdateDays > 1 ? "s" : ""}`
			: diffUpdateHours > 0
				? `hace ${diffUpdateHours} hora${diffUpdateHours > 1 ? "s" : ""}`
				: "hace un momento";

	const totalDocuments = caseData.documents?.length || 0;
	const totalNotes = caseData.notes?.length || 0;
	const totalMovements =
		caseData.files?.reduce(
			(acc, file) => acc + (file.fileMovements?.length || 0),
			0,
		) || 0;

	return (
		<div className="space-y-4">
			{/* Estadísticas del Caso */}
			<div className="rounded-xl border border-border bg-card shadow-sm">
				<div className="px-5 py-4 border-b border-border">
					<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
						<Info className="h-4 w-4 text-muted-foreground" />
						<span>Estadísticas del Caso</span>
					</h3>
				</div>
				<div className="px-5 py-4 space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span>Duración</span>
						</div>
						<span className="text-sm font-semibold text-foreground">
							{diffDays} día{diffDays !== 1 ? "s" : ""}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<CalendarClock className="h-4 w-4 text-muted-foreground" />
							<span>Última actualización</span>
						</div>
						<span className="text-sm font-semibold text-foreground">
							{lastUpdateLabel}
						</span>
					</div>
				</div>

				{/* Actividad */}
				<div className="px-5 py-4 border-t border-border">
					<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
						Actividad
					</h4>
					<div className="space-y-2.5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<FileText className="h-4 w-4 text-muted-foreground" />
								<span>Documentos</span>
							</div>
							<span className="text-sm font-semibold text-foreground">
								{totalDocuments}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<MessageSquare className="h-4 w-4 text-muted-foreground" />
								<span>Comentarios</span>
							</div>
							<span className="text-sm font-semibold text-foreground">
								{totalNotes}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Activity className="h-4 w-4 text-muted-foreground" />
								<span>Movimientos</span>
							</div>
							<span className="text-sm font-semibold text-foreground">
								{totalMovements}
							</span>
						</div>
					</div>
				</div>

				{/* Finanzas */}
				<div className="px-5 py-4 border-t border-border">
					<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
						Finanzas
					</h4>
					<div className="space-y-2.5">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<DollarSign className="h-4 w-4 text-muted-foreground" />
								<span>Liquidación Pretendida</span>
							</div>
							<span className="text-sm font-semibold text-foreground">
								${(0).toLocaleString("es-AR")}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Hash className="h-4 w-4 text-muted-foreground" />
								<span>Gastos del caso</span>
							</div>
							<span className="text-sm font-semibold text-blue-600">
								{totalMovements}
							</span>
						</div>
					</div>
				</div>

				{/* Estado actual */}
				<div className="px-5 py-4 border-t border-border">
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Estado actual</span>
						<Badge variant="secondary">
							{caseData.status === "WON"
								? "Ganado"
								: caseData.status === "LOST"
									? "Perdido"
									: "Nuevo"}
						</Badge>
					</div>
				</div>
			</div>
		</div>
	);
};
