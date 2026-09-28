"use client";

import {
	Bell,
	Check,
	Copy,
	FileDown,
	Link,
	Loader2,
	Mail,
	Percent,
	Save,
	Send,
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
	CASE_INFORME_ENVIOS_ENDPOINT,
	CASE_INFORME_GENERATE_PDF_ENDPOINT,
} from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";
import { stageCases } from "@/lib/constant";
import type { Cases } from "@/types/cases";
import { fechaHora, type InformeHistorial, InformesHistorial } from "./InformesHistorial";
import { VistaPreviaInforme } from "./VistaPreviaInforme";

/** Página pública del informe (legalistas.ar): el link que recibe el cliente. */
const linkInforme = (token: string) => `https://legalistas.ar/informes/${token}`;

/** Versión del informe guardada en esta sesión y el contenido con que se generó. */
interface VersionInforme {
	id: number;
	token: string;
	firma: string;
}

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
	const [version, setVersion] = useState<VersionInforme | null>(null);
	const [recargarHistorial, setRecargarHistorial] = useState(0);
	// Versión del historial a reenviar por email; null = la de la pantalla.
	const [reenvio, setReenvio] = useState<InformeHistorial | null>(null);
	// Lo que determina el PDF: si no cambió, se reusa la versión ya guardada.
	const firma = JSON.stringify([
		estadoActual,
		incapacityPercentage,
		currentStageId,
		displayCaseNumber,
		caseData.customer?.name,
	]);
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
				if (!response.ok)
					throw new Error(
						await apiErrorMessage(
							response,
							"No se pudieron guardar los datos del informe",
						),
					);
				onCaseUpdated?.();
			} catch (error) {
				console.error("Error saving informe data:", error);
				toast.error(
					error instanceof Error
						? error.message
						: "No se pudieron guardar los datos del informe",
				);
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
				if (!res.ok)
					throw new Error(
						await apiErrorMessage(res, "No se pudo guardar el % de incapacidad"),
					);
				lastSavedIncapacityRef.current = value;
				setAutoSavingIncapacity("saved");
				onCaseUpdated?.();
				setTimeout(() => setAutoSavingIncapacity("idle"), 1500);
			} catch (err) {
				console.error("Auto-save incapacity failed:", err);
				setAutoSavingIncapacity("idle");
				toast.error(
					err instanceof Error
						? err.message
						: "No se pudo guardar el % de incapacidad",
				);
			}
		}, 600);

		return () => clearTimeout(handle);
	}, [
		incapacityPercentage,
		caseData.id,
		session?.user?.accessToken,
		onCaseUpdated,
	]);

	/** Sube el PDF: el backend lo guarda en MinIO como versión nueva del historial. */
	const uploadPdfBlob = async (blob: Blob): Promise<{ id: number; token: string }> => {
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

		if (!response.ok)
			throw new Error(await apiErrorMessage(response, "Error al subir el PDF"));
		const result = await response.json();
		if (!result.data?.id || !result.data?.downloadToken)
			throw new Error("El servidor no devolvió el informe guardado");
		return { id: result.data.id, token: result.data.downloadToken };
	};

	/**
	 * Genera el PDF de lo que está en pantalla y lo guarda como versión nueva
	 * (historial). También guarda el estado actual y el % en el caso.
	 */
	const guardarVersion = async (): Promise<VersionInforme> => {
		toast.info("Generando informe...");
		const blob = await generatePdfBlob();
		if (!blob) throw new Error("No se pudo generar el PDF");

		// Las marcas de envío del caso son de la última versión: esta todavía
		// no se mandó.
		await saveToDb({
			estadoActual,
			disabilityPercentage: incapacityPercentage
				? Number.parseFloat(incapacityPercentage)
				: null,
			informeSavedAt: new Date().toISOString(),
			informeSentWhatsappAt: null,
			informeSentEmailAt: null,
			informeSentPushAt: null,
		});

		const subido = await uploadPdfBlob(blob);
		const nueva = { ...subido, firma };
		setVersion(nueva);
		setDownloadLink(linkInforme(nueva.token));
		setRecargarHistorial((n) => n + 1);
		return nueva;
	};

	/** La versión de lo que se ve: si ya se guardó sin cambios, esa; si no, una nueva. */
	const asegurarVersion = async () =>
		version && version.firma === firma ? version : guardarVersion();

	/** Manda (o registra, en WhatsApp) el envío de una versión al cliente. */
	const registrarEnvio = async (documentId: number, envio: Record<string, unknown>) => {
		const res = await fetch(CASE_INFORME_ENVIOS_ENDPOINT(caseData.id, documentId), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
			body: JSON.stringify(envio),
		});
		if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo enviar el informe"));
		setRecargarHistorial((n) => n + 1);
		onCaseUpdated?.();
	};

	const handleSave = async () => {
		if (version && version.firma === firma) {
			toast.info("Este informe ya está guardado en el historial");
			return;
		}
		setIsSaving(true);
		try {
			await guardarVersion();
			onCaseUpdated?.();
			toast.success("Informe guardado en el historial");
		} catch (error) {
			console.error("Error saving informe:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al guardar el informe",
			);
		} finally {
			setIsSaving(false);
		}
	};

	// Genera el PDF real server-side (Puppeteer, texto real) a partir del
	// estado actual editado en pantalla — reemplaza la vieja captura
	// html2canvas + jsPDF de una sola imagen.
	const generatePdfBlob = async (): Promise<Blob | null> => {
		const response = await fetch(CASE_INFORME_GENERATE_PDF_ENDPOINT(caseData.id), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session?.user?.accessToken}`,
			},
			body: JSON.stringify({
				customerName: caseData.customer?.name || "Cliente",
				caseNumber: displayCaseNumber,
				stageId: currentStageId,
				estadoActualHtml: estadoActual,
				incapacityPercentage,
			}),
		});
		if (!response.ok)
			throw new Error(
				await apiErrorMessage(response, "No se pudo generar el PDF"),
			);
		return response.blob();
	};

	const handleGeneratePdf = async () => {
		setIsGenerating(true);
		toast.info("Generando informe trimestral...");
		try {
			const blob = await generatePdfBlob();
			if (!blob) throw new Error("No se pudo generar el PDF");

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `Informe_Trimestral_${caseData.number || caseData.id}_${caseData.customer?.name?.replace(/\s+/g, "_") || "cliente"}.pdf`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			toast.success("Informe trimestral descargado correctamente");
		} catch (error) {
			console.error("Error generating quarterly report PDF:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "No se pudo generar el informe trimestral",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSendPush = async () => {
		setIsSendingPush(true);
		toast.info("Preparando notificación push...");
		try {
			const v = await asegurarVersion();
			// El backend resuelve OneSignal (player_id / external_user_id del cliente).
			await registrarEnvio(v.id, {
				canal: "PUSH",
				title: `Informe periódico — ${stageLabel}`,
				message: `Hola ${caseData.customer?.name?.split(" ")[0] || ""}, te enviamos tu informe periódico. Tocá para verlo.`,
			});
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

	/** Sin versión: la de la pantalla. Con versión: reenvío desde el historial. */
	const openEmailDialog = (informe: InformeHistorial | null = null) => {
		const customerEmail = (caseData.customer as any)?.email ?? "";
		setReenvio(informe);
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
		toast.info(reenvio ? "Reenviando informe..." : "Preparando informe para email...");
		try {
			// Reenvío de una versión del historial, o la de la pantalla (que se
			// guarda si todavía no está).
			const documentId = reenvio?.id ?? (await asegurarVersion()).id;
			// El backend manda el email ("Te hemos enviado tu informe periódico"),
			// lo deja en el timeline del caso y registra el envío.
			await registrarEnvio(documentId, {
				canal: "EMAIL",
				to: trimmed,
				stageLabel,
				stageMessage: STAGE_WA_MESSAGES[currentStageId] || "",
			});
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
			const v = await asegurarVersion();
			const link = linkInforme(v.token);

			const stageMsg = STAGE_WA_MESSAGES[currentStageId] || "";
			const message = `Hola ${caseData.customer?.name || ""}! Le enviamos el informe periódico del estado de su reclamo (Caso #${caseData.number || caseData.id}).\n\n${stageMsg}\n\nPuede descargar su informe completo en PDF aquí:\n${link}\n\nSi observa algún error en el documento, por favor avísenos para corregirlo a la brevedad.`;
			const customerPhone = (caseData.customer as any)?.userProfile?.phone;
			const cleanPhone = customerPhone?.replace(/[\s\-()]/g, "") || "";
			const waUrl = cleanPhone
				? `https://web.whatsapp.com/send?phone=+549${cleanPhone}&text=${encodeURIComponent(message)}`
				: `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
			window.open(waUrl, "_blank");

			// WhatsApp lo manda la persona desde su sesión: acá queda registrado.
			await registrarEnvio(v.id, { canal: "WHATSAPP", destinatario: cleanPhone || undefined });
			toast.success("WhatsApp abierto con el link del informe.");
		} catch (error) {
			if ((error as Error)?.name !== "AbortError") {
				console.error("Error sending via WhatsApp:", error);
				toast.error(
					error instanceof Error
						? error.message
						: "No se pudo enviar por WhatsApp",
				);
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
						{/* Acción principal: genera, guarda en el historial y manda el email. */}
						<Button
							onClick={() => openEmailDialog()}
							disabled={isSending || isGenerating || isSaving || isSendingEmail || isSendingPush}
							className="h-11 w-full bg-[#09a4b5] text-base hover:bg-[#078a99] text-white"
						>
							{isSendingEmail ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Mail className="mr-2 h-4 w-4" />
							)}
							{isSendingEmail ? "Enviando..." : "Enviar al cliente"}
						</Button>
						<p className="text-[11px] leading-snug text-muted-foreground">
							Genera el informe como se ve en la vista previa, lo guarda en el
							historial y le manda al cliente el email “Te hemos enviado tu
							informe periódico” con el link.
						</p>
						<div className="grid grid-cols-2 gap-2">
							<Button
								onClick={handleSendWhatsApp}
								disabled={isSending || isGenerating || isSaving || isSendingEmail || isSendingPush}
								className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
							>
								{isSending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Send className="mr-2 h-4 w-4" />
								)}
								WhatsApp
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
								Push
							</Button>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Button
								onClick={handleSave}
								disabled={isSaving || isGenerating || isSending || isSendingEmail || isSendingPush}
								variant="outline"
								className="w-full"
								title="Guarda esta versión en el historial sin mandarla"
							>
								{isSaving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Save className="mr-2 h-4 w-4" />
								)}
								Guardar
							</Button>
							<Button
								onClick={handleGeneratePdf}
								disabled={isGenerating || isSending}
								variant="outline"
								className="w-full"
								title="Descarga el PDF sin guardarlo"
							>
								{isGenerating ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<FileDown className="mr-2 h-4 w-4" />
								)}
								Descargar
							</Button>
						</div>
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
						</div>
					</div>
				</div>
			</div>

			{/* Historial: versiones guardadas y sus envíos (fecha, canal, destinatario). */}
			<InformesHistorial
				caseId={caseData.id}
				recargar={recargarHistorial}
				onReenviar={(informe) => openEmailDialog(informe)}
			/>

			{/* Vista previa: el mismo HTML que el PDF, en una hoja A4 de tamaño real. */}
			<VistaPreviaInforme
				caseId={caseData.id}
				datos={{
					customerName: caseData.customer?.name || "Cliente",
					caseNumber: displayCaseNumber,
					stageId: currentStageId,
					estadoActualHtml: estadoActual,
					incapacityPercentage,
				}}
				generarPdf={generatePdfBlob}
			/>

			<Dialog
				open={emailDialogOpen}
				onOpenChange={(open) => {
					if (!isSendingEmail) setEmailDialogOpen(open);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Mail className="h-5 w-5 text-[#09a4b5]" />
							{reenvio ? "Reenviar informe al cliente" : "Enviar informe al cliente"}
						</DialogTitle>
						<DialogDescription>
							{reenvio
								? `Se reenvía el informe del ${fechaHora(reenvio.uploadedAt)}.`
								: "Se guarda el informe como se ve en la vista previa y queda en el historial."}{" "}
							El cliente recibe el email “Te hemos enviado tu informe
							periódico” con el link. Podés cambiar la dirección; no se
							modifica el email de su ficha.
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
