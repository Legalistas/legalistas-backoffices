"use client";

import {
	Archive,
	Bell,
	Check,
	Copy,
	FileDown,
	FileText,
	HeartPulse,
	Landmark,
	Link,
	Loader2,
	Mail,
	Percent,
	Save,
	Scale,
	Send,
	ShieldCheck,
	Star,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import TiptapEditor from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CASES_ENDPOINT,
	CASE_INFORME_ENDPOINT,
	CASE_INFORME_PUSH_ENDPOINT,
} from "@/constant/api-endpoints";
import { BASE_URL } from "@/constant/api-endpoints";
import { stageCases } from "@/lib/constant";
import type { Cases } from "@/types/cases";

const STAGE_DEFAULT_MESSAGES: Record<number, string> = {
	1: "<p>Estamos reuniendo y validando <strong>toda la documentación necesaria</strong> para impulsar tu reclamo de manera sólida. Este paso es clave para <strong>asegurar un proceso eficiente y con respaldo</strong>.</p><p>Nos estaremos comunicando en caso de requerir información o documentación adicional.</p>",
	2: "<p>Tu caso se encuentra en <strong>etapa administrativa</strong> y ya está en curso. En esta instancia se <strong>analizan los antecedentes</strong> y se realiza la <strong>evaluación médica correspondiente</strong>.</p><p>A partir de ello, se emitirá un <strong>dictamen que definirá tu situación</strong>.</p>",
	3: "<p>Tu caso se encuentra actualmente en <strong>etapa judicial</strong>. Nuestro objetivo es lograr una <strong>resolución favorable con el mejor resultado posible</strong>.</p>",
	4: "<p>Se determinó tu <strong>grado de incapacidad</strong> conforme a la evaluación médica. Este porcentaje es la <strong>base para calcular la indemnización correspondiente</strong>.</p>",
	5: "<p>Nos encontramos gestionando el <strong>cierre económico de tu caso</strong>. Trabajamos en la <strong>negociación para maximizar el resultado de tu indemnización</strong>. Te mantendremos informado en cada avance hasta su finalización.</p>",
	6: "<p>Tu experiencia es <strong>muy importante para nosotros</strong>. Queremos conocer tu <strong>opinión sobre el proceso con Legalistas</strong>. Nos ayuda a <strong>seguir mejorando nuestro servicio día a día</strong>.</p>",
	7: "<p>Tu caso ha sido <strong>finalizado correctamente</strong>. Toda la información quedó <strong>registrada en nuestra plataforma para su resguardo</strong>. Quedamos a tu disposición ante cualquier consulta futura.</p>",
};

const STAGE_WA_MESSAGES: Record<number, string> = {
	1: "Estamos reuniendo y validando toda la documentación necesaria para impulsar tu reclamo de manera sólida. Este paso es clave para asegurar un proceso eficiente y con respaldo.\n\nNos estaremos comunicando en caso de requerir información o documentación adicional.",
	2: "Tu caso se encuentra en etapa administrativa y ya está en curso. En esta instancia se analizan los antecedentes y se realiza la evaluación médica correspondiente.\n\nA partir de ello, se emitirá un dictamen que definirá tu situación.",
	3: "Tu caso se encuentra actualmente en etapa judicial. Nuestro objetivo es lograr una resolución favorable con el mejor resultado posible.",
	4: "Se determinó tu grado de incapacidad conforme a la evaluación médica. Este porcentaje es la base para calcular la indemnización correspondiente.",
	5: "Nos encontramos gestionando el cierre económico de tu caso. Trabajamos en la negociación para maximizar el resultado de tu indemnización. Te mantendremos informado en cada avance hasta su finalización.",
	6: "Tu experiencia es muy importante para nosotros. Queremos conocer tu opinión sobre el proceso con Legalistas. Nos ayuda a seguir mejorando nuestro servicio día a día.",
	7: "Tu caso ha sido finalizado correctamente. Toda la información quedó registrada en nuestra plataforma para su resguardo. Quedamos a tu disposición ante cualquier consulta futura.",
};

interface InformeTrimestralViewProps {
	caseData: Cases;
	onCaseUpdated?: () => void;
}

// Dominios de proveedores de email aceptados para envío de informes.
// Se cubren los más comunes en Argentina/LATAM. Para corporativos hay un override
// (warning en vez de bloqueo) — el envío se permite pero queda avisado.
const KNOWN_EMAIL_DOMAINS = new Set([
	"gmail.com",
	"googlemail.com",
	"hotmail.com",
	"hotmail.com.ar",
	"hotmail.es",
	"outlook.com",
	"outlook.com.ar",
	"outlook.es",
	"live.com",
	"live.com.ar",
	"msn.com",
	"yahoo.com",
	"yahoo.com.ar",
	"yahoo.es",
	"ymail.com",
	"icloud.com",
	"me.com",
	"mac.com",
	"aol.com",
	"protonmail.com",
	"proton.me",
	"zoho.com",
	"yandex.com",
	"fibertel.com.ar",
	"speedy.com.ar",
	"arnet.com.ar",
]);

// Palabras prohibidas en la parte local (antes del @) — para evitar envíos a
// emails de prueba o falsos ingresados por error.
const FORBIDDEN_LOCAL_PARTS = ["legalistas", "falso", "test", "prueba"];

type EmailValidation =
	| { kind: "ok" }
	| { kind: "warn"; message: string }
	| { kind: "error"; message: string };

function validateRecipientEmail(value: string): EmailValidation {
	const v = value.trim();
	if (!v) return { kind: "error", message: "Ingresá un email" };
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
		return { kind: "error", message: "El email no tiene un formato válido" };
	}
	const [local, domain] = v.toLowerCase().split("@");
	for (const forbidden of FORBIDDEN_LOCAL_PARTS) {
		if (local.includes(forbidden)) {
			return {
				kind: "error",
				message: `El email contiene "${forbidden}" — parece de prueba o no válido`,
			};
		}
	}
	if (!KNOWN_EMAIL_DOMAINS.has(domain)) {
		return {
			kind: "warn",
			message: `El dominio "${domain}" no es de un proveedor conocido. Verificá que sea correcto.`,
		};
	}
	return { kind: "ok" };
}

export function InformeTrimestralView({
	caseData,
	onCaseUpdated,
}: InformeTrimestralViewProps) {
	const { data: session } = useSession();
	const currentStageId = Number(caseData.stageId) || 1;
	const [estadoActual, setEstadoActual] = useState(
		STAGE_DEFAULT_MESSAGES[currentStageId] || STAGE_DEFAULT_MESSAGES[1],
	);
	const [incapacityPercentage, setIncapacityPercentage] = useState(
		caseData.disabilityPercentage != null
			? String(caseData.disabilityPercentage)
			: "",
	);
	const expedientes = caseData.files || [];
	const [selectedFileId, setSelectedFileId] = useState<string>(
		expedientes[0]?.id ? String(expedientes[0].id) : "",
	);
	const selectedFile = expedientes.find(
		(f) => String(f.id) === selectedFileId,
	);
	const displayCaseNumber =
		selectedFile?.cuij?.trim() ||
		caseData.number ||
		String(caseData.id);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [isSendingEmail, setIsSendingEmail] = useState(false);
	const [isSendingPush, setIsSendingPush] = useState(false);
	const [emailDialogOpen, setEmailDialogOpen] = useState(false);
	const [emailDraft, setEmailDraft] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [autoSavingIncapacity, setAutoSavingIncapacity] = useState<
		"idle" | "saving" | "saved"
	>("idle");
	const [downloadLink, setDownloadLink] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const previewRef = useRef<HTMLDivElement>(null);
	const prevStageIdRef = useRef(currentStageId);
	const lastSavedIncapacityRef = useRef<string>(
		caseData.disabilityPercentage != null
			? String(caseData.disabilityPercentage)
			: "",
	);
	const stageLabel =
		stageCases.find((s) => s.value === currentStageId)?.label ||
		"Documentación";

	// Si cambia la etapa, actualizar el texto del estado actual
	useEffect(() => {
		if (prevStageIdRef.current !== currentStageId) {
			prevStageIdRef.current = currentStageId;
			setEstadoActual(
				STAGE_DEFAULT_MESSAGES[currentStageId] || STAGE_DEFAULT_MESSAGES[1],
			);
		}
	}, [currentStageId]);

	// Cargar link de descarga existente al montar
	useEffect(() => {
		const fetchExistingInforme = async () => {
			try {
				const response = await fetch(CASE_INFORME_ENDPOINT(caseData.id), {
					headers: {
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				});
				if (response.ok) {
					const result = await response.json();
					if (result.data?.downloadToken) {
						setDownloadLink(`https://legalistas.ar/informes/${result.data.downloadToken}`);
					}
				}
			} catch {
				// silently ignore
			}
		};
		if (session?.user?.accessToken) {
			fetchExistingInforme();
		}
	}, [caseData.id, session?.user?.accessToken]);

	const saveToDb = useCallback(
		async (fields: {
			estadoActual?: string;
			disabilityPercentage?: number | null;
			informeSavedAt?: string;
			informeSentWhatsappAt?: string | null;
			informeSentEmailAt?: string | null;
			informeSentPushAt?: string | null;
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

	// Auto-save del porcentaje de incapacidad con debounce (~600ms).
	// PUT silencioso (sin tocar isSaving para no deshabilitar el botón Guardar)
	// y feedback "Guardado" breve al lado del input.
	useEffect(() => {
		const value = incapacityPercentage.trim();
		if (value === lastSavedIncapacityRef.current.trim()) return;

		// Validar: vacío OK, o número entre 0 y 100
		if (value !== "") {
			const n = Number(value);
			if (!Number.isFinite(n) || n < 0 || n > 100) return;
		}

		const token = session?.user?.accessToken;
		if (!token) return;

		const handle = setTimeout(async () => {
			try {
				setAutoSavingIncapacity("saving");
				const res = await fetch(`${CASES_ENDPOINT}/${caseData.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({
						disabilityPercentage: value ? Number.parseFloat(value) : null,
					}),
				});
				if (!res.ok) throw new Error("Error al guardar incapacidad");
				lastSavedIncapacityRef.current = value;
				setAutoSavingIncapacity("saved");
				onCaseUpdated?.();
				setTimeout(() => setAutoSavingIncapacity("idle"), 1500);
			} catch (err) {
				console.error("Auto-save incapacity failed:", err);
				setAutoSavingIncapacity("idle");
				toast.error("No se pudo guardar el % de incapacidad");
			}
		}, 600);

		return () => clearTimeout(handle);
	}, [
		incapacityPercentage,
		caseData.id,
		session?.user?.accessToken,
		onCaseUpdated,
	]);

	const uploadPdfBlob = async (blob: Blob): Promise<string | null> => {
		const fileName = `Informe_Trimestral_${caseData.number || caseData.id}_${caseData.customer?.name?.replace(/\s+/g, "_") || "cliente"}.pdf`;
		const formData = new FormData();
		formData.append("file", blob, fileName);
		formData.append(
			"title",
			`Informe Trimestral - Caso #${caseData.number || caseData.id} - ${caseData.customer?.name || ""}`,
		);

		const response = await fetch(CASE_INFORME_ENDPOINT(caseData.id), {
			method: "POST",
			headers: {
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
			body: formData,
		});

		if (!response.ok) throw new Error("Error al subir el PDF");
		const result = await response.json();
		return result.data?.downloadToken || null;
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			// 1. Generar el PDF primero (antes de cualquier re-render)
			toast.info("Generando informe...");
			const blob = await generatePdfBlob();
			if (!blob) throw new Error("No se pudo generar el PDF");

			// 2. Guardar datos en la DB.
			// Al subir un informe nuevo se resetea el indicador de envío por WhatsApp:
			// el cliente nunca recibió esta versión, así que el "tilde" anterior
			// dejaría de tener sentido.
			const fields: {
				estadoActual: string;
				disabilityPercentage: number | null;
				informeSavedAt: string;
				informeSentWhatsappAt: null;
				informeSentEmailAt: null;
				informeSentPushAt: null;
			} = {
				estadoActual,
				disabilityPercentage: incapacityPercentage
					? Number.parseFloat(incapacityPercentage)
					: null,
				informeSavedAt: new Date().toISOString(),
				informeSentWhatsappAt: null,
				informeSentEmailAt: null,
				informeSentPushAt: null,
			};
			await saveToDb(fields);

			// 3. Subir el PDF generado al backend
			toast.info("Subiendo informe al servidor...");
			const token = await uploadPdfBlob(blob);
			if (token) {
				setDownloadLink(`https://legalistas.ar/informes/${token}`);
			}
			onCaseUpdated?.();
			toast.success("Informe guardado correctamente");
		} catch (error) {
			console.error("Error saving informe:", error);
			toast.error("Error al guardar el informe");
		} finally {
			setIsSaving(false);
		}
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

	const handleSendPush = async () => {
		setIsSendingPush(true);
		toast.info("Preparando notificación push...");
		try {
			// Si no hay link, generamos y subimos primero el PDF.
			let link = downloadLink;
			if (!link) {
				const blob = await generatePdfBlob();
				if (!blob) throw new Error("No se pudo generar el PDF");
				const token = await uploadPdfBlob(blob);
				if (token) {
					link = `https://legalistas.ar/informes/${token}`;
					setDownloadLink(link);
				}
			}
			if (!link) throw new Error("No se pudo generar el link del informe");

			// El backend resuelve OneSignal (player_id / external_user_id del cliente).
			const res = await fetch(CASE_INFORME_PUSH_ENDPOINT(caseData.id), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					title: `Informe trimestral — ${stageLabel}`,
					message: `Hola ${caseData.customer?.name?.split(" ")[0] || ""}, está disponible tu informe trimestral. Tocá para verlo.`,
					url: link,
					isResend: !!caseData.informeSentPushAt,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(
					err?.message || err?.error || `Error ${res.status} al enviar push`,
				);
			}

			await saveToDb({ informeSentPushAt: new Date().toISOString() });
			onCaseUpdated?.();
			toast.success("Notificación push enviada al cliente");
		} catch (error) {
			console.error("Error sending push:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "No se pudo enviar la notificación push",
			);
		} finally {
			setIsSendingPush(false);
		}
	};

	const openEmailDialog = () => {
		const customerEmail = (caseData.customer as any)?.email ?? "";
		setEmailDraft(customerEmail);
		setEmailDialogOpen(true);
	};

	const handleSendEmail = async () => {
		const trimmed = emailDraft.trim();
		const validation = validateRecipientEmail(trimmed);
		if (validation.kind === "error") {
			toast.error(validation.message);
			return;
		}

		setIsSendingEmail(true);
		toast.info("Preparando informe para email...");
		try {
			// Si no hay link, generamos y subimos primero el PDF
			let link = downloadLink;
			if (!link) {
				const blob = await generatePdfBlob();
				if (!blob) throw new Error("No se pudo generar el PDF");
				const token = await uploadPdfBlob(blob);
				if (token) {
					link = `https://legalistas.ar/informes/${token}`;
					setDownloadLink(link);
				}
			}

			const stageMessage = STAGE_WA_MESSAGES[currentStageId] || "";

			// Envía email + registra en el timeline del caso (email-log).
			const res = await fetch("/api/notifications/email", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					to: trimmed,
					template: "case-informe-trimestral",
					caseId: caseData.id,
					accessToken: session?.user?.accessToken,
					isResend: !!caseData.informeSentEmailAt,
					variables: {
						customerName: caseData.customer?.name,
						caseNumber: caseData.number
							? String(caseData.number)
							: String(caseData.id),
						caseTitle: caseData.title,
						stageLabel,
						stageMessage,
						informeLink: link || undefined,
						responsibleLawyerName: caseData.responsibleLawyer?.name,
					},
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err?.error || "Error al enviar el email");
			}

			await saveToDb({ informeSentEmailAt: new Date().toISOString() });
			onCaseUpdated?.();
			toast.success(`Informe enviado a ${trimmed}`);
			setEmailDialogOpen(false);
		} catch (error) {
			console.error("Error sending via Email:", error);
			toast.error(
				error instanceof Error ? error.message : "No se pudo enviar el email",
			);
		} finally {
			setIsSendingEmail(false);
		}
	};

	const handleSendWhatsApp = async () => {
		setIsSending(true);
		toast.info("Preparando informe para WhatsApp...");
		try {
			// Si no hay link, primero guardar y generar
			let link = downloadLink;
			if (!link) {
				const blob = await generatePdfBlob();
				if (!blob) throw new Error("No se pudo generar el PDF");
				const token = await uploadPdfBlob(blob);
				if (token) {
					link = `https://legalistas.ar/informes/${token}`;
					setDownloadLink(link);
				}
			}

			const stageMsg = STAGE_WA_MESSAGES[currentStageId] || "";
			const message = `Hola ${caseData.customer?.name || ""}! Le enviamos el informe trimestral del estado de su reclamo (Caso #${caseData.number || caseData.id}).\n\n${stageMsg}\n\n${link ? `Puede descargar su informe completo en PDF aquí:\n${link}` : ""}\n\nSi observa algún error en el documento, por favor avísenos para corregirlo a la brevedad.`;
			const customerPhone = (caseData.customer as any)?.userProfile?.phone;
			const cleanPhone = customerPhone?.replace(/[\s\-()]/g, "") || "";
			const waUrl = cleanPhone
				? `https://web.whatsapp.com/send?phone=+549${cleanPhone}&text=${encodeURIComponent(message)}`
				: `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
			window.open(waUrl, "_blank");

			// Registrar envío por WhatsApp en la DB
			await saveToDb({ informeSentWhatsappAt: new Date().toISOString() });
			onCaseUpdated?.();
			toast.success("WhatsApp abierto con el link del informe.");
		} catch (error) {
			if ((error as Error)?.name !== "AbortError") {
				console.error("Error sending via WhatsApp:", error);
				toast.error("No se pudo enviar por WhatsApp");
			}
		} finally {
			setIsSending(false);
		}
	};

	const handleCopyLink = async () => {
		if (!downloadLink) return;
		await navigator.clipboard.writeText(downloadLink);
		setCopied(true);
		toast.success("Link copiado al portapapeles");
		setTimeout(() => setCopied(false), 2000);
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
					{expedientes.length > 0 && (
						<div className="space-y-2">
							<p className="text-sm font-semibold text-foreground">
								Seleccionar Expediente
							</p>
							<Select
								value={selectedFileId}
								onValueChange={setSelectedFileId}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Elegí un expediente" />
								</SelectTrigger>
								<SelectContent>
									{expedientes.map((f) => {
										const label =
											f.cuij?.trim() ||
											f.title?.trim() ||
											`Expediente #${f.id}`;
										return (
											<SelectItem key={f.id} value={String(f.id)}>
												{label}
											</SelectItem>
										);
									})}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								El N° del informe (cabecera del PDF) se toma del CUIJ del
								expediente seleccionado.
							</p>
						</div>
					)}

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<p className="text-sm font-semibold text-foreground">
								Porcentaje de Incapacidad
							</p>
							{autoSavingIncapacity === "saving" && (
								<span className="text-[11px] text-muted-foreground flex items-center gap-1">
									<Loader2 className="h-3 w-3 animate-spin" />
									Guardando…
								</span>
							)}
							{autoSavingIncapacity === "saved" && (
								<span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
									<Check className="h-3 w-3" />
									Guardado
								</span>
							)}
						</div>
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
							Dejalo vacío si aún no se determinó. Se guarda automáticamente.
						</p>
					</div>

					<div className="pt-2 space-y-2">
						<Button
							onClick={handleSave}
							disabled={isSaving || isGenerating}
							variant="outline"
							className="w-full"
						>
							{isSaving ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Save className="mr-2 h-4 w-4" />
							)}
							{isSaving ? "Guardando..." : "Guardar y subir informe"}
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
							disabled={isSending || isGenerating || isSaving || isSendingEmail}
							className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
						>
							{isSending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Send className="mr-2 h-4 w-4" />
							)}
							{isSending ? "Enviando..." : "Enviar por WhatsApp"}
						</Button>
						<Button
							onClick={openEmailDialog}
							disabled={isSending || isGenerating || isSaving || isSendingEmail || isSendingPush}
							className="w-full bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
						>
							{isSendingEmail ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Mail className="mr-2 h-4 w-4" />
							)}
							{isSendingEmail ? "Enviando..." : "Enviar por Email"}
						</Button>
						<Button
							onClick={handleSendPush}
							disabled={isSending || isGenerating || isSaving || isSendingEmail || isSendingPush}
							className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white"
						>
							{isSendingPush ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Bell className="mr-2 h-4 w-4" />
							)}
							{isSendingPush ? "Enviando..." : "Enviar por Push"}
						</Button>
					</div>

					{/* Link de descarga generado */}
					{downloadLink && (
						<div className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
							<div className="flex items-center gap-2">
								<Link className="h-4 w-4 text-green-600" />
								<p className="text-xs font-semibold text-green-700">
									Link de descarga generado
								</p>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="text"
									readOnly
									value={downloadLink}
									className="flex-1 text-xs bg-white border rounded px-2 py-1.5 text-gray-700 select-all"
								/>
								<Button
									size="sm"
									variant="outline"
									onClick={handleCopyLink}
									className="shrink-0 h-8"
								>
									{copied ? (
										<Check className="h-3.5 w-3.5 text-green-600" />
									) : (
										<Copy className="h-3.5 w-3.5" />
									)}
								</Button>
							</div>
						</div>
					)}

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
							{selectedFile && (
								<p>
									<span className="text-muted-foreground">Expediente:</span>{" "}
									{selectedFile.cuij?.trim() ||
										selectedFile.title ||
										`#${selectedFile.id}`}
								</p>
							)}
							<p>
								<span className="text-muted-foreground">Etapa:</span>{" "}
								{stageLabel}
							</p>
							<p>
								<span className="text-muted-foreground">Guardado:</span>{" "}
								{caseData.informeSavedAt ? (
									<span className="text-green-600 inline-flex items-center gap-1">
										<Check className="h-3.5 w-3.5 shrink-0" />
										{new Date(caseData.informeSavedAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
									</span>
								) : (
									<span className="text-muted-foreground">No</span>
								)}
							</p>
							<p>
								<span className="text-muted-foreground">WhatsApp:</span>{" "}
								{caseData.informeSentWhatsappAt ? (
									<span className="text-green-600 inline-flex items-center gap-1">
										<Check className="h-3.5 w-3.5 shrink-0" />
										{new Date(caseData.informeSentWhatsappAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
									</span>
								) : (
									<span className="text-muted-foreground">No</span>
								)}
							</p>
							<p>
								<span className="text-muted-foreground">Email:</span>{" "}
								{caseData.informeSentEmailAt ? (
									<span className="text-green-600 inline-flex items-center gap-1">
										<Check className="h-3.5 w-3.5 shrink-0" />
										{new Date(caseData.informeSentEmailAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
									</span>
								) : (
									<span className="text-muted-foreground">No</span>
								)}
							</p>
							<p>
								<span className="text-muted-foreground">Push:</span>{" "}
								{caseData.informeSentPushAt ? (
									<span className="text-green-600 inline-flex items-center gap-1">
										<Check className="h-3.5 w-3.5 shrink-0" />
										{new Date(caseData.informeSentPushAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
									</span>
								) : (
									<span className="text-muted-foreground">No</span>
								)}
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
					caseNumber={displayCaseNumber}
					stageId={currentStageId}
					estadoActualHtml={estadoActual}
					incapacityPercentage={incapacityPercentage}
				/>
			</div>

			<Dialog
				open={emailDialogOpen}
				onOpenChange={(open) => {
					if (!isSendingEmail) setEmailDialogOpen(open);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Mail className="h-5 w-5 text-[#0ea5e9]" />
							Enviar informe por email
						</DialogTitle>
						<DialogDescription>
							Confirmá la dirección. Podés editarla si querés enviarlo a otro
							destinatario; no se modifica el email del cliente en su ficha.
						</DialogDescription>
					</DialogHeader>

					{(() => {
						const validation = validateRecipientEmail(emailDraft);
						const isError = validation.kind === "error";
						const isWarn = validation.kind === "warn";
						const isOk = validation.kind === "ok";
						const customerEmail = (caseData.customer as any)?.email as
							| string
							| undefined;
						const differsFromCustomer =
							!!customerEmail &&
							emailDraft.trim() !== customerEmail.trim();
						return (
							<>
								<div className="space-y-2 py-2">
									<Label htmlFor="informe-email-to" className="text-sm">
										Email del destinatario
									</Label>
									<Input
										id="informe-email-to"
										type="email"
										value={emailDraft}
										onChange={(e) => setEmailDraft(e.target.value)}
										placeholder="cliente@ejemplo.com"
										disabled={isSendingEmail}
										className={
											isError
												? "border-red-400 focus-visible:ring-red-400"
												: isWarn
													? "border-amber-400 focus-visible:ring-amber-400"
													: ""
										}
										onKeyDown={(e) => {
											if (
												e.key === "Enter" &&
												!isSendingEmail &&
												!isError
											) {
												e.preventDefault();
												handleSendEmail();
											}
										}}
									/>
									{isError && (
										<p className="text-[11px] text-red-600 dark:text-red-400">
											{validation.message}
										</p>
									)}
									{isWarn && (
										<p className="text-[11px] text-amber-600 dark:text-amber-400">
											{validation.message}
										</p>
									)}
									{isOk && differsFromCustomer && (
										<p className="text-[11px] text-amber-600 dark:text-amber-400">
											Vas a enviar a un email distinto al registrado del
											cliente.
										</p>
									)}
								</div>

								<DialogFooter className="gap-2">
									<Button
										variant="outline"
										onClick={() => setEmailDialogOpen(false)}
										disabled={isSendingEmail}
									>
										Cancelar
									</Button>
									<Button
										onClick={handleSendEmail}
										disabled={
											isSendingEmail || isError || !emailDraft.trim()
										}
										className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white"
									>
										{isSendingEmail ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Enviando...
											</>
										) : (
											<>
												<Mail className="mr-2 h-4 w-4" />
												Enviar
											</>
										)}
									</Button>
								</DialogFooter>
							</>
						);
					})()}
				</DialogContent>
			</Dialog>
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
