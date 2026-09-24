"use client";

import {
	AlertTriangle,
	Copy,
	Download,
	FileText,
	Gavel,
	ScrollText,
	Scale as ScaleIcon,
	Target,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { AnalysisReport } from "@/types/case-analyzer";

interface Props {
	report: AnalysisReport;
	sourceUrl?: string | null;
	sourceFileName?: string;
}

const PROB_COLOR: Record<AnalysisReport["assessment"]["successProbability"], string> = {
	MUY_BAJA: "bg-red-100 text-red-700",
	BAJA: "bg-orange-100 text-orange-700",
	MEDIA: "bg-amber-100 text-amber-700",
	ALTA: "bg-green-100 text-green-700",
	MUY_ALTA: "bg-emerald-100 text-emerald-700",
};

const URGENCY_COLOR: Record<AnalysisReport["nextAction"]["urgency"], string> = {
	BAJA: "bg-slate-100 text-slate-700",
	MEDIA: "bg-amber-100 text-amber-700",
	ALTA: "bg-red-100 text-red-700",
};

export function AnalysisReportViewer({ report, sourceUrl, sourceFileName }: Props) {
	const handleCopy = async () => {
		const text = JSON.stringify(report, null, 2);
		await navigator.clipboard.writeText(text);
		toast.success("Informe copiado como JSON");
	};

	return (
		<div className="space-y-3">
			{/* Header con acciones */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="text-xs text-slate-500">
					Generado por <b>{report.meta.provider}</b> ({report.meta.model}) ·{" "}
					{report.meta.chunksProcessed} chunk
					{report.meta.chunksProcessed !== 1 ? "s" : ""} ·{" "}
					{new Date(report.meta.generatedAt).toLocaleString("es-AR")}
				</div>
				<div className="flex gap-2">
					{sourceUrl && (
						<Button asChild variant="outline" size="sm">
							<a href={sourceUrl} target="_blank" rel="noopener noreferrer">
								<Download className="mr-2 h-4 w-4" />
								PDF original
							</a>
						</Button>
					)}
					<Button variant="outline" size="sm" onClick={handleCopy}>
						<Copy className="mr-2 h-4 w-4" />
						Copiar JSON
					</Button>
				</div>
			</div>

			{/* Bloque 1: Resumen */}
			<Section icon={<FileText />} title="Resumen ejecutivo" defaultOpen>
				<KV label="Objeto">{report.summary.subject}</KV>
				<KV label="Tipo de reclamo">{report.summary.claimType}</KV>
				<KV label="Partes">
					<div className="flex flex-wrap gap-1">
						{report.summary.parties.map((p) => (
							<Badge key={p} variant="secondary">
								{p}
							</Badge>
						))}
					</div>
				</KV>
				<KV label="Hechos">
					<p className="whitespace-pre-line text-sm">{report.summary.facts}</p>
				</KV>
			</Section>

			{/* Bloque 2: Estado procesal */}
			<Section icon={<ScrollText />} title="Estado procesal" defaultOpen>
				<KV label="Etapa actual">{report.procedural.currentStage}</KV>
				<KV label="Último movimiento">{report.procedural.lastMovement}</KV>
				<KV label="Próximos pasos posibles">
					<BulletList items={report.procedural.nextPossibleSteps} />
				</KV>
			</Section>

			{/* Bloque 3: Pruebas */}
			<Section icon={<ScaleIcon />} title="Pruebas">
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">
							Producidas
						</h4>
						<BulletList items={report.evidence.produced} />
					</div>
					<div>
						<h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">
							Faltantes / convenientes
						</h4>
						<BulletList items={report.evidence.missing} />
					</div>
					<div>
						<h4 className="mb-2 text-xs font-semibold uppercase text-green-700">
							Puntos fuertes
						</h4>
						<BulletList items={report.evidence.strongPoints} />
					</div>
					<div>
						<h4 className="mb-2 text-xs font-semibold uppercase text-red-700">
							Puntos débiles
						</h4>
						<BulletList items={report.evidence.weakPoints} />
					</div>
				</div>
			</Section>

			{/* Bloque 4: Evaluación */}
			<Section icon={<AlertTriangle />} title="Evaluación de éxito" defaultOpen>
				<div className="mb-3 flex items-center gap-2">
					<span className="text-sm text-slate-600">
						Probabilidad de éxito:
					</span>
					<Badge className={PROB_COLOR[report.assessment.successProbability]}>
						{report.assessment.successProbability.replace("_", " ")}
					</Badge>
				</div>
				<KV label="Fundamentos">
					<p className="whitespace-pre-line text-sm">
						{report.assessment.reasoning}
					</p>
				</KV>
				<KV label="Riesgos clave">
					<BulletList items={report.assessment.keyRisks} />
				</KV>
			</Section>

			{/* Bloque 5: Jurisprudencia */}
			<Section icon={<Gavel />} title={`Jurisprudencia relevante (${report.jurisprudence.length})`}>
				{report.jurisprudence.length === 0 ? (
					<p className="text-sm italic text-slate-500">
						No se buscó jurisprudencia (feature disponible solo con AI_PROVIDER=anthropic).
					</p>
				) : (
					<div className="space-y-3">
						{report.jurisprudence.map((j) => (
							<div
								key={`${j.caseName}-${j.year ?? ""}`}
								className="rounded-md border p-3"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium">{j.caseName}</div>
										<div className="text-xs text-slate-500">
											{j.court} {j.year ? `· ${j.year}` : ""}
										</div>
									</div>
									{j.url && (
										<a
											href={j.url}
											target="_blank"
											rel="noopener noreferrer"
											className="text-xs text-primary underline"
										>
											Fuente
										</a>
									)}
								</div>
								<p className="mt-2 text-sm">{j.summary}</p>
								<p className="mt-2 text-xs italic text-slate-600">
									<b>Relevancia:</b> {j.relevance}
								</p>
							</div>
						))}
					</div>
				)}
			</Section>

			{/* Bloque 6: Próximo escrito */}
			<Section
				icon={<Target />}
				title="Próximo escrito / estrategia sugerida"
				defaultOpen
			>
				<div className="mb-3 flex items-center gap-2">
					<Badge variant="outline">{report.nextAction.type}</Badge>
					<Badge className={URGENCY_COLOR[report.nextAction.urgency]}>
						Urgencia: {report.nextAction.urgency}
					</Badge>
				</div>
				<KV label="Título">{report.nextAction.title}</KV>
				<KV label="Borrador / esquema">
					<p className="whitespace-pre-line rounded-md bg-slate-50 p-3 font-mono text-xs">
						{report.nextAction.outline}
					</p>
				</KV>
			</Section>
		</div>
	);
}

// ── Helpers UI ─────────────────────────────────────────────────────

function Section({
	icon,
	title,
	defaultOpen = false,
	children,
}: {
	icon: ReactNode;
	title: string;
	defaultOpen?: boolean;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<Card>
			<Collapsible open={open} onOpenChange={setOpen}>
				<CollapsibleTrigger asChild>
					<CardHeader className="cursor-pointer py-3 hover:bg-slate-50">
						<CardTitle className="flex items-center gap-2 text-base">
							<span className="text-slate-500 [&>svg]:h-4 [&>svg]:w-4">
								{icon}
							</span>
							{title}
							<span className="ml-auto text-xs text-slate-400">
								{open ? "−" : "+"}
							</span>
						</CardTitle>
					</CardHeader>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<CardContent className="pt-0">{children}</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}

function KV({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="mb-3">
			<div className="mb-1 text-xs font-semibold uppercase text-slate-500">
				{label}
			</div>
			<div className="text-sm">{children}</div>
		</div>
	);
}

function BulletList({ items }: { items: string[] }) {
	if (items.length === 0) {
		return <p className="text-sm italic text-slate-400">—</p>;
	}
	return (
		<ul className="list-inside list-disc space-y-1 text-sm">
			{items.map((it, i) => (
				<li key={`${i}-${it.slice(0, 20)}`}>{it}</li>
			))}
		</ul>
	);
}
