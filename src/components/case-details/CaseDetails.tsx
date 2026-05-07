"use client";

import { profile } from "console";

import { FileDown, Loader2, Mail, Pencil, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { LawyerSelectDropdown } from "@/components/cases/LawyerSelectDropdown";
import { ResultSelectDropdown } from "@/components/cases/ResultSelectDropdown";
import { StageSelectDropdown } from "@/components/cases/StageSelectDropdown";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CASES_ENDPOINT } from "@/constant/api-endpoints";
import {
	STUDIO_NAME,
	STUDIO_PHONE,
	servicesType,
	stageCases,
	stageDefaultMessages,
} from "@/lib/constant";
import { sendCaseStageEmail } from "@/lib/send-case-stage-email";
import type { Cases } from "@/types/cases";

interface CaseDetailsProps {
	caseData: Cases;
	onEdit: () => void;
	onDelete: () => void;
	onCaseUpdated?: () => void;
}

export const CaseDetails = ({
	caseData,
	onEdit,
	onDelete,
	onCaseUpdated,
}: CaseDetailsProps) => {
	const { data: session } = useSession();

	const [isUpdatingStage, setIsUpdatingStage] = useState(false);
	const [isUpdatingResult, setIsUpdatingResult] = useState(false);

	const fillMessageVariables = (template: string) => {
		return template
			.replace(/\{\{nombre\}\}/g, caseData.customer?.name || "Cliente")
			.replace(/\{\{numero_causa\}\}/g, caseData.number || String(caseData.id))
			.replace(/\{\{estudio\}\}/g, STUDIO_NAME)
			.replace(/\{\{telefono\}\}/g, STUDIO_PHONE);
	};

	// Modal WhatsApp
	const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false);
	const defaultMessage = fillMessageVariables(
		stageDefaultMessages[Number(caseData.stageId) || 1] || "",
	);
	const [whatsappMessage, setWhatsappMessage] = useState(defaultMessage);
	const messageInputRef = useRef<HTMLTextAreaElement>(null);

	const currentStageLabel =
		stageCases.find((s) => s.value === Number(caseData.stageId))?.label ||
		"Documentación";

	const buildStageEmailPayload = (stageId: number) => ({
		email: caseData.customer?.email,
		customerName: caseData.customer?.name,
		caseId: Number(caseData.id),
		stageId,
		caseNumber: caseData.number ?? String(caseData.id),
		caseTitle: caseData.title ?? undefined,
		serviceName: servicesType.find(
			(s) => Number(s.id) === Number(caseData.servicesId),
		)?.label,
		responsibleLawyerName: caseData.responsibleLawyer?.name,
		accessToken: session?.user?.accessToken,
	});

	const handleStageChange = async (newStageId: number) => {
		setIsUpdatingStage(true);
		try {
			const response = await fetch(`${CASES_ENDPOINT}/${caseData.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ stageId: newStageId }),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || "Error al actualizar la etapa del caso",
				);
			}

			toast.success("Etapa del caso actualizada exitosamente");
			// Actualizar el mensaje de WhatsApp con el template de la nueva etapa
			const defaultMsg = stageDefaultMessages[newStageId];
			if (defaultMsg) {
				setWhatsappMessage(fillMessageVariables(defaultMsg));
			}

			// Enviar email automático al cliente con el nuevo estado de la etapa
			sendCaseStageEmail(buildStageEmailPayload(newStageId));

			onCaseUpdated?.();
		} catch (error) {
			console.error("Error updating case stage:", error);
			toast.error("No se pudo actualizar la etapa del caso.");
		} finally {
			setIsUpdatingStage(false);
		}
	};

	const handleResendStageEmail = async () => {
		const email = caseData.customer?.email;
		if (!email) {
			toast.error("Este cliente no tiene email registrado");
			return;
		}
		const stageId = Number(caseData.stageId);
		if (!stageId) {
			toast.error("La causa no tiene etapa asignada");
			return;
		}
		try {
			await sendCaseStageEmail({
				...buildStageEmailPayload(stageId),
				isResend: true,
			});
			toast.success("Email reenviado correctamente");
		} catch {
			toast.error("Error al reenviar el email");
		}
	};

	const handleLawyerChange = async (
		field: "responsibleLawyerId" | "internalLawyerId",
		lawyerId: number,
	) => {
		try {
			const response = await fetch(`${CASES_ENDPOINT}/${caseData.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ [field]: lawyerId }),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Error al actualizar abogado");
			}
			toast.success(
				field === "responsibleLawyerId"
					? "Abogado responsable actualizado"
					: "Abogado interno actualizado",
			);
			onCaseUpdated?.();
		} catch (error) {
			console.error("Error updating lawyer:", error);
			toast.error("No se pudo actualizar el abogado.");
		}
	};

	const handleResultChange = async (newResult: string) => {
		setIsUpdatingResult(true);
		try {
			const response = await fetch(`${CASES_ENDPOINT}/${caseData.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({ status: newResult }),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.message || "Error al actualizar el resultado",
				);
			}
			toast.success("Resultado actualizado");
			onCaseUpdated?.();
		} catch (error) {
			console.error("Error updating case result:", error);
			toast.error("No se pudo actualizar el resultado del caso.");
		} finally {
			setIsUpdatingResult(false);
		}
	};

	const handleSendWhatsApp = () => {
		if (!whatsappMessage.trim()) {
			toast.error("Escribí un mensaje antes de enviar");
			messageInputRef.current?.focus();
			return;
		}

		const message = whatsappMessage.trim();
		const encodedMessage = encodeURIComponent(message);
		const customerPhone = (caseData.customer as any)?.phone;

		if (customerPhone) {
			const cleanPhone = customerPhone.replace(/[\s\-()]/g, "");
			window.open(
				`https://wa.me/${cleanPhone}?text=${encodedMessage}`,
				"_blank",
			);
		} else {
			window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
		}
		setIsWhatsappModalOpen(false);
	};

	const handleDownloadPdf = async () => {
		toast.info("Generando PDF del resumen del caso...");
		try {
			const response = await fetch("/api/generate-case-pdf", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(caseData),
			});

			if (!response.ok) throw new Error("Error al generar el PDF");

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Resumen_Caso_${caseData.number || caseData.id}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			toast.success("PDF descargado correctamente");
		} catch (error) {
			console.error("Error generating PDF:", error);
			toast.error("No se pudo generar el PDF del caso");
		}
	};

	return (
		<>
			<div className="mb-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
				{/* Row 1: Title + Action Buttons */}
				<div className="px-6 py-4 border-b border-border">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						{/* Left: Case info */}
						<div className="min-w-0">
							<div className="flex items-center gap-3">
								<span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground shrink-0">
									#{caseData.number ?? caseData.id}
								</span>
								<h2 className="text-lg font-semibold text-foreground truncate">
									{caseData.title}
								</h2>
							</div>
						</div>

						{/* Right: Action buttons */}
						<div className="flex items-center gap-2 shrink-0">
							<Button
								variant="outline"
								onClick={() => setIsWhatsappModalOpen(true)}
							>
								<svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24">
									<path d="M12.04 2C6.58 2 2.16 6.42 2.16 11.88c0 1.92.5 3.72 1.46 5.32L2 22l4.95-1.6c1.55.85 3.32 1.3 5.09 1.3h.01c5.46 0 9.88-4.42 9.88-9.88S17.5 2 12.04 2zm0 17.9c-1.63 0-3.23-.44-4.63-1.26l-.33-.19-2.94.95.96-2.86-.21-.34a7.8 7.8 0 01-1.2-4.12c0-4.32 3.52-7.84 7.85-7.84 2.09 0 4.05.81 5.53 2.29a7.78 7.78 0 012.3 5.55c0 4.33-3.52 7.82-7.83 7.82zm4.3-5.87c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.18-1.4-1.32-1.64-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28z" />
								</svg>
								Estado del caso
							</Button>
							<Button
								variant="outline"
								onClick={handleResendStageEmail}
								disabled={!caseData.customer?.email || !caseData.stageId}
								title={
									!caseData.customer?.email
										? "Este cliente no tiene email registrado"
										: !caseData.stageId
											? "La causa no tiene etapa asignada"
											: "Reenviar email de la etapa actual"
								}
							>
								<Mail className="mr-1.5 h-4 w-4" />
								Reenviar email
							</Button>
							<Button
								variant="outline"
								onClick={onEdit}
								className=""
							>
								<Pencil className="mr-1.5 h-4 w-4" />
								Editar
							</Button>
							<Button
								variant="outline"
								onClick={handleDownloadPdf}
								className=""
							>
								<FileDown className="mr-1.5 h-4 w-4" />
								Descargar PDF
							</Button>
							<Button
								variant="outline"
								onClick={onDelete}
								className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
							>
								<Trash2 className="mr-1.5 h-4 w-4" />
								Eliminar
							</Button>
						</div>
					</div>
				</div>

				{/* Row 2: Info fields */}
				<div className="px-6 py-3">
					<div className="flex flex-wrap items-center gap-4">
						{/* Abogado Responsable */}
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Responsable
							</span>
							<LawyerSelectDropdown
								currentLawyerId={caseData.responsibleLawyerId}
								currentLawyerName={caseData.responsibleLawyer?.name}
								currentLawyerImage={caseData.responsibleLawyer?.image}
								type="responsible"
								onLawyerChange={(id) =>
									handleLawyerChange("responsibleLawyerId", id)
								}
							/>
						</div>

						<div className="h-5 w-px bg-border" />

						{/* Abogado Interno */}
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Interno
							</span>
							<LawyerSelectDropdown
								currentLawyerId={caseData.internalLawyerId}
								currentLawyerName={caseData.internalLawyer?.name}
								currentLawyerImage={caseData.internalLawyer?.image}
								type="internal"
								onLawyerChange={(id) =>
									handleLawyerChange("internalLawyerId", id)
								}
							/>
						</div>

						<div className="h-5 w-px bg-border" />

						{/* Etapa (Stage Dropdown) */}
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Etapa
							</span>
							<div className="relative">
								<StageSelectDropdown
									currentStageId={Number(caseData.stageId) || 1}
									onStageChange={handleStageChange}
								/>
								{isUpdatingStage && (
									<div className="absolute -right-5 top-1/2 -translate-y-1/2">
										<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
									</div>
								)}
							</div>
						</div>

						<div className="h-5 w-px bg-border" />

						{/* Resultado (En Progreso / Ganado / Perdido) */}
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Resultado
							</span>
							<div className="relative">
								<ResultSelectDropdown
									currentResult={caseData.status || "IN_PROGRESS"}
									onResultChange={handleResultChange}
								/>
								{isUpdatingResult && (
									<div className="absolute -right-5 top-1/2 -translate-y-1/2">
										<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Modal: Estado del caso / WhatsApp */}
			<Dialog open={isWhatsappModalOpen} onOpenChange={(open) => !open && setIsWhatsappModalOpen(false)}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Estado del caso</DialogTitle>
						<DialogDescription>
							Caso #{caseData.number ?? caseData.id} &middot; Etapa:{" "}
							<span className="font-medium text-[#09a4b5]">
								{currentStageLabel}
							</span>
						</DialogDescription>
					</DialogHeader>

					{/* Destinatario */}
					<div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
						<div className="h-9 w-9 rounded-full bg-[#09a4b5] flex items-center justify-center text-white font-semibold text-sm shrink-0">
							{caseData.customer?.name?.charAt(0).toUpperCase() || "C"}
						</div>
						<div className="min-w-0">
							<p className="text-sm font-medium text-foreground truncate">
								{caseData.customer?.name || "Cliente"}
							</p>
							<p className="text-xs text-muted-foreground truncate">
								{(caseData.customer as any)?.phone || "Sin teléfono registrado"}
							</p>
						</div>
					</div>

					{/* Mensaje */}
					<div>
						<label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
							Mensaje para el cliente
						</label>
						<textarea
							ref={messageInputRef}
							value={whatsappMessage}
							onChange={(e) => setWhatsappMessage(e.target.value)}
							placeholder="Escribí el mensaje..."
							rows={6}
							className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-green-300 focus:outline-none focus:ring-2 focus:ring-green-100 transition-colors resize-none leading-relaxed"
						/>
						<p className="text-xs text-muted-foreground mt-1.5">
							El mensaje se genera automáticamente según la etapa. Podés editarlo
							antes de enviar.
						</p>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setWhatsappMessage(defaultMessage);
							}}
							className="text-muted-foreground"
						>
							Restablecer mensaje
						</Button>
						<Button
							variant="default"
							onClick={handleSendWhatsApp}
							className="px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
						>
							<svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
								<path d="M12.04 2C6.58 2 2.16 6.42 2.16 11.88c0 1.92.5 3.72 1.46 5.32L2 22l4.95-1.6c1.55.85 3.32 1.3 5.09 1.3h.01c5.46 0 9.88-4.42 9.88-9.88S17.5 2 12.04 2zm0 17.9c-1.63 0-3.23-.44-4.63-1.26l-.33-.19-2.94.95.96-2.86-.21-.34a7.8 7.8 0 01-1.2-4.12c0-4.32 3.52-7.84 7.85-7.84 2.09 0 4.05.81 5.53 2.29a7.78 7.78 0 012.3 5.55c0 4.33-3.52 7.82-7.83 7.82zm4.3-5.87c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.18-1.4-1.32-1.64-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.43h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.65.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28z" />
							</svg>
							Enviar por WhatsApp
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
