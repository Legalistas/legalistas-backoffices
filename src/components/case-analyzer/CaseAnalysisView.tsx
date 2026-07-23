"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type {
	CaseAnalysisDetail,
	CaseAnalysisListItem,
} from "@/types/case-analyzer";
import { AnalysisReportViewer } from "./AnalysisReportViewer";
import { CaseAnalysisList } from "./CaseAnalysisList";
import { CaseAnalysisUploader } from "./CaseAnalysisUploader";
import { useCaseAnalyses } from "./useCaseAnalyses";

interface Props {
	caseId: string | number;
}

// Contenedor principal del tab "Análisis IA" en la ficha del caso.
// Estructura: header + uploader + lista de análisis (izquierda) + viewer
// del seleccionado (derecha).

export function CaseAnalysisView({ caseId }: Props) {
	const {
		analyses,
		loading,
		error,
		refresh,
		uploadPdf,
		uploading,
		uploadProgress,
		fetchDetail,
	} = useCaseAnalyses(caseId);

	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [detail, setDetail] = useState<CaseAnalysisDetail | null>(null);
	const [loadingDetail, setLoadingDetail] = useState(false);

	// Auto-seleccionar el primer DONE si no hay uno seleccionado.
	useEffect(() => {
		if (selectedId !== null) return;
		const firstDone = analyses.find((a) => a.status === "DONE");
		if (firstDone) setSelectedId(firstDone.id);
	}, [analyses, selectedId]);

	// Cargar detalle cuando cambia el seleccionado.
	useEffect(() => {
		if (selectedId === null) {
			setDetail(null);
			return;
		}
		let cancelled = false;
		setLoadingDetail(true);
		fetchDetail(selectedId).then((d) => {
			if (!cancelled) {
				setDetail(d);
				setLoadingDetail(false);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [selectedId, fetchDetail]);

	// Si el seleccionado cambia de estado en el poll (ej. PROCESSING → DONE),
	// refrescar el detail para traer el report recién generado.
	useEffect(() => {
		if (selectedId === null) return;
		const item = analyses.find((a) => a.id === selectedId);
		if (item?.status === "DONE" && !detail?.report) {
			fetchDetail(selectedId).then(setDetail);
		}
	}, [analyses, selectedId, detail?.report, fetchDetail]);

	const handleSelect = (a: CaseAnalysisListItem) => {
		setSelectedId(a.id);
	};

	const handleUpload = async (file: File) => {
		const result = await uploadPdf(file);
		if (result) {
			toast.success(
				`PDF subido. Análisis #${result.analysisId} en cola — el worker lo procesa en breve.`,
			);
			setSelectedId(result.analysisId);
		} else {
			toast.error("Error subiendo el PDF");
		}
	};

	return (
		<div className="space-y-4 p-4">
			<div className="flex items-center justify-between gap-2">
				<div>
					<h2 className="flex items-center gap-2 text-lg font-semibold">
						<Sparkles className="h-5 w-5 text-primary" />
						Análisis IA del expediente
					</h2>
					<p className="text-sm text-slate-500">
						Subí el PDF completo del expediente y la IA genera un informe con
						estado procesal, pruebas, probabilidad de éxito y próximo escrito
						sugerido.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={refresh}
					disabled={loading}
				>
					<RefreshCw
						className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
					/>
					Refrescar
				</Button>
			</div>

			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					Error: {error}
				</div>
			)}

			<CaseAnalysisUploader
				uploading={uploading}
				uploadProgress={uploadProgress}
				onUpload={handleUpload}
			/>

			<div className="grid gap-4 md:grid-cols-[320px_1fr]">
				{/* Lista */}
				<div>
					<h3 className="mb-2 text-sm font-medium text-slate-700">
						Análisis previos
					</h3>
					<CaseAnalysisList
						analyses={analyses}
						onSelect={handleSelect}
						selectedId={selectedId}
					/>
				</div>

				{/* Viewer */}
				<div className="min-w-0">
					{selectedId === null && (
						<Card>
							<CardHeader>
								<CardTitle className="text-base">Sin análisis seleccionado</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-slate-500">
									Seleccioná un análisis de la lista para ver el informe, o
									subí un PDF nuevo arriba.
								</p>
							</CardContent>
						</Card>
					)}

					{selectedId !== null && loadingDetail && (
						<div className="flex items-center justify-center rounded-md border p-8 text-sm text-slate-500">
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Cargando informe...
						</div>
					)}

					{selectedId !== null && !loadingDetail && detail && (
						<>
							{detail.status !== "DONE" ? (
								<Card>
									<CardHeader>
										<CardTitle className="text-base">
											{detail.status === "FAILED"
												? "Este análisis falló"
												: "Análisis en progreso"}
										</CardTitle>
									</CardHeader>
									<CardContent>
										{detail.status === "PROCESSING" && (
											<p className="text-sm text-slate-600">
												Procesando chunk {detail.processedChunks ?? 0}/
												{detail.totalChunks ?? "?"}. La página se refresca
												automáticamente cada 20s.
											</p>
										)}
										{detail.status === "PENDING" && (
											<p className="text-sm text-slate-600">
												Esperando al worker (arranca cada 30s).
											</p>
										)}
										{detail.status === "FAILED" && (
											<div className="text-sm text-red-700">
												<p className="font-medium">Error:</p>
												<p className="mt-1 whitespace-pre-line">
													{detail.errorMessage ?? "(sin detalle)"}
												</p>
											</div>
										)}
									</CardContent>
								</Card>
							) : detail.report ? (
								<AnalysisReportViewer
									report={detail.report}
									sourceUrl={detail.sourceUrl}
									sourceFileName={detail.sourceFileName}
								/>
							) : (
								<div className="rounded-md border p-4 text-sm text-slate-500">
									Análisis marcado como DONE pero sin `report` — algo raro pasó.
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
