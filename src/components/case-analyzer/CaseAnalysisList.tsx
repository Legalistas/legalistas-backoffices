"use client";

import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type {
	CaseAnalysisListItem,
	CaseAnalysisStatus,
} from "@/types/case-analyzer";

interface Props {
	analyses: CaseAnalysisListItem[];
	onSelect: (a: CaseAnalysisListItem) => void;
	selectedId?: number | null;
}

function statusBadge(status: CaseAnalysisStatus) {
	switch (status) {
		case "DONE":
			return (
				<Badge className="bg-green-100 text-green-700 hover:bg-green-100">
					<CheckCircle2 className="mr-1 h-3 w-3" />
					Listo
				</Badge>
			);
		case "PROCESSING":
			return (
				<Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
					<Loader2 className="mr-1 h-3 w-3 animate-spin" />
					Procesando
				</Badge>
			);
		case "PENDING":
			return (
				<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
					<Clock className="mr-1 h-3 w-3" />
					En cola
				</Badge>
			);
		case "FAILED":
			return (
				<Badge variant="destructive">
					<XCircle className="mr-1 h-3 w-3" />
					Falló
				</Badge>
			);
		case "CANCELLED":
			return (
				<Badge variant="secondary">
					<AlertCircle className="mr-1 h-3 w-3" />
					Cancelado
				</Badge>
			);
	}
}

function relTime(iso: string): string {
	const then = new Date(iso).getTime();
	const now = Date.now();
	const min = Math.floor((now - then) / 60000);
	if (min < 1) return "hace segundos";
	if (min < 60) return `hace ${min} min`;
	const h = Math.floor(min / 60);
	if (h < 24) return `hace ${h}h`;
	const d = Math.floor(h / 24);
	return `hace ${d} día${d > 1 ? "s" : ""}`;
}

export function CaseAnalysisList({ analyses, onSelect, selectedId }: Props) {
	if (analyses.length === 0) {
		return (
			<div className="rounded-md border border-dashed p-6 text-center text-sm text-slate-500">
				Todavía no hay análisis para este caso.
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{analyses.map((a) => {
				const isSelected = selectedId === a.id;
				const progressPct =
					a.totalChunks && a.processedChunks !== null
						? Math.round((a.processedChunks / a.totalChunks) * 100)
						: null;
				return (
					<button
						key={a.id}
						type="button"
						onClick={() => onSelect(a)}
						className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-slate-50 ${
							isSelected ? "border-primary bg-primary/5" : "border-slate-200"
						}`}
					>
						<div className="flex items-center justify-between gap-2">
							<div className="min-w-0 flex-1">
								<div className="truncate text-sm font-medium">
									{a.sourceFileName}
								</div>
								<div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
									<span>{a.provider}</span>
									<span>·</span>
									<span>{a.model}</span>
									<span>·</span>
									<span>{Number(a.sourceSizeMb).toFixed(1)}MB</span>
									<span>·</span>
									<span>{relTime(a.createdAt)}</span>
								</div>
							</div>
							{statusBadge(a.status)}
						</div>

						{a.status === "PROCESSING" && progressPct !== null && (
							<div className="mt-2">
								<Progress value={progressPct} className="h-1" />
								<p className="mt-1 text-xs text-slate-500">
									Chunk {a.processedChunks}/{a.totalChunks}
								</p>
							</div>
						)}

						{a.status === "FAILED" && a.errorMessage && (
							<p className="mt-2 line-clamp-2 text-xs text-red-600">
								{a.errorMessage}
							</p>
						)}
					</button>
				);
			})}
		</div>
	);
}
