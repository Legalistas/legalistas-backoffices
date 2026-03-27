"use client";

import {
	Archive,
	FileDown,
	FileText,
	HeartPulse,
	Landmark,
	Loader2,
	Percent,
	Scale,
	Send,
	ShieldCheck,
	Star,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import TiptapEditor from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CASES_ENDPOINT } from "@/constant/api-endpoints";
import { stageCases } from "@/lib/constant";
import type { Cases } from "@/types/cases";

interface InformeTrimestralViewProps {
	caseData: Cases;
	onCaseUpdated?: () => void;
}

export function InformeTrimestralView({
	caseData,
	onCaseUpdated,
}: InformeTrimestralViewProps) {
	const { data: session } = useSession();
	const [estadoActual, setEstadoActual] = useState(
		caseData.estadoActual ||
		"<p>Su caso se encuentra actualmente en etapa judicial.</p><p><strong>Estamos trabajando</strong> para avanzar en la <strong>NEGOCIACIÓN</strong> del reclamo y lograr una resolución favorable.</p>",
	);
	const [incapacityPercentage, setIncapacityPercentage] = useState(
		caseData.disabilityPercentage != null
			? String(caseData.disabilityPercentage)
			: "",
	);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const previewRef = useRef<HTMLDivElement>(null);

	const currentStageId = Number(caseData.stageId) || 1;
	const stageLabel =
		stageCases.find((s) => s.value === currentStageId)?.label ||
		"Documentación";

	const saveToDb = useCallback(
		async (fields: {
			estadoActual?: string;
			disabilityPercentage?: number | null;
		}) => {
			setIsSaving(true);
			try {
				const response = await fetch(
					`${CASES_ENDPOINT}/${caseData.id}`,
					{
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
						body: JSON.stringify(fields),
					},
				);
				if (!response.ok) throw new Error("Error al guardar");
				onCaseUpdated?.();
			} catch (error) {
				console.error("Error saving informe data:", error);
				toast.error("No se pudieron guardar los datos del informe");
			} finally {
				setIsSaving(false);
			}
		},
		[caseData.id, session?.user?.accessToken, onCaseUpdated],
	);

	const handleSave = async () => {
		const fields: {
			estadoActual: string;
			disabilityPercentage: number | null;
		} = {
			estadoActual,
			disabilityPercentage: incapacityPercentage
				? Number.parseFloat(incapacityPercentage)
				: null,
		};
		await saveToDb(fields);
		toast.success("Datos del informe guardados");
	};

	const handleGeneratePdf = async () => {
		if (!previewRef.current) return;
		setIsGenerating(true);
		toast.info("Generando informe trimestral...");
		try {
			const html2canvas = (await import("html2canvas-pro")).default;
			const { default: jsPDF } = await import("jspdf");

			const canvas = await html2canvas(previewRef.current, {
				scale: 2,
				useCORS: true,
				allowTaint: true,
				backgroundColor: "#ffffff",
			});

			const imgData = canvas.toDataURL("image/jpeg", 0.92);
			const imgW = canvas.width;
			const imgH = canvas.height;

			const pdfW = 210;
			const pdfH = 297;
			const contentW = pdfW;
			const contentH = (imgH * contentW) / imgW;

			// Scale to fit 1 page if needed
			const finalW = contentH > pdfH ? contentW * (pdfH / contentH) : contentW;
			const finalH = contentH > pdfH ? pdfH : contentH;
			const finalX = (pdfW - finalW) / 2;

			const pdf = new jsPDF({
				orientation: "portrait",
				unit: "mm",
				format: "a4",
			});

			pdf.addImage(imgData, "JPEG", finalX, 0, finalW, finalH);

			pdf.save(
				`Informe_Trimestral_${caseData.number || caseData.id}_${caseData.customer?.name?.replace(/\s+/g, "_") || "cliente"}.pdf`,
			);
			toast.success("Informe trimestral descargado correctamente");
		} catch (error) {
			console.error("Error generating quarterly report PDF:", error);
			toast.error("No se pudo generar el informe trimestral");
		} finally {
			setIsGenerating(false);
		}
	};

	const generatePdfBlob = async (): Promise<Blob | null> => {
		if (!previewRef.current) return null;
		const html2canvas = (await import("html2canvas-pro")).default;
		const { default: jsPDF } = await import("jspdf");

		const canvas = await html2canvas(previewRef.current, {
			scale: 2,
			useCORS: true,
			allowTaint: true,
			backgroundColor: "#ffffff",
		});

		const imgData = canvas.toDataURL("image/jpeg", 0.92);
		const imgW = canvas.width;
		const imgH = canvas.height;
		const pdfW = 210;
		const pdfH = 297;
		const contentW = pdfW;
		const contentH = (imgH * contentW) / imgW;
		const finalW = contentH > pdfH ? contentW * (pdfH / contentH) : contentW;
		const finalH = contentH > pdfH ? pdfH : contentH;
		const finalX = (pdfW - finalW) / 2;

		const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
		pdf.addImage(imgData, "JPEG", finalX, 0, finalW, finalH);

		return pdf.output("blob");
	};

	const handleSendWhatsApp = async () => {
		setIsSending(true);
		toast.info("Preparando informe para WhatsApp...");
		try {
			const blob = await generatePdfBlob();
			if (!blob) throw new Error("No se pudo generar el PDF");

			const fileName = `Informe_Trimestral_${caseData.number || caseData.id}.pdf`;

			// Download the PDF first
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			// Open WhatsApp Web with pre-filled message
			const message = `Hola ${caseData.customer?.name || ""}! Le enviamos el informe trimestral del estado de su reclamo (Caso #${caseData.number || caseData.id}). Le adjuntamos el PDF en este chat. Si observa algún error en el documento, por favor avísenos para corregirlo a la brevedad.`
			const customerPhone = (caseData.customer as any)?.userProfile?.phone;
			const cleanPhone = customerPhone?.replace(/[\s\-()]/g, "") || "";
			const waUrl = cleanPhone
				? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
				: `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
			window.open(waUrl, "_blank");
			toast.success("PDF descargado. Adjuntalo en el chat de WhatsApp.");
		} catch (error) {
			if ((error as Error)?.name !== "AbortError") {
				console.error("Error sending via WhatsApp:", error);
				toast.error("No se pudo enviar por WhatsApp");
			}
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="p-6 space-y-8">
			{/* Editor Section */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* TipTap Editor */}
				<div className="lg:col-span-2 space-y-3">
					<div>
						<p className="text-sm font-semibold text-foreground">
							Estado Actual del Caso
						</p>
						<p className="text-xs text-muted-foreground mt-0.5">
							Este texto aparecerá en la sección &quot;Estado Actual&quot; del
							informe trimestral que recibe el cliente.
						</p>
					</div>
					<TiptapEditor content={estadoActual} onChange={setEstadoActual} />
				</div>

				{/* Controls */}
				<div className="space-y-4">
					<div className="space-y-2">
						<p className="text-sm font-semibold text-foreground">
							Porcentaje de Incapacidad
						</p>
						<div className="relative">
							<Input
								type="number"
								min="0"
								max="100"
								placeholder="Ej: 35"
								value={incapacityPercentage}
								onChange={(e) => setIncapacityPercentage(e.target.value)}
								className="pr-8"
							/>
							<Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						</div>
						<p className="text-xs text-muted-foreground">
							Dejalo vacío si aún no se determinó.
						</p>
					</div>

					<div className="pt-2 space-y-2">
						<Button
							onClick={handleSave}
							disabled={isSaving}
							variant="outline"
							className="w-full"
						>
							{isSaving ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							{isSaving ? "Guardando..." : "Guardar datos"}
						</Button>
						<Button
							onClick={handleGeneratePdf}
							disabled={isGenerating || isSending}
							className="w-full bg-[#09a4b5] hover:bg-[#078a99] text-white"
						>
							{isGenerating ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<FileDown className="mr-2 h-4 w-4" />
							)}
							{isGenerating ? "Generando..." : "Descargar Informe PDF"}
						</Button>
						<Button
							onClick={handleSendWhatsApp}
							disabled={isSending || isGenerating}
							className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
						>
							{isSending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Send className="mr-2 h-4 w-4" />
							)}
							{isSending ? "Enviando..." : "Enviar por WhatsApp"}
						</Button>
					</div>

					{/* Quick info */}
					<div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Datos del informe
						</p>
						<div className="text-sm space-y-1">
							<p>
								<span className="text-muted-foreground">Cliente:</span>{" "}
								{caseData.customer?.name}
							</p>
							<p>
								<span className="text-muted-foreground">Caso:</span> #
								{caseData.number || caseData.id}
							</p>
							<p>
								<span className="text-muted-foreground">Etapa:</span>{" "}
								{stageLabel}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Divider */}
			<div className="flex items-center gap-3">
				<div className="h-px flex-1 bg-border" />
				<span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
					Vista previa del informe
				</span>
				<div className="h-px flex-1 bg-border" />
			</div>

			{/* Report Preview */}
			<div className="max-w-2xl mx-auto" ref={previewRef}>
				<ReportPreview
					customerName={caseData.customer?.name || "Cliente"}
					caseNumber={caseData.number || String(caseData.id)}
					stageId={currentStageId}
					estadoActualHtml={estadoActual}
					incapacityPercentage={incapacityPercentage}
				/>
			</div>
		</div>
	);
}

function ReportPreview({
	customerName,
	caseNumber,
	stageId,
	estadoActualHtml,
	incapacityPercentage,
}: {
	customerName: string;
	caseNumber: string;
	stageId: number;
	estadoActualHtml: string;
	incapacityPercentage: string;
}) {
	const stages = stageCases;

	return (
		<div className="bg-white overflow-hidden text-gray-800 flex flex-col" style={{ aspectRatio: "210 / 297" }}>
			{/* Header */}
			<div className="bg-linear-to-br from-[#09a4b5] to-[#0bbfcf] text-white px-6 py-4 text-center">
				<div className="flex justify-center mb-2">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="/images/logo/logo-print-blanco.png"
						alt="Legalistas"
						style={{ height: "40px", width: "auto" }}
					/>
				</div>
				<h2 className="text-sm font-bold tracking-wide leading-tight">
					INFORME TRIMESTRAL DEL ESTADO
					<br />
					DE SU RECLAMO
				</h2>
				<p className="mt-1.5 text-white/80 text-md italic">
					Cliente: {customerName} &nbsp;&nbsp; N° {caseNumber}
				</p>
			</div>

			{/* Content area — flex-1 pushes footer to bottom */}
			<div className="flex-1">

				{/* Progress Timeline */}
				<div className="px-3 py-4 bg-white border-b">
					<p className="text-center text-[10px] text-gray-400 font-semibold uppercase tracking-[0.15em] mb-4">
						Progreso de su Reclamo
					</p>
					<div className="relative">
						{/* Horizontal timeline line — positioned at connector dot level */}
						<div
							className="absolute left-[30px] right-[30px] h-px bg-gray-200"
							style={{ top: "62px" }}
						/>
						<div
							className="absolute left-[30px] h-px bg-[#09a4b5]"
							style={{
								top: "62px",
								width: `calc(${((Math.min(stageId, 7) - 1) / 6) * 100}% - ${((Math.min(stageId, 7) - 1) / 6) * 60}px)`,
							}}
						/>

						<div className="flex items-start justify-between">
							{stages.map((stage) => {
								const isCompleted = stage.value < stageId;
								const isCurrent = stage.value === stageId;
								const isActive = isCompleted || isCurrent;
								const ringState = isCompleted
									? "completed"
									: isCurrent
										? "current"
										: "pending";

								return (
									<div
										key={stage.value}
										className="flex flex-col items-center z-10"
										style={{ width: "60px" }}
									>
										{/* Ring + Icon */}
										<div className="relative w-[48px] h-[48px]">
											<ProgressRing state={ringState} />
											<div
												className={`absolute inset-[6px] rounded-full flex items-center justify-center ${isActive ? "bg-gray-100" : "bg-gray-50"
													}`}
											>
												<StageIcon
													stage={stage.value}
													active={isActive}
												/>
											</div>
										</div>

										{/* Vertical connector */}
										<div
											className={`w-px h-2.5 ${isActive ? "bg-[#09a4b5]" : "bg-gray-200"}`}
										/>

										{/* Dot on timeline */}
										<div
											className={`w-[7px] h-[7px] rounded-full border-2 ${isActive
												? "bg-[#09a4b5] border-[#09a4b5]"
												: "bg-white border-gray-300"
												}`}
										/>

										{/* Label */}
										<span
											className={`text-[10px] mt-1.5 font-medium text-center leading-tight ${isCurrent
												? "text-[#09a4b5] font-bold"
												: isCompleted
													? "text-[#09a4b5]/70"
													: "text-gray-300"
												}`}
										>
											{stage.label}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Two columns: Incapacidad + Estado Actual */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
					{/* Incapacidad */}
					<div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
						<div className="bg-[#09a4b5] text-white px-4 py-2.5 text-center">
							<h4 className="text-[11px] font-bold uppercase tracking-wider">
								Incapacidad Determinada
							</h4>
						</div>
						<div className="p-5 text-center">
							<div className="text-5xl font-bold text-[#09a4b5] mb-1">
								{incapacityPercentage || "-"}
								<span className="text-2xl">%</span>
							</div>
							<p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mt-3">
								¿Qué significa el porcentaje de incapacidad?
							</p>
							<div className="flex justify-center my-3">
								<div className="flex items-end gap-0.5">
									{[0.4, 0.55, 0.7, 0.85, 1].map((h, i) => (
										<div
											key={i}
											className="w-4 rounded-t"
											style={{
												height: `${h * 32}px`,
												backgroundColor:
													i < 3
														? `rgba(9, 164, 181, ${0.3 + i * 0.2})`
														: `rgba(9, 164, 181, ${0.3 + i * 0.15})`,
											}}
										/>
									))}
								</div>
							</div>
							<p className="text-[9px] text-gray-400 leading-relaxed px-2">
								Este porcentaje representa la incapacidad determinada, y
								constituye la base para calcular la indemnización económica
								correspondiente.
							</p>
						</div>
					</div>

					{/* Estado Actual */}
					<div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
						<div className="bg-[#09a4b5] text-white px-4 py-2.5 text-center">
							<h4 className="text-[11px] font-bold uppercase tracking-wider">
								Estado Actual
							</h4>
						</div>
						<div className="p-5">
							<div
								className="text-sm text-gray-700 leading-relaxed [&_strong]:font-bold [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
								dangerouslySetInnerHTML={{ __html: estadoActualHtml }}
							/>
						</div>
					</div>
				</div>

				{/* Compromiso + Plazos */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
					{/* Compromiso */}
					<div className="bg-gray-50 rounded-xl p-4">
						<h4 className="text-[11px] font-bold uppercase tracking-wider text-[#09a4b5] mb-3">
							Compromiso Legalistas
						</h4>
						<ul className="space-y-2.5 text-xs text-gray-600">
							<li className="flex items-start gap-2">
								<svg
									className="w-4 h-4 text-[#09a4b5] shrink-0 mt-0.5"
									fill="none"
									stroke="currentColor"
									strokeWidth={2.5}
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								Seguimiento permanente de su caso
							</li>
							<li className="flex items-start gap-2">
								<svg
									className="w-4 h-4 text-[#09a4b5] shrink-0 mt-0.5"
									fill="none"
									stroke="currentColor"
									strokeWidth={2.5}
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								Gestiones para avanzar en la negociación
							</li>
							<li className="flex items-start gap-2">
								<svg
									className="w-4 h-4 text-[#09a4b5] shrink-0 mt-0.5"
									fill="none"
									stroke="currentColor"
									strokeWidth={2.5}
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								Comunicación ante cualquier novedad relevante
							</li>
						</ul>
					</div>

					{/* Plazos */}
					<div className="bg-gray-50 rounded-xl p-4">
						<h4 className="text-[11px] font-bold uppercase tracking-wider text-[#09a4b5] mb-3">
							Sobre los Plazos
						</h4>
						<p className="text-xs text-gray-600 leading-relaxed">
							Los plazos dependen de organismos administrativos y judiciales.
						</p>
						<p className="text-xs text-gray-700 leading-relaxed mt-3 font-semibold">
							Nosotros impulsamos su caso de forma permanente.
						</p>
					</div>
				</div>

			</div>
			{/* end content area */}

			{/* Footer */}
			<div className="bg-linear-to-br from-[#09a4b5] to-[#0bbfcf] text-white py-3 px-6 text-center mt-auto">
				<div className="flex justify-center mb-0.5">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="/images/logo/logo-print-blanco.png"
						alt="Legalistas"
						className="h-6 w-auto"
					/>
				</div>
				<p className="text-[10px] text-white/70 mt-1.5">
					Más información en https://usuarios.legalistas.ar/signin
				</p>
			</div>
		</div>
	);
}

// ── SVG ring decoration around each stage icon ──
function ProgressRing({
	state,
}: { state: "completed" | "current" | "pending" }) {
	const r = 20;

	return (
		<svg viewBox="0 0 48 48" className="absolute inset-0 w-full h-full">
			{state === "completed" && (
				<circle
					cx="24"
					cy="24"
					r={r}
					fill="none"
					stroke="#09a4b5"
					strokeWidth="3"
				/>
			)}

			{state === "current" && (
				<circle
					cx="24"
					cy="24"
					r={r}
					fill="none"
					stroke="#09a4b5"
					strokeWidth="3.5"
				/>
			)}

			{state === "pending" && (
				<circle
					cx="24"
					cy="24"
					r={r}
					fill="none"
					stroke="#e5e7eb"
					strokeWidth="2"
				/>
			)}
		</svg>
	);
}

// ── Icon for each stage ──
const stageIconMap: Record<
	number,
	React.FC<{ className?: string }>
> = {
	1: FileText,
	2: Landmark,
	3: Scale,
	4: HeartPulse,
	5: ShieldCheck,
	6: Star,
	7: Archive,
};

function StageIcon({
	stage,
	active,
}: { stage: number; active: boolean }) {
	const IconComponent = stageIconMap[stage];
	if (!IconComponent) return null;
	return (
		<IconComponent
			className={`w-4 h-4 ${active ? "text-gray-600" : "text-gray-300"}`}
		/>
	);
}
