"use client";

import { Editor } from "@tinymce/tinymce-react";
import {
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	Clock,
	Download,
	FileText,
	Loader2,
	Plus,
	Printer,
	Search,
	Send,
	Sparkles,
	Trash2,
	User,
	XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	CASE_CEDULA_BY_ID_ENDPOINT,
	CASE_CEDULAS_DRAFT_ENDPOINT,
	CASE_CEDULAS_ENDPOINT,
	CASE_PARTS_ENDPOINT,
	CASES_FILES_BY_CASE_ID_ENDPOINT,
} from "@/constant/api-endpoints";
import { TYPES_PROCCESS } from "@/constant/causes";
import { CEDULA_TEMPLATES } from "@/constant/cedula-templates";
import { useConfirm } from "@/hooks/useConfirm";
import type { CasesFiles } from "@/types/cases";

interface Cedula {
	id: number;
	caseFileId: number;
	cedulaType: string;
	partId: number;
	partName?: string;
	content: string;
	pdfPath?: string;
	juez?: string;
	secretaria?: string;
	generatedDate: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	caseFile?: {
		id: number;
		title: string;
		cuij?: string;
		typeProcessId?: number;
		parts?: { id: number; name: string; partyType: string }[];
		court?: {
			id: number;
			charter: string;
			courtName: string;
			secretary?: string;
			jurisdiction?: { id: number; name: string };
		};
	};
}

const estadoConfig: Record<
	string,
	{ label: string; color: string; icon: typeof CheckCircle2 }
> = {
	generada: {
		label: "Generada",
		color:
			"bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
		icon: CheckCircle2,
	},
	diligenciada: {
		label: "Diligenciada",
		color:
			"bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
		icon: CheckCircle2,
	},
	pendiente: {
		label: "Pendiente",
		color:
			"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
		icon: Clock,
	},
	devuelta: {
		label: "Devuelta",
		color:
			"bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
		icon: XCircle,
	},
};

const CEDULA_TYPE_OPTIONS = [
	{ value: "carta_certificada", label: "Carta certificada al demandado" },
	{ value: "comun_cualquiera", label: "Común a cualquiera" },
];

// Armar label del expediente con carátula: "Actor C/ Demandado S/ TipoProceso — CUIJ"
const getFileLabel = (f: any, customerName?: string): string => {
	const parts = f.parts || [];
	const actor = parts.find(
		(p: any) => p.partyType === "actor" || p.partyType === "demandante",
	);
	const demandado = parts.find((p: any) => p.partyType === "demandado");
	const actorName = actor?.name || customerName || "";
	const demandadoName = demandado?.name || (actorName ? "Sin partes" : "");
	const partesLabel = actorName ? `${actorName} C/ ${demandadoName}` : "";
	const processType = f.typeProcessId
		? TYPES_PROCCESS.find((t: any) => t.id === f.typeProcessId)?.value
		: "";
	const caratula = partesLabel
		? `${partesLabel}${processType ? ` S/ ${processType}` : ""}`
		: f.title || `Expediente #${f.id}`;
	return `${caratula}${f.cuij ? ` — ${f.cuij}` : ""}`;
};

interface CedulasViewProps {
	caseId: string;
	files?: CasesFiles[];
	customerName?: string;
}

export const CedulasView = ({
	caseId,
	files = [],
	customerName,
}: CedulasViewProps) => {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [cedulas, setCedulas] = useState<Cedula[]>([]);
	const [loading, setLoading] = useState(true);

	// Form state
	const [isCreating, setIsCreating] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [selectedFileId, setSelectedFileId] = useState<string>("");
	const [fileParts, setFileParts] = useState<any[]>([]);
	const [loadingParts, setLoadingParts] = useState(false);
	const [fileData, setFileData] = useState<any>(null);

	const [newCedula, setNewCedula] = useState({
		cedulaType: "carta_certificada",
		partId: "",
		juez: "",
		secretaria: "",
		content: "",
	});

	// AI draft state
	type AiSuggestion = {
		field: "juez" | "secretaria" | "cedulaType" | "partId" | "rawDecree";
		suggestedValue: string | number;
		rationale?: string;
		partName?: string;
	};
	type AiWarning = {
		severity: "error" | "warning" | "info";
		message: string;
		suggestion?: AiSuggestion;
	};
	const [aiOpen, setAiOpen] = useState(false);
	const [rawDecree, setRawDecree] = useState("");
	const [brief, setBrief] = useState("");
	const [isDrafting, setIsDrafting] = useState(false);
	const [aiWarnings, setAiWarnings] = useState<AiWarning[]>([]);
	const [acknowledgedErrors, setAcknowledgedErrors] = useState(false);

	// Dropdowns
	const [isFileOpen, setIsFileOpen] = useState(false);
	const [fileSearch, setFileSearch] = useState("");
	const fileRef = useRef<HTMLDivElement>(null);
	const fileSearchRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handle = (e: MouseEvent) => {
			if (isFileOpen && !fileRef.current?.contains(e.target as Node))
				setIsFileOpen(false);
		};
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, [isFileOpen]);

	useEffect(() => {
		if (isFileOpen) setTimeout(() => fileSearchRef.current?.focus(), 0);
	}, [isFileOpen]);

	const selectedFileLabel = useMemo(() => {
		const f = files.find((file) => file.id === selectedFileId);
		if (!f) return "Seleccionar expediente";
		return getFileLabel(f, customerName);
	}, [selectedFileId, files, customerName]);

	const searchedFiles = useMemo(() => {
		if (!fileSearch) return files;
		const q = fileSearch.toLowerCase();
		return files.filter(
			(f) =>
				f.title?.toLowerCase().includes(q) ||
				f.cuij?.toLowerCase().includes(q) ||
				f.id.toString().includes(q),
		);
	}, [files, fileSearch]);

	// Fetch all cedulas for the case
	const fetchCedulas = useCallback(async () => {
		try {
			const res = await fetch(CASE_CEDULAS_ENDPOINT(Number(caseId)), {
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
			});
			if (!res.ok) throw new Error("Error al cargar cédulas");
			const data = await res.json();
			setCedulas(data.cedulas || []);
		} catch (error) {
			console.error("Error fetching cedulas:", error);
		} finally {
			setLoading(false);
		}
	}, [caseId, session?.user?.accessToken]);

	useEffect(() => {
		if (session?.user?.accessToken) {
			fetchCedulas();
		} else {
			setLoading(false);
		}
	}, [fetchCedulas, session?.user?.accessToken]);

	// When file is selected, fetch file data (court) + case parts
	const fetchFileData = useCallback(
		async (fileId: number) => {
			if (!session?.user?.accessToken) return;
			setLoadingParts(true);
			try {
				const headers = { Authorization: `Bearer ${session.user.accessToken}` };
				// Fetch file data (court info) and case parts in parallel
				const [fileRes, partsRes] = await Promise.all([
					fetch(CASES_FILES_BY_CASE_ID_ENDPOINT(Number(caseId), fileId), {
						headers,
					}),
					fetch(CASE_PARTS_ENDPOINT(Number(caseId)), { headers }),
				]);
				if (!fileRes.ok) throw new Error("Error al cargar expediente");
				const data = await fileRes.json();
				setFileData(data);

				// Parts come from case-level parts endpoint
				if (partsRes.ok) {
					const partsData = await partsRes.json();
					const parts = (partsData.parts || partsData || []).map((p: any) => ({
						...p,
						_source: "case",
					}));
					setFileParts(parts);
				} else {
					setFileParts([]);
				}
			} catch (error) {
				console.error("Error fetching file data:", error);
				setFileParts([]);
				setFileData(null);
			} finally {
				setLoadingParts(false);
			}
		},
		[caseId, session?.user?.accessToken],
	);

	const handleFileSelect = (fileId: string) => {
		setSelectedFileId(fileId);
		setIsFileOpen(false);
		setFileSearch("");
		setNewCedula({ ...newCedula, partId: "", content: "" });
		fetchFileData(Number(fileId));
	};

	// Personalize template with file data
	const personalizeTemplate = useCallback(
		(template: string, customJuez?: string, customSecretaria?: string) => {
			let content = template;
			if (!fileData) return content;

			const court = fileData.court;
			const charter = court?.charter || "";
			const courtName = court?.courtName || "";
			const secretary = court?.secretary || "";
			const jurisdiction = court?.jurisdiction;
			const jurisdictionParts = jurisdiction?.name?.split(" - ") || [];
			const provincia = jurisdictionParts[0] || "";
			const ciudad = jurisdictionParts[jurisdictionParts.length - 1] || "";
			const fecha = new Date().toLocaleDateString("es-AR", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			});

			const customerName = fileData?.case?.customer?.name || "";
			const allParts = [...(fileData?.parts || []), ...fileParts];
			const firstPartName = allParts.length > 0 ? allParts[0]?.name : "";
			const caratula = getFileLabel(fileData, customerName);

			const juezValue = customJuez || fileData.judge || "[COMPLETAR DATO]";
			const secretariaValue =
				customSecretaria || secretary || "[COMPLETAR DATO]";

			const variables: Record<string, string> = {
				"{{JUZGADO}}":
					charter && courtName
						? `${charter} ${courtName}`
						: "[COMPLETAR JUZGADO]",
				"{{JURISDICCION}}": ciudad
					? ciudad.toUpperCase()
					: "[COMPLETAR JURISDICCION]",
				"{{CIUDAD}}": ciudad || "[COMPLETAR CIUDAD]",
				"{{PROVINCIA}}": provincia || "[COMPLETAR PROVINCIA]",
				"{{CIUDAD_PROVINCIA}}":
					ciudad && provincia
						? `${ciudad}. ${provincia}.`
						: "[COMPLETAR CIUDAD/PROVINCIA]",
				"{{FECHA}}": fecha,
				"{{JUEZ}}": juezValue,
				"{{SECRETARIA}}": secretariaValue,
				"{{CARATULA}}": caratula || "SIN CARÁTULA",
			};

			Object.entries(variables).forEach(([key, value]) => {
				content = content.replace(new RegExp(key, "g"), value);
			});

			return content;
		},
		[fileData, fileParts],
	);

	// When fileData loads, initialize the template
	useEffect(() => {
		if (fileData && isCreating) {
			const baseTemplate =
				CEDULA_TEMPLATES[
					newCedula.cedulaType as keyof typeof CEDULA_TEMPLATES
				] || "";
			setNewCedula((prev) => ({
				...prev,
				content: personalizeTemplate(baseTemplate, prev.juez, prev.secretaria),
			}));
		}
	}, [fileData, isCreating]);

	const handleCedulaTypeChange = (type: string) => {
		const baseTemplate =
			CEDULA_TEMPLATES[type as keyof typeof CEDULA_TEMPLATES] || "";
		let updatedContent = personalizeTemplate(
			baseTemplate,
			newCedula.juez,
			newCedula.secretaria,
		);
		if (newCedula.partId) {
			const selectedPart = fileParts.find(
				(p) => p.id.toString() === newCedula.partId,
			);
			if (selectedPart)
				updatedContent = applyPartDataToContent(updatedContent, selectedPart);
		}
		setNewCedula({ ...newCedula, cedulaType: type, content: updatedContent });
	};

	const handleJuezChange = (juez: string) => {
		const baseTemplate =
			CEDULA_TEMPLATES[newCedula.cedulaType as keyof typeof CEDULA_TEMPLATES] ||
			"";
		let updatedContent = personalizeTemplate(
			baseTemplate,
			juez,
			newCedula.secretaria,
		);
		if (newCedula.partId) {
			const selectedPart = fileParts.find(
				(p) => p.id.toString() === newCedula.partId,
			);
			if (selectedPart)
				updatedContent = applyPartDataToContent(updatedContent, selectedPart);
		}
		setNewCedula({ ...newCedula, juez, content: updatedContent });
	};

	const handleSecretariaChange = (secretaria: string) => {
		const baseTemplate =
			CEDULA_TEMPLATES[newCedula.cedulaType as keyof typeof CEDULA_TEMPLATES] ||
			"";
		let updatedContent = personalizeTemplate(
			baseTemplate,
			newCedula.juez,
			secretaria,
		);
		if (newCedula.partId) {
			const selectedPart = fileParts.find(
				(p) => p.id.toString() === newCedula.partId,
			);
			if (selectedPart)
				updatedContent = applyPartDataToContent(updatedContent, selectedPart);
		}
		setNewCedula({ ...newCedula, secretaria, content: updatedContent });
	};

	// Aplica datos de la parte seleccionada al contenido del template
	const applyPartDataToContent = (
		content: string,
		selectedPart: any,
	): string => {
		let updatedContent = content;
		const partName = selectedPart.name ? selectedPart.name.toUpperCase() : "";
		const partAddress =
			selectedPart.address && selectedPart.address !== "0"
				? `DOMICILIO: ${selectedPart.address.toUpperCase()}`
				: "DOMICILIO: [COMPLETAR DATO]";
		const city =
			selectedPart.city && selectedPart.city !== "0"
				? selectedPart.city.toUpperCase()
				: "";

		const stateNames: Record<number, string> = {
			21: "SANTA FE",
			1: "BUENOS AIRES",
			2: "CATAMARCA",
			3: "CHACO",
			4: "CHUBUT",
			5: "CORDOBA",
			6: "CORRIENTES",
			7: "ENTRE RIOS",
			8: "FORMOSA",
			9: "JUJUY",
			10: "LA PAMPA",
			11: "LA RIOJA",
			12: "MENDOZA",
			13: "MISIONES",
			14: "NEUQUEN",
			15: "RIO NEGRO",
			16: "SALTA",
			17: "SAN JUAN",
			18: "SAN LUIS",
			19: "SANTA CRUZ",
			20: "SANTIAGO DEL ESTERO",
			22: "TIERRA DEL FUEGO",
			23: "TUCUMAN",
		};
		const province = selectedPart.stateId
			? stateNames[selectedPart.stateId] || ""
			: "";
		const locationLine = [city, province].filter(Boolean).join(" - ");

		// Regex para reemplazar las 3 líneas del destinatario en el template (nombre, domicilio, ubicación)
		const regex1 =
			/(<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong><\/span><\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)(DOMICILIO:[^<]+)(<\/strong><\/span>[^<]*<\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong>)/i;
		if (regex1.test(updatedContent)) {
			updatedContent = updatedContent.replace(
				regex1,
				`$1${partName}$3${partAddress}$5${locationLine}$7`,
			);
		}

		// Segundo bloque (si hay copia)
		const regex2 =
			/(<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong><\/span><\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)(DOMICILIO:[^<]+)(<\/strong><\/span><\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong>)/i;
		if (regex2.test(updatedContent)) {
			updatedContent = updatedContent.replace(
				regex2,
				`$1${partName}$3${partAddress}$5${locationLine}$7`,
			);
		}

		return updatedContent;
	};

	const handlePartChange = (partId: string) => {
		const selectedPart = fileParts.find((p) => p.id.toString() === partId);
		const baseTemplate =
			CEDULA_TEMPLATES[newCedula.cedulaType as keyof typeof CEDULA_TEMPLATES] ||
			"";
		let updatedContent = personalizeTemplate(
			baseTemplate,
			newCedula.juez,
			newCedula.secretaria,
		);

		if (selectedPart) {
			updatedContent = applyPartDataToContent(updatedContent, selectedPart);
		}

		setNewCedula({ ...newCedula, partId, content: updatedContent });
	};

	const handleOpenNew = () => {
		setSelectedFileId("");
		setFileParts([]);
		setFileData(null);
		setNewCedula({
			cedulaType: "carta_certificada",
			partId: "",
			juez: "",
			secretaria: "",
			content: "",
		});
		setRawDecree("");
		setBrief("");
		setAiWarnings([]);
		setAcknowledgedErrors(false);
		setAiOpen(false);
		setIsCreating(true);
	};

	const applySuggestion = (s: AiSuggestion, warningIdx: number) => {
		const val = s.suggestedValue;
		switch (s.field) {
			case "juez":
				handleJuezChange(String(val));
				break;
			case "secretaria":
				handleSecretariaChange(String(val));
				break;
			case "cedulaType":
				handleCedulaTypeChange(String(val));
				break;
			case "partId":
				handlePartChange(String(val));
				break;
			case "rawDecree":
				setRawDecree(String(val));
				toast.info("Decreto reemplazado. Volvé a generar el borrador.");
				break;
		}
		// Marcar el warning como aplicado removiendo la sugerencia
		setAiWarnings((prev) =>
			prev.map((w, i) =>
				i === warningIdx ? { ...w, suggestion: undefined } : w,
			),
		);
		toast.success("Sugerencia aplicada");
	};

	const handleGenerateAIDraft = async () => {
		if (!selectedFileId) {
			toast.error("Seleccioná un expediente");
			return;
		}
		if (!newCedula.partId) {
			toast.error("Seleccioná al menos una parte");
			return;
		}
		setIsDrafting(true);
		setAiWarnings([]);
		setAcknowledgedErrors(false);
		try {
			const res = await fetch(CASE_CEDULAS_DRAFT_ENDPOINT(Number(caseId)), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					fileId: selectedFileId,
					partIds: [Number(newCedula.partId)],
					cedulaType: newCedula.cedulaType,
					rawDecree: rawDecree.trim() || undefined,
					brief: brief.trim() || undefined,
					juez: newCedula.juez || undefined,
					secretaria: newCedula.secretaria || undefined,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || err.error || "Error al generar borrador");
			}
			const data = await res.json();
			setNewCedula((prev) => ({ ...prev, content: data.content || "" }));
			const warnings: AiWarning[] = Array.isArray(data.warnings)
				? data.warnings
						.map((w: AiWarning | string): AiWarning =>
							typeof w === "string"
								? { severity: "warning", message: w }
								: {
										severity: w.severity ?? "warning",
										message: w.message ?? "",
										suggestion: w.suggestion,
									},
						)
						.filter((w: AiWarning) => w.message)
				: [];
			setAiWarnings(warnings);
			toast.success("Borrador generado. Revisalo antes de guardar.");
		} catch (error) {
			console.error("Error generando borrador IA:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al generar borrador",
			);
		} finally {
			setIsDrafting(false);
		}
	};

	const handleSave = async () => {
		if (!selectedFileId) {
			toast.error("Seleccioná un expediente");
			return;
		}
		if (!newCedula.partId) {
			toast.error("Seleccioná una parte");
			return;
		}
		if (!newCedula.content) {
			toast.error("El contenido es obligatorio");
			return;
		}

		setIsSubmitting(true);
		try {
			const frontendUrl = window.location.origin;
			const processedContent = newCedula.content.replace(
				/src="(?:\.\.\/)+images\//g,
				`src="${frontendUrl}/images/`,
			);

			const res = await fetch(CASE_CEDULAS_ENDPOINT(Number(caseId)), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					cedulaType: newCedula.cedulaType,
					partId: Number(newCedula.partId),
					content: processedContent,
					juez: newCedula.juez || null,
					secretaria: newCedula.secretaria || null,
					fileId: selectedFileId || null,
				}),
			});

			if (!res.ok) {
				const error = await res.json();
				throw new Error(error.message || "Error al crear cédula");
			}

			toast.success("Cédula creada correctamente");
			setIsCreating(false);
			await fetchCedulas();
		} catch (error) {
			console.error("Error saving cedula:", error);
			toast.error("Error al crear la cédula");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (cedula: Cedula) => {
		if (!(await confirm({ description: "¿Estás seguro de eliminar esta cédula?", confirmLabel: "Eliminar" }))) return;

		try {
			const res = await fetch(
				CASE_CEDULA_BY_ID_ENDPOINT(Number(caseId), cedula.id),
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
				},
			);
			if (!res.ok && res.status !== 204) throw new Error("Error al eliminar");
			toast.success("Cédula eliminada");
			await fetchCedulas();
		} catch (error) {
			console.error("Error deleting cedula:", error);
			toast.error("Error al eliminar la cédula");
		}
	};

	const handlePrint = (cedula: Cedula) => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		const logoUrl = `${window.location.origin}/images/logo/logo-print.png`;
		const logoHeader = `<div class="cedula-logo"><img src="${logoUrl}" alt="Legalistas" /></div>`;

		printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Cédula</title>
            <style>@page{size:A4;margin:10mm 20mm 20mm 20mm}body{font-family:Calibri,Arial,sans-serif;width:210mm;margin:0 auto;padding:10mm 20mm 20mm 20mm;color:#000;background:white}.cedula-logo{text-align:right;margin-bottom:8px}.cedula-logo img{width:140px;height:auto}@media print{body{margin:0;padding:0}}</style>
            </head><body>${logoHeader}${cedula.content}</body></html>`);
		printWindow.document.close();
		printWindow.onload = () => setTimeout(() => printWindow.print(), 250);
	};

	const handleDownload = (cedula: Cedula) => {
		if (!cedula.pdfPath) {
			toast.error("No se encontró el archivo de la cédula");
			return;
		}
		const apiUrl =
			process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
		window.open(`${apiUrl}/upload/${cedula.pdfPath}`, "_blank");
	};

	const formatDate = (dateStr: string) =>
		new Date(dateStr).toLocaleDateString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});

	const getCedulaTypeLabel = (type: string) =>
		CEDULA_TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

	const pendientes = cedulas.filter((c) => c.status === "pendiente").length;
	const generadas = cedulas.filter(
		(c) => c.status === "generada" || c.status === "diligenciada",
	).length;

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const inputClass =
		"w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

	return (
		<div className="space-y-4">
			{/* ── Listado de cédulas ── */}
			<div className="rounded-xl border border-border bg-card shadow-sm">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<div className="flex items-center gap-2">
						<Send className="h-5 w-5 text-muted-foreground" />
						<h3 className="text-md font-semibold text-foreground">
							Cédulas
						</h3>
						{cedulas.length > 0 && (
							<span className="text-xs text-muted-foreground">
								({pendientes} pendientes, {generadas} generadas)
							</span>
						)}
					</div>
					<button
						type="button"
						onClick={handleOpenNew}
						className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
						Generar cédula
					</button>
				</div>

				{/* Content */}
				{cedulas.length === 0 && !isCreating ? (
					<div className="flex flex-col items-center justify-center px-5 py-14">
						<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
							<Send className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-foreground mb-1">
							No hay cédulas registradas
						</p>
						<p className="text-xs text-muted-foreground mb-3">
							Las cédulas se generan en base a las partes cargadas.
						</p>
						<button
							type="button"
							onClick={handleOpenNew}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/85 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Generar cédula
						</button>
					</div>
				) : (
					<div className="p-4 space-y-3">
						{cedulas.map((cedula) => {
							const config =
								estadoConfig[cedula.status] || estadoConfig.generada;
							const Icon = config.icon;
							const cardClass =
								cedula.status === "diligenciada"
									? "bg-muted border-border opacity-80"
									: cedula.status === "devuelta"
										? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
										: "bg-card border-border";

							return (
								<div
									key={cedula.id}
									className={`rounded-lg border p-5 ${cardClass}`}
								>
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted border border-border shrink-0">
												<FileText className="h-5 w-5 text-muted-foreground" />
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 flex-wrap">
													<h4 className="text-sm font-semibold text-foreground">
														{getCedulaTypeLabel(cedula.cedulaType)}
													</h4>
													<span
														className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${config.color}`}
													>
														<Icon className="h-3 w-3" />
														{config.label}
													</span>
												</div>
												<div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
													<div className="flex items-center gap-1.5">
														<User className="h-3.5 w-3.5 shrink-0" />
														<span>
															{cedula.partName || "Parte no especificada"}
														</span>
													</div>
													{cedula.caseFile && (
														<>
															<span>•</span>
															<div className="flex items-center gap-1.5">
																<FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
																<span>
																	{getFileLabel(cedula.caseFile, customerName)}
																</span>
															</div>
														</>
													)}
													<span>•</span>
													<span>
														{formatDate(
															cedula.generatedDate || cedula.createdAt,
														)}
													</span>
												</div>
											</div>
										</div>

										{/* Acciones */}
										<div className="flex items-center gap-1.5 shrink-0">
											<button
												type="button"
												onClick={() => handlePrint(cedula)}
												title="Imprimir cédula"
												className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-green-500 transition-colors"
											>
												<Printer className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => handleDownload(cedula)}
												title="Descargar cédula"
												className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-blue-500 transition-colors"
											>
												<Download className="h-4 w-4" />
											</button>
											<button
												type="button"
												onClick={() => handleDelete(cedula)}
												title="Eliminar cédula"
												className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* ── Formulario crear cédula ── */}
			{isCreating && (
				<div className="rounded-xl border border-border bg-card shadow-sm">
					<div className="px-5 py-4 border-b border-border">
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
								<Send className="h-5 w-5 text-primary" />
							</div>
							<div>
								<h2 className="text-lg font-bold text-foreground">
									Nueva Cédula
								</h2>
								<p className="text-xs text-muted-foreground">
									Seleccioná un expediente y completá los datos
								</p>
							</div>
						</div>
					</div>

					<div className="p-5 space-y-5">
						{/* Sección: Vinculación al expediente */}
						<div className="space-y-3">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Vinculación
							</h3>
							<div>
								<span className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
									<FileText className="h-3.5 w-3.5 text-muted-foreground" />
									Expediente <span className="text-red-500">*</span>
								</span>
								<div ref={fileRef} className="relative">
									<button
										type="button"
										onClick={() => setIsFileOpen(!isFileOpen)}
										className="w-full flex items-center justify-between text-sm text-left bg-muted border border-border rounded-lg px-3 py-2.5 hover:border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
									>
										<span
											className={`truncate ${selectedFileId ? "text-foreground" : "text-muted-foreground"}`}
										>
											{selectedFileLabel}
										</span>
										<ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
									</button>
									{isFileOpen && (
										<div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-auto">
											<div className="sticky top-0 bg-card p-1.5 border-b border-border">
												<div className="relative">
													<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
													<input
														ref={fileSearchRef}
														type="text"
														value={fileSearch}
														onChange={(e) => setFileSearch(e.target.value)}
														placeholder="Buscar expediente..."
														className="w-full pl-6 pr-2 py-1 text-xs border border-border rounded bg-muted text-foreground outline-none"
													/>
												</div>
											</div>
											{searchedFiles.map((f) => (
												<button
													key={f.id}
													type="button"
													onClick={() => handleFileSelect(f.id)}
													className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted truncate ${selectedFileId === f.id ? "bg-primary/10 text-primary" : "text-foreground"}`}
												>
													{getFileLabel(f, customerName)}
												</button>
											))}
											{searchedFiles.length === 0 && (
												<div className="px-2.5 py-2 text-xs text-muted-foreground">
													No se encontraron expedientes
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Si hay expediente seleccionado, mostrar el resto del form */}
						{selectedFileId && (
							<>
								<div className="border-t border-border" />

								<div className="space-y-3">
									<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
										Datos de la cédula
									</h3>

									{/* Grid: Tipo + Parte */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div>
											<label htmlFor="cedula-type" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
												Tipo de Cédula <span className="text-red-500">*</span>
											</label>
											<select
												id="cedula-type"
												value={newCedula.cedulaType}
												onChange={(e) => handleCedulaTypeChange(e.target.value)}
												className={inputClass}
											>
												{CEDULA_TYPE_OPTIONS.map((o) => (
													<option key={o.value} value={o.value}>
														{o.label}
													</option>
												))}
											</select>
										</div>
										<div>
											<label htmlFor="cedula-part" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
												Parte <span className="text-red-500">*</span>
											</label>
											{loadingParts ? (
												<div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
													<Loader2 className="h-4 w-4 animate-spin" /> Cargando
													partes...
												</div>
											) : (
												<>
													<select
														id="cedula-part"
														value={newCedula.partId}
														onChange={(e) => handlePartChange(e.target.value)}
														className={inputClass}
													>
														<option value="">Seleccione una parte</option>
														{fileParts.map((part: any) => (
															<option
																key={`${part._source || "part"}-${part.id}`}
																value={part.id}
															>
																{part.name} ({part.partyType})
																{part.documentNumber
																	? ` — ${part.documentType}: ${part.documentNumber}`
																	: ""}
															</option>
														))}
													</select>
													{fileParts.length === 0 && (
														<p className="mt-1 text-xs text-amber-500">
															No hay partes vinculadas a este expediente. Agregá
															partes desde la pestaña Partes.
														</p>
													)}
												</>
											)}
										</div>
									</div>

									{/* Grid: Juez + Secretaría */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
										<div>
											<label htmlFor="cedula-juez" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
												Juez
											</label>
											<input
												id="cedula-juez"
												type="text"
												value={newCedula.juez}
												onChange={(e) => handleJuezChange(e.target.value)}
												placeholder="Ej: Dr. Juan Pérez"
												className={inputClass}
											/>
										</div>
										<div>
											<label htmlFor="cedula-secretaria" className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
												Secretaría
											</label>
											<input
												id="cedula-secretaria"
												type="text"
												value={newCedula.secretaria}
												onChange={(e) => handleSecretariaChange(e.target.value)}
												placeholder="Ej: Secretaría N° 1"
												className={inputClass}
											/>
										</div>
									</div>
								</div>

								<div className="border-t border-border" />

								{/* Asistente IA */}
								<div className="rounded-lg border border-violet-200 dark:border-violet-900/40 bg-violet-50/40 dark:bg-violet-900/10">
									<button
										type="button"
										onClick={() => setAiOpen(!aiOpen)}
										className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
									>
										<span className="flex items-center gap-2">
											<Sparkles className="h-4 w-4 text-violet-500" />
											Asistente IA — Generar borrador
										</span>
										<ChevronDown
											className={`h-4 w-4 text-muted-foreground transition-transform ${aiOpen ? "rotate-180" : ""}`}
										/>
									</button>
									{aiOpen && (
										<div className="px-4 pb-4 space-y-3 border-t border-violet-200 dark:border-violet-900/40 pt-3">
											<p className="text-xs text-muted-foreground">
												Pegá el decreto del SISFE / portal del juzgado. La IA lo
												limpia, conserva los puntos numerados y arma la cédula
												con los datos de la parte seleccionada.
											</p>
											<div>
												<label
													htmlFor="ai-decree"
													className="block text-xs font-medium text-foreground mb-1"
												>
													Decreto judicial (opcional)
												</label>
												<textarea
													id="ai-decree"
													value={rawDecree}
													onChange={(e) => setRawDecree(e.target.value)}
													rows={6}
													placeholder='RAFAELA, 9 de octubre de 2025 Proveyendo escrito cargo Nº 9664/25: 1) Por presentado...'
													className={`${inputClass} font-mono text-xs leading-relaxed`}
												/>
											</div>
											<div>
												<label
													htmlFor="ai-brief"
													className="block text-xs font-medium text-foreground mb-1"
												>
													Notas adicionales (opcional)
												</label>
												<textarea
													id="ai-brief"
													value={brief}
													onChange={(e) => setBrief(e.target.value)}
													rows={2}
													placeholder="Ej: Acompañar copia de demanda en 8 fs. y documental en 17 fs."
													className={inputClass}
												/>
											</div>
											<button
												type="button"
												onClick={handleGenerateAIDraft}
												disabled={
													isDrafting || !selectedFileId || !newCedula.partId
												}
												className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors disabled:opacity-50"
											>
												{isDrafting ? (
													<Loader2 className="h-3.5 w-3.5 animate-spin" />
												) : (
													<Sparkles className="h-3.5 w-3.5" />
												)}
												{isDrafting ? "Generando..." : "Generar borrador con IA"}
											</button>
											{aiWarnings.length > 0 && (
												<div className="space-y-1.5">
													{aiWarnings.map((w, idx) => {
														const style =
															w.severity === "error"
																? "border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:border-red-900/40 dark:text-red-200"
																: w.severity === "info"
																	? "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-900/20 dark:border-sky-900/40 dark:text-sky-200"
																	: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/40 dark:text-amber-200";
														const label =
															w.severity === "error"
																? "Bloqueante"
																: w.severity === "info"
																	? "Info"
																	: "Atención";
														const s = w.suggestion;
														const fieldLabels: Record<
															AiSuggestion["field"],
															string
														> = {
															juez: "Juez",
															secretaria: "Secretaría",
															cedulaType: "Tipo de cédula",
															partId: "Destinatario",
															rawDecree: "Decreto",
														};
														const displayValue =
															s?.field === "partId"
																? s.partName || `#${s.suggestedValue}`
																: s?.field === "cedulaType"
																	? String(s.suggestedValue) ===
																		"carta_certificada"
																		? "Carta certificada al demandado"
																		: "Común a cualquiera"
																	: s?.field === "rawDecree"
																		? `${String(s?.suggestedValue ?? "").slice(0, 80)}…`
																		: String(s?.suggestedValue ?? "");
														return (
															<div
																key={`${w.severity}-${idx}`}
																className={`rounded-md border p-2.5 text-xs ${style}`}
															>
																<div className="flex items-start gap-2">
																	<AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
																	<div className="flex-1 space-y-1.5">
																		<div>
																			<span className="font-semibold">
																				{label}:
																			</span>{" "}
																			{w.message}
																		</div>
																		{s && (
																			<div className="flex items-center gap-2 flex-wrap pt-1 border-t border-current/15">
																				<span className="opacity-80">
																					Sugerido — {fieldLabels[s.field]}:{" "}
																					<span className="font-medium">
																						{displayValue}
																					</span>
																					{s.rationale ? (
																						<span className="opacity-70">
																							{" "}
																							· {s.rationale}
																						</span>
																					) : null}
																				</span>
																				<button
																					type="button"
																					onClick={() => applySuggestion(s, idx)}
																					className="ml-auto inline-flex items-center px-2 py-0.5 rounded border border-current/30 bg-white/60 dark:bg-black/20 hover:bg-white font-medium"
																				>
																					Aplicar
																				</button>
																			</div>
																		)}
																	</div>
																</div>
															</div>
														);
													})}
													{aiWarnings.some((w) => w.severity === "error") && (
														<label className="flex items-start gap-2 text-xs text-foreground pt-1 cursor-pointer">
															<input
																type="checkbox"
																checked={acknowledgedErrors}
																onChange={(e) =>
																	setAcknowledgedErrors(e.target.checked)
																}
																className="mt-0.5"
															/>
															<span>
																Revisé los avisos bloqueantes y confirmo que la
																cédula es correcta bajo mi responsabilidad.
															</span>
														</label>
													)}
												</div>
											)}
										</div>
									)}
								</div>

								<div className="border-t border-border" />

								{/* Editor */}
								<div className="space-y-2">
									<span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
										<FileText className="h-3.5 w-3.5 text-muted-foreground" />
										Contenido de la Cédula{" "}
										<span className="text-red-500">*</span>
									</span>
									<div className="border border-border rounded-lg overflow-hidden">
										<Editor
											apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
											value={newCedula.content}
											onEditorChange={(content) =>
												setNewCedula({ ...newCedula, content })
											}
											init={{
												height: "850px",
												menubar: true,
												relative_urls: false,
												remove_script_host: false,
												convert_urls: false,
												plugins: [
													"advlist",
													"autolink",
													"lists",
													"link",
													"image",
													"charmap",
													"preview",
													"anchor",
													"searchreplace",
													"visualblocks",
													"code",
													"fullscreen",
													"insertdatetime",
													"media",
													"table",
													"code",
													"help",
													"wordcount",
												],
												toolbar:
													"undo redo | blocks | bold italic underline strikethrough | " +
													"alignleft aligncenter alignright alignjustify | " +
													"bullist numlist outdent indent | removeformat | help",
												language: "es",
												content_style: `
                                                    @import url('fonts.googleapis.com');
                                                    body { width: 210mm; height: 297mm; padding: 20mm; margin: 0; box-sizing: border-box; background: #fff; font-family: 'Oxygen', sans-serif; line-height: 1.4; color: #3d3d3d; }
                                                    @media print { body { width: auto; height: auto; padding: 20mm; } }
                                                `,
											}}
										/>
									</div>
								</div>
							</>
						)}

						{/* Footer */}
						<div className="flex justify-end gap-3 pt-4 border-t border-border">
							<button
								type="button"
								onClick={() => setIsCreating(false)}
								disabled={isSubmitting}
								className="px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
							>
								Cancelar
							</button>
							{(() => {
								const hasBlockingWarnings = aiWarnings.some(
									(w) => w.severity === "error",
								);
								const blocked =
									hasBlockingWarnings && !acknowledgedErrors;
								return (
									<button
										type="button"
										onClick={handleSave}
										disabled={
											isSubmitting ||
											!selectedFileId ||
											!newCedula.partId ||
											blocked
										}
										title={
											blocked
												? "Revisá los avisos bloqueantes antes de guardar"
												: undefined
										}
										className="px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
									>
										{isSubmitting && (
											<Loader2 className="h-4 w-4 animate-spin" />
										)}
										Crear Cédula
									</button>
								);
							})()}
						</div>
					</div>
				</div>
			)}
			{ConfirmationDialog}
		</div>
	);
};
