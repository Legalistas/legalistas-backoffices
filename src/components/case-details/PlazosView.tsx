"use client";

import {
	AlertTriangle,
	Calendar,
	CalendarClock,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronsUpDown,
	Clock,
	Eye,
	EyeOff,
	Info,
	Loader2,
	MapPin,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useConfirm } from "@/hooks/useConfirm";
import {
	CASE_DEADLINE_BY_ID_ENDPOINT,
	CASE_DEADLINE_CALCULATE_ENDPOINT,
	CASE_DEADLINES_ENDPOINT,
	SETTINGS_DEADLINE_TYPES_ENDPOINT,
	SETTINGS_JURISDICTIONS_ENDPOINT,
} from "@/constant/api-endpoints";
import { getExpedienteLabel } from "@/lib/expediente-label";
import { apiErrorMessage } from "@/lib/api-error";
import { getProcessTypeLabel } from "@/lib/functions";
import { cn } from "@/lib/utils";
import type {
	CaseDeadline,
	CasesFiles,
	DeadlineCalculationDetail,
} from "@/types/cases";

// Carátula del expediente: helper compartido (usa la carátula automática).
const getFileLabel = getExpedienteLabel;

// ── Fechas ──────────────────────────────────────────────────────────
// Las fechas de los plazos se guardan "literales" (00:00 UTC = el día en
// Argentina). Se muestran leyendo en UTC: con la zona del navegador se
// corrían un día para atrás (vencía el 01/10 y se veía 30/09).

/** "2026-10-19" o ISO → "19/10/2026" (con `weekday`, "lunes 19/10/2026"). */
function fmtDate(value: string | null | undefined, withWeekday = false): string {
	if (!value) return "—";
	const d = new Date(`${value.slice(0, 10)}T00:00:00Z`);
	return d.toLocaleDateString("es-AR", {
		...(withWeekday && { weekday: "long" }),
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		timeZone: "UTC",
	});
}

function todayArgentina(): string {
	return new Date().toLocaleDateString("en-CA", {
		timeZone: "America/Argentina/Buenos_Aires",
	});
}

/** Días de calendario entre hoy (Argentina) y el vencimiento. */
function daysUntil(dueDate: string): number {
	const due = Date.parse(`${dueDate.slice(0, 10)}T00:00:00Z`);
	const today = Date.parse(`${todayArgentina()}T00:00:00Z`);
	return Math.round((due - today) / 86_400_000);
}

/** El detalle viene como texto JSON (columna LongText). */
function parseCalculationDetail(
	raw: CaseDeadline["calculationDetail"],
): DeadlineCalculationDetail | null {
	if (!raw) return null;
	if (typeof raw !== "string") return raw;
	try {
		return JSON.parse(raw) as DeadlineCalculationDetail;
	} catch {
		return null;
	}
}

/** "Contestar agravios" → "Vencimiento contestar agravios" (título del calendario). */
function tituloVencimiento(tipo: string): string {
	const t = tipo.trim();
	return t ? `Vencimiento ${t.charAt(0).toLowerCase()}${t.slice(1)}` : "";
}

const AVISO_OPCIONES = [0, 1, 2, 3, 5, 7, 10];

interface DeadlineType {
	id: number;
	code: string;
	name: string;
	description?: string | null;
	article?: string | null;
	daysCount: number;
	daysType: string;
	extendable: boolean;
	peremptory: boolean;
	dilatory: boolean;
	jurisdictionId: number;
	order?: number | null;
}

const formatDeadlineTypeLabel = (t: DeadlineType) => {
	const daysLabel =
		t.daysType === "business" ? "días hábiles" : "días corridos";
	return `${t.name} (${t.daysCount} ${daysLabel})`;
};

interface SearchSelectOption {
	value: string;
	label: string;
	/** Texto extra para el buscador (ej. número o tipo de proceso). */
	keywords?: string[];
}

/**
 * Select con buscador que se abre flotando (Popover): así no lo recorta el
 * scroll del modal. `modal` en el Popover deja scrollear la lista con la
 * rueda estando dentro de un Dialog.
 */
function SearchSelect({
	value,
	label,
	placeholder,
	searchPlaceholder,
	options,
	onSelect,
	extra,
	className,
}: {
	value: string;
	/** Texto del elegido; null muestra el placeholder. */
	label: string | null;
	placeholder: string;
	searchPlaceholder: string;
	options: SearchSelectOption[];
	onSelect: (value: string) => void;
	/** Opción fija al final, siempre visible (ej. "Otro"). */
	extra?: { label: string; selected: boolean; onSelect: () => void };
	className?: string;
}) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<button
					type="button"
					role="combobox"
					aria-expanded={open}
					className={cn(className, "flex items-center justify-between gap-2 text-left")}
				>
					<span className={cn("truncate", !label && "text-muted-foreground")}>
						{label ?? placeholder}
					</span>
					<ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList className="max-h-64">
						<CommandEmpty>Sin resultados.</CommandEmpty>
						<CommandGroup>
							{options.map((o) => (
								<CommandItem
									key={o.value}
									value={`${o.label} #${o.value}`}
									keywords={o.keywords}
									onSelect={() => {
										onSelect(o.value);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"h-4 w-4 shrink-0 text-primary",
											value === o.value ? "opacity-100" : "opacity-0",
										)}
									/>
									<span className="leading-snug">{o.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
						{extra && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										value="__extra__"
										forceMount
										onSelect={() => {
											extra.onSelect();
											setOpen(false);
										}}
									>
										<Check
											className={cn(
												"h-4 w-4 shrink-0 text-primary",
												extra.selected ? "opacity-100" : "opacity-0",
											)}
										/>
										{extra.label}
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; color: string; icon: typeof Clock }
> = {
	pendiente: {
		label: "Pendiente",
		color: "bg-amber-50 text-amber-700 border-amber-200",
		icon: Clock,
	},
	cumplido: {
		label: "Cumplido",
		color: "bg-green-50 text-green-700 border-green-200",
		icon: CheckCircle2,
	},
	vencido: {
		label: "Vencido",
		color: "bg-red-50 text-red-700 border-red-200",
		icon: AlertTriangle,
	},
};

// La app de abogados marca "completado": es lo mismo que "cumplido".
const normalizeStatus = (status: string) =>
	status === "completado" ? "cumplido" : status;

interface LawyerInfo {
	id: number;
	name: string;
	image?: string | null;
}

interface PlazosViewProps {
	files: CasesFiles[];
	caseId: string;
	responsibleLawyer?: LawyerInfo | null;
	internalLawyer?: LawyerInfo | null;
	customerName?: string;
}

export const PlazosView = ({
	files,
	caseId,
	responsibleLawyer,
	internalLawyer,
	customerName,
}: PlazosViewProps) => {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [deadlines, setDeadlines] = useState<CaseDeadline[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterStatus, setFilterStatus] = useState<string | "all">("all");
	const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
	const [openStatusId, setOpenStatusId] = useState<number | null>(null);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const [jurisdictions, setJurisdictions] = useState<
		{ id: number; name: string }[]
	>([]);
	const [deadlineTypes, setDeadlineTypes] = useState<DeadlineType[]>([]);
	// La circunscripción no tiene catálogo propio: se ofrecen los generales.
	const [genericTypes, setGenericTypes] = useState(false);
	// "Otro": sin tipo del catálogo, días editables.
	const [isOtherType, setIsOtherType] = useState(false);
	const [showJurisdictionPicker, setShowJurisdictionPicker] = useState(false);
	const [preview, setPreview] = useState<{
		dueDate: string;
		detail: DeadlineCalculationDetail;
	} | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);

	// ── Modal ──
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);

	// ── Modal Ajuste de fecha ──
	const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
	const [adjustingDeadline, setAdjustingDeadline] =
		useState<CaseDeadline | null>(null);
	const [adjustForm, setAdjustForm] = useState({ newDueDate: "", reason: "" });
	const [isAdjusting, setIsAdjusting] = useState(false);

	// ── Form state ──
	const [selectedDeadlineTypeId, setSelectedDeadlineTypeId] = useState<
		number | null
	>(null);
	const [mode, setMode] = useState<"auto" | "manual">("auto");
	const [form, setForm] = useState({
		jurisdictionId: "",
		title: "",
		description: "",
		fileId: "" as string | number,
		responsibleId: "",
		notificationDate: "",
		daysCount: "",
		daysType: "business",
		dueDate: "",
		dueTime: "",
		advanceNoticeDays: "3",
		schedule: "si" as "si" | "no",
	});

	// ── Opciones de los selectores del modal ──
	const fileOptions = useMemo(
		() =>
			files.map((f) => ({
				value: String(f.id),
				label: getFileLabel(f, customerName),
				keywords: [String(f.id), getProcessTypeLabel(f.typeProcessId)],
			})),
		[files, customerName],
	);
	const selectedFileLabel =
		fileOptions.find((o) => o.value === String(form.fileId))?.label ?? null;

	const selectedJurisdictionLabel = useMemo(() => {
		const j = jurisdictions.find(
			(j) => String(j.id) === String(form.jurisdictionId),
		);
		return j ? j.name : "Seleccionar jurisdicción...";
	}, [form.jurisdictionId, jurisdictions]);

	const jurisdictionOptions = useMemo(
		() => jurisdictions.map((j) => ({ value: String(j.id), label: j.name })),
		[jurisdictions],
	);

	const typeOptions = useMemo(
		() =>
			deadlineTypes.map((t) => ({ value: String(t.id), label: formatDeadlineTypeLabel(t) })),
		[deadlineTypes],
	);
	const selectedTypeLabel =
		typeOptions.find((o) => o.value === String(selectedDeadlineTypeId))?.label ?? null;

	// ── Fetch jurisdictions ──
	useEffect(() => {
		const fetchJurisdictions = async () => {
			try {
				const res = await fetch(SETTINGS_JURISDICTIONS_ENDPOINT, {
					headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
				});
				if (res.ok) {
					const data = await res.json();
					setJurisdictions(data.jurisdictions || data || []);
				}
			} catch (err) {
				console.error("Error fetching jurisdictions:", err);
			}
		};
		if (session?.user?.accessToken) fetchJurisdictions();
	}, [session?.user?.accessToken]);

	// ── Fetch deadline types por jurisdicción ──
	useEffect(() => {
		if (!form.jurisdictionId) {
			setDeadlineTypes([]);
			return;
		}
		const fetchDeadlineTypes = async () => {
			try {
				const url = `${SETTINGS_DEADLINE_TYPES_ENDPOINT}?jurisdictionId=${form.jurisdictionId}`;
				const res = await fetch(url, {
					headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
				});
				if (res.ok) {
					const data = await res.json();
					setDeadlineTypes(data.deadlineTypes || []);
					setGenericTypes(Boolean(data.generic));
				}
			} catch (err) {
				console.error("Error fetching deadline types:", err);
			}
		};
		if (session?.user?.accessToken) fetchDeadlineTypes();
	}, [session?.user?.accessToken, form.jurisdictionId]);

	// ── Fetch deadlines ──
	const fetchDeadlines = useCallback(async () => {
		try {
			const res = await fetch(CASE_DEADLINES_ENDPOINT(Number(caseId)), {
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
			});
			if (!res.ok) throw new Error("Error al cargar plazos");
			const data = await res.json();
			setDeadlines(data.deadlines || []);
		} catch (error) {
			console.error("Error fetching deadlines:", error);
		} finally {
			setLoading(false);
		}
	}, [caseId, session?.user?.accessToken]);

	useEffect(() => {
		if (session?.user?.accessToken) fetchDeadlines();
	}, [fetchDeadlines, session?.user?.accessToken]);

	// ── Cerrar dropdown status al click fuera ──
	useEffect(() => {
		if (openStatusId === null) return;
		const handle = (e: MouseEvent) => {
			if (
				statusDropdownRef.current &&
				!statusDropdownRef.current.contains(e.target as Node)
			)
				setOpenStatusId(null);
		};
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, [openStatusId]);

	// ── Set default responsible ──
	useEffect(() => {
		if (responsibleLawyer?.id) {
			setForm((prev) => ({
				...prev,
				responsibleId: String(responsibleLawyer.id),
			}));
		}
	}, [responsibleLawyer]);

	// ── Al cambiar tipo de plazo: días del catálogo y título automático ──
	const handleTypeChange = (typeId: number) => {
		setSelectedDeadlineTypeId(typeId);
		setIsOtherType(false);
		const typeObj = deadlineTypes.find((t) => t.id === typeId);
		if (typeObj) {
			setForm((prev) => ({
				...prev,
				title: tituloVencimiento(typeObj.name),
				daysCount: String(typeObj.daysCount),
				daysType: typeObj.daysType || "business",
			}));
		}
	};

	const handleOtherType = () => {
		setSelectedDeadlineTypeId(null);
		setIsOtherType(true);
		setForm((prev) => ({ ...prev, title: "", daysCount: "", daysType: "business" }));
	};

	// ── Vista previa del vencimiento (modo automático) ──
	useEffect(() => {
		if (!isModalOpen || mode !== "auto") {
			setPreview(null);
			return;
		}
		const days = Number(form.daysCount);
		if (!form.notificationDate || !Number.isInteger(days) || days < 1) {
			setPreview(null);
			return;
		}
		setPreviewLoading(true);
		const timer = setTimeout(async () => {
			try {
				const res = await fetch(CASE_DEADLINE_CALCULATE_ENDPOINT(Number(caseId)), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({
						notificationDate: form.notificationDate,
						daysCount: days,
						daysType: form.daysType,
					}),
				});
				setPreview(res.ok ? await res.json() : null);
			} catch {
				setPreview(null);
			} finally {
				setPreviewLoading(false);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [
		isModalOpen,
		mode,
		form.notificationDate,
		form.daysCount,
		form.daysType,
		caseId,
		session?.user?.accessToken,
	]);

	// ── Filtrar y ordenar ──
	const filteredDeadlines = useMemo(() => {
		let filtered = deadlines;
		if (filterStatus !== "all") {
			filtered = filtered.filter((d) => normalizeStatus(d.status) === filterStatus);
		}
		return filtered.sort(
			(a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
		);
	}, [deadlines, filterStatus]);

	// ── Calcular días restantes ──
	const getDaysLeft = daysUntil;

	// ── Handlers ──
	const handleOpenNew = useCallback(() => {
		setSelectedDeadlineTypeId(null);
		setIsOtherType(false);
		setShowJurisdictionPicker(false);
		setMode("auto");
		const firstFile = files[0];
		const jId = firstFile?.jurisdictionId || firstFile?.court?.jurisdiction?.id;
		setForm({
			jurisdictionId: jId ? String(jId) : "",
			title: "",
			description: "",
			fileId: firstFile?.id || "",
			responsibleId: responsibleLawyer?.id ? String(responsibleLawyer.id) : "",
			notificationDate: "",
			daysCount: "",
			daysType: "business",
			dueDate: "",
			dueTime: "",
			advanceNoticeDays: "3",
			schedule: "si",
		});
		setEditingId(null);
		setIsModalOpen(true);
	}, [files, responsibleLawyer]);

	const handleEditDeadline = (deadline: CaseDeadline) => {
		setEditingId(deadline.id);
		setSelectedDeadlineTypeId(deadline.deadlineTypeId || null);
		setIsOtherType(!deadline.deadlineTypeId);
		setShowJurisdictionPicker(false);
		setMode(deadline.mode as "auto" | "manual");
		setForm({
			jurisdictionId: String(deadline.jurisdictionId),
			title: deadline.title,
			description: deadline.description || "",
			fileId: deadline.fileId || "",
			responsibleId: String(deadline.responsibleId),
			notificationDate: deadline.notificationDate
				? deadline.notificationDate.split("T")[0]
				: "",
			daysCount: deadline.daysCount ? String(deadline.daysCount) : "",
			daysType: deadline.daysType || "business",
			dueDate: deadline.dueDate ? deadline.dueDate.split("T")[0] : "",
			dueTime: deadline.dueTime || "",
			advanceNoticeDays: String(deadline.advanceNoticeDays),
			schedule: deadline.schedule === 1 ? "si" : "no",
		});
		setIsModalOpen(true);
	};

	const handleSave = async () => {
		if (!form.fileId) {
			toast.error("Seleccioná el expediente del plazo");
			return;
		}
		if (!form.jurisdictionId) {
			toast.error("El expediente no tiene circunscripción: elegila");
			setShowJurisdictionPicker(true);
			return;
		}
		if (!selectedDeadlineTypeId && !isOtherType) {
			toast.error("Elegí el tipo de plazo (u 'Otro')");
			return;
		}
		if (!form.title.trim()) {
			toast.error("Ingresá un título");
			return;
		}
		if (!form.responsibleId) {
			toast.error("Seleccioná un responsable");
			return;
		}
		if (mode === "auto" && (!form.notificationDate || !form.daysCount)) {
			toast.error("Completá la fecha de notificación y cantidad de días");
			return;
		}
		if (mode === "manual" && !form.dueDate) {
			toast.error("Ingresá la fecha de vencimiento");
			return;
		}

		setIsSubmitting(true);
		try {
			const isEditing = editingId !== null;
			const url = isEditing
				? CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), editingId)
				: CASE_DEADLINES_ENDPOINT(Number(caseId));

			const body = {
				jurisdictionId: Number(form.jurisdictionId),
				deadlineTypeId: selectedDeadlineTypeId || null,
				type: selectedDeadlineTypeId
					? deadlineTypes.find((t) => t.id === selectedDeadlineTypeId)?.code ||
					null
					: null,
				title: form.title.trim(),
				description: form.description || null,
				fileId: Number(form.fileId),
				responsibleId: Number(form.responsibleId),
				mode,
				...(mode === "auto" && {
					notificationDate: form.notificationDate,
					daysCount: Number(form.daysCount),
					daysType: form.daysType,
				}),
				...(mode === "manual" && {
					dueDate: form.dueDate,
				}),
				advanceNoticeDays: Number(form.advanceNoticeDays),
			};

			const res = await fetch(url, {
				method: isEditing ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify(body),
			});

			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al guardar"));

			toast.success(isEditing ? "Plazo actualizado" : "Plazo creado");
			setIsModalOpen(false);
			fetchDeadlines();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeleteDeadline = async (deadlineId: number) => {
		if (!(await confirm({ description: "¿Eliminar este plazo?", confirmLabel: "Eliminar" }))) return;
		try {
			const res = await fetch(
				CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), deadlineId),
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
				},
			);
			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al eliminar"));
			toast.success("Plazo eliminado");
			fetchDeadlines();
		} catch (error) {
			toast.error((error as Error).message);
		}
	};

	const handleUpdateStatus = async (deadlineId: number, newStatus: string) => {
		try {
			const res = await fetch(
				CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), deadlineId),
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({ status: newStatus }),
				},
			);
			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al actualizar"));
			fetchDeadlines();
		} catch (error) {
			toast.error((error as Error).message);
		}
	};

	const handleOpenAdjust = (deadline: CaseDeadline) => {
		setAdjustingDeadline(deadline);
		setAdjustForm({ newDueDate: deadline.dueDate.slice(0, 10), reason: "" });
		setIsAdjustModalOpen(true);
	};

	const handleSaveAdjust = async () => {
		if (!adjustingDeadline) return;
		if (!adjustForm.newDueDate) {
			toast.error("Seleccioná una nueva fecha");
			return;
		}
		if (adjustForm.reason.length < 10) {
			toast.error("El motivo debe tener al menos 10 caracteres");
			return;
		}

		setIsAdjusting(true);
		try {
			const res = await fetch(
				CASE_DEADLINE_BY_ID_ENDPOINT(Number(caseId), adjustingDeadline.id),
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify({
						newDueDate: adjustForm.newDueDate,
						adjustmentReason: adjustForm.reason,
					}),
				},
			);
			if (!res.ok)
				throw new Error(await apiErrorMessage(res, "Error al ajustar fecha"));
			toast.success("Fecha de vencimiento ajustada correctamente");
			setIsAdjustModalOpen(false);
			setAdjustingDeadline(null);
			fetchDeadlines();
		} catch (error) {
			toast.error((error as Error).message);
		} finally {
			setIsAdjusting(false);
		}
	};

	const toggleExpanded = (id: number) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	// ── Render ──
	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const labelClass =
		"block text-xs font-medium text-muted-foreground mb-1";
	const inputClass =
		"w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none";
	const selectClass = inputClass;

	return (
		<div className="rounded-xl border border-border bg-card shadow-sm">
			{/* Header */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-border">
				<div className="flex items-center gap-2">
					<Clock className="h-5 w-5 text-muted-foreground" />
					<h3 className="text-md font-semibold text-foreground">
						Plazos
					</h3>
					{deadlines.length > 0 && (
						<span className="text-xs text-muted-foreground">
							({deadlines.filter((d) => d.status !== "cumplido").length}{" "}
							activos, {deadlines.filter((d) => d.status === "cumplido").length}{" "}
							cumplidos)
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{deadlines.length > 0 && (
						<div className="relative">
							<select
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="appearance-none text-xs font-medium text-muted-foreground bg-card border border-border rounded-md pl-3 pr-7 py-2 hover:border-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors cursor-pointer"
							>
								<option value="all">Todos los estados</option>
								<option value="pendiente">Pendientes</option>
								<option value="cumplido">Cumplidos</option>
								<option value="vencido">Vencidos</option>
							</select>
							<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
						</div>
					)}
					<button
						onClick={handleOpenNew}
						disabled={files.length === 0}
						title={files.length === 0 ? "Creá primero un expediente en la tab Expedientes" : undefined}
						className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Plus className="h-3.5 w-3.5" />
						Nuevo plazo
					</button>
				</div>
			</div>

			{/* Table */}
			{filteredDeadlines.length === 0 ? (
				<div className="flex flex-col items-center justify-center px-5 py-14">
					<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
						<Clock className="h-6 w-6 text-muted-foreground" />
					</div>
					<p className="text-sm font-medium text-foreground mb-1">
						No hay plazos registrados
					</p>
					<p className="text-xs text-muted-foreground mb-3">
						Creá un plazo para controlar vencimientos procesales.
					</p>
					<button
						onClick={handleOpenNew}
						disabled={files.length === 0}
						title={files.length === 0 ? "Creá primero un expediente en la tab Expedientes" : undefined}
						className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/85 transition-colors"
					>
						<Plus className="h-4 w-4" />
						Nuevo plazo
					</button>
				</div>
			) : (
				<div className="p-4 space-y-3">
					{filteredDeadlines.map((deadline) => {
						const daysLeft = getDaysLeft(deadline.dueDate);
						const isOverdue = normalizeStatus(deadline.status) === "pendiente" && daysLeft < 0;
						const isNearDue =
							normalizeStatus(deadline.status) === "pendiente" && daysLeft >= 0 && daysLeft <= 2;
						const status = normalizeStatus(deadline.status);
						const isCumplido = status === "cumplido";
						const config = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
						const isExpanded = expandedIds.has(deadline.id);
						const daysTypeLabel =
							deadline.daysType === "business"
								? "días hábiles"
								: "días corridos";
						const cardClass = isCumplido
							? "bg-muted border-border opacity-70"
							: isOverdue
								? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
								: isNearDue
									? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
									: "bg-card border-border";

						return (
							<div
								key={deadline.id}
								className={`rounded-lg border p-5 ${cardClass}`}
							>
								{/* Fila principal */}
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-start gap-3 min-w-0 flex-1">
										{/* Checkbox de estado */}
										<input
											type="checkbox"
											checked={isCumplido}
											onChange={() =>
												handleUpdateStatus(
													deadline.id,
													isCumplido
														? "pendiente"
														: "cumplido",
												)
											}
											className="mt-1.5 h-4.5 w-4.5 rounded border-input text-primary focus:ring-primary cursor-pointer shrink-0"
										/>
										<div className="min-w-0 flex-1">
											{/* Título + badge estado */}
											<div className="flex items-center gap-2.5 flex-wrap">
												<span
													className={`text-base font-semibold text-foreground ${isCumplido ? "line-through opacity-60" : ""}`}
												>
													{deadline.title}
												</span>
												<div
													className="relative"
													ref={
														openStatusId === deadline.id
															? statusDropdownRef
															: undefined
													}
												>
													<button
														type="button"
														onClick={() =>
															setOpenStatusId(
																openStatusId === deadline.id
																	? null
																	: deadline.id,
															)
														}
														className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${config.color}`}
													>
														{config.label}
														<ChevronDown className="h-3 w-3" />
													</button>
													{openStatusId === deadline.id && (
														<div className="absolute z-50 mt-1 left-0 w-40 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
															{Object.entries(STATUS_CONFIG).map(
																([key, cfg]) => {
																	const StatusIcon = cfg.icon;
																	return (
																		<button
																			key={key}
																			type="button"
																			onClick={() => {
																				handleUpdateStatus(deadline.id, key);
																				setOpenStatusId(null);
																			}}
																			className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors ${status === key ? "bg-muted font-medium" : ""}`}
																		>
																			<StatusIcon
																				className={`h-4 w-4 ${key === "pendiente" ? "text-amber-500" : key === "cumplido" ? "text-green-500" : "text-red-500"}`}
																			/>
																			<span className="text-foreground">
																				{cfg.label}
																			</span>
																			{status === key && (
																				<CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />
																			)}
																		</button>
																	);
																},
															)}
														</div>
													)}
												</div>
											</div>

											{/* Info línea 1: Vencimiento + hora + días restantes */}
											<div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground flex-wrap">
												<span className="inline-flex items-center gap-1">
													<Calendar className="h-4 w-4" />
													Vence: {fmtDate(deadline.dueDate)}
												</span>
												{!isCumplido && (
													<span
														className={`font-medium ${daysLeft < 0 ? "text-red-600" : daysLeft <= 3 ? "text-amber-600" : "text-muted-foreground"}`}
													>
														{daysLeft < 0
															? `Vencido hace ${Math.abs(daysLeft)} días`
															: `Faltan ${daysLeft} días`}
													</span>
												)}
											</div>

											{/* Info línea 2: Días del plazo + jurisdicción */}
											<div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
												{deadline.daysCount && (
													<span>
														{deadline.daysCount} {daysTypeLabel}
													</span>
												)}
												{deadline.jurisdiction && (
													<span className="inline-flex items-center gap-1">
														<MapPin className="h-4 w-4" />
														{deadline.jurisdiction.name}
													</span>
												)}
											</div>

											{/* Descripción */}
											{deadline.description && (
												<p className="mt-1.5 text-sm text-muted-foreground">
													{deadline.description}
												</p>
											)}

											{/* Indicador de ajuste manual */}
											{deadline.adjustedAt && (
												<div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 px-2.5 py-1.5">
													<CalendarClock className="h-3.5 w-3.5 text-purple-500" />
													<span className="text-xs text-purple-700 dark:text-purple-300">
														<span className="font-medium">Fecha ajustada</span>
														{deadline.originalDueDate && (
															<>
																{" "}
																— Original: {fmtDate(deadline.originalDueDate)}
															</>
														)}
														{deadline.adjustmentReason && (
															<> — {deadline.adjustmentReason}</>
														)}
													</span>
												</div>
											)}

											{/* Ver más / Ocultar cálculo (solo modo auto) */}
											{deadline.mode === "auto" && (
												<button
													onClick={() => toggleExpanded(deadline.id)}
													className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:text-primary font-medium"
												>
													{isExpanded ? (
														<>
															<EyeOff className="h-4 w-4" /> Ocultar cálculo
														</>
													) : (
														<>
															<Eye className="h-4 w-4" /> Mostrar cálculo
														</>
													)}
												</button>
											)}
										</div>
									</div>

									{/* Acciones */}
									<div className="flex items-center gap-1.5 shrink-0">
										<button
											onClick={() => handleEditDeadline(deadline)}
											className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
											title="Editar"
										>
											<Pencil className="h-4 w-4" />
										</button>
										<button
											onClick={() => handleOpenAdjust(deadline)}
											className="p-2 rounded-lg border border-border bg-card hover:bg-primary/5 dark:hover:bg-primary/80/20 text-primary transition-colors"
											title="Ajustar fecha"
										>
											<CalendarClock className="h-4 w-4" />
										</button>
										<button
											onClick={() => handleDeleteDeadline(deadline.id)}
											className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
											title="Eliminar"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>

								{/* Panel expandible: detalle del cálculo */}
								{isExpanded &&
									deadline.mode === "auto" &&
									(() => {
										const calc = parseCalculationDetail(deadline.calculationDetail);
										return (
											<div className="mt-3 ml-7 rounded-lg border border-border bg-muted p-3">
												<div className="flex items-center gap-1.5 mb-2">
													<Info className="h-3.5 w-3.5 text-primary" />
													<span className="text-xs font-semibold text-foreground">
														Detalle del cálculo automático
													</span>
												</div>
												<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
													<div>
														<span className="text-muted-foreground">Notificación:</span>
														<span className="ml-1 font-medium text-foreground">
															{fmtDate(calc?.fecha_notificacion ?? deadline.notificationDate, true)}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground">
															Inicio cómputo:
														</span>
														<span className="ml-1 font-medium text-foreground">
															{fmtDate(calc?.fecha_inicio_computo, true)}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground">Plazo:</span>
														<span className="ml-1 font-medium text-foreground">
															{deadline.daysCount} {daysTypeLabel}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground">Vencimiento:</span>
														<span className="ml-1 font-medium text-foreground">
															{fmtDate(deadline.dueDate, true)}
														</span>
													</div>
													{deadline.deadlineType?.article && (
														<div>
															<span className="text-muted-foreground">Artículo:</span>
															<span className="ml-1 font-medium text-foreground">
																{deadline.deadlineType.article}
															</span>
														</div>
													)}
												</div>

												{/* Días excluidos del cómputo */}
												{calc &&
													(calc.fines_semana_excluidos > 0 ||
														calc.feriados_excluidos.length > 0) && (
														<div className="mt-2 pt-2 border-t border-border">
															<p className="text-xs font-semibold text-foreground underline mb-1">
																Días excluidos del cómputo:
															</p>
															<div className="text-xs text-muted-foreground space-y-0.5">
																{calc.fines_semana_excluidos > 0 && (
																	<p className="flex items-center gap-1">
																		<Calendar className="h-3 w-3" />
																		{calc.fines_semana_excluidos} fines de
																		semana
																	</p>
																)}
																{calc.feriados_excluidos.length > 0 && (
																	<div>
																		<p className="flex items-center gap-1">
																			<Calendar className="h-3 w-3" />
																			{calc.feriados_excluidos.length} feriado
																			{calc.feriados_excluidos.length > 1
																				? "s"
																				: ""}
																			:
																		</p>
																		<ul className="ml-4 text-[11px] text-muted-foreground">
																			{calc.feriados_excluidos.map((f) => (
																				<li key={f.fecha}>
																					{fmtDate(f.fecha)}{" "}
																					- {f.descripcion}
																				</li>
																			))}
																		</ul>
																	</div>
																)}
															</div>
														</div>
													)}

												{/* Prórroga por día inhábil */}
												{calc?.prorrogado_por_inhabil && (
														<div className="mt-2 pt-2 border-t border-border">
															<div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
																<p className="text-xs text-amber-800 dark:text-amber-300">
																	<span className="font-semibold">
																		Prórroga por día inhábil
																	</span>
																	<br />
																	El último día del plazo caía en un día inhábil: se
																	prorrogó al siguiente día hábil
																	{deadline.deadlineType?.article
																		? ` conforme ${deadline.deadlineType.article}`
																		: ""}
																	.
																</p>
															</div>
														</div>
													)}

												<div className="mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
													Calculado:{" "}
													{calc?.calculado_at
														? new Date(calc.calculado_at).toLocaleString(
															"es-AR",
															{
																day: "2-digit",
																month: "2-digit",
																year: "numeric",
																hour: "2-digit",
																minute: "2-digit",
																second: "2-digit",
																hour12: false,
															},
														)
														: new Date(deadline.createdAt).toLocaleString(
															"es-AR",
															{
																day: "2-digit",
																month: "2-digit",
																year: "numeric",
																hour: "2-digit",
																minute: "2-digit",
																second: "2-digit",
																hour12: false,
															},
														)}
												</div>
											</div>
										);
									})()}
							</div>
						);
					})}
				</div>
			)}

			{/* ── Modal Nuevo/Editar Plazo ── */}
			<Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
				<DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0">
								<Clock className="h-5 w-5 text-primary" />
							</div>
							<div>
								<DialogTitle>
									{editingId ? "Editar plazo" : "Nuevo plazo procesal"}
								</DialogTitle>
								<DialogDescription>
									Cargá la notificación y el sistema calcula el vencimiento
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className="space-y-5 overflow-y-auto flex-1 pr-1">
						{/* ── Expediente → circunscripción ── */}
						<div className="space-y-3">
							<div>
								<label className={labelClass}>
									Expediente <span className="text-red-500">*</span>
								</label>
								<SearchSelect
									className={inputClass}
									value={String(form.fileId)}
									label={selectedFileLabel}
									placeholder="Seleccionar expediente"
									searchPlaceholder="Buscar expediente..."
									options={fileOptions}
									onSelect={(v) => {
										const file = files.find((f) => String(f.id) === v);
										if (!file) return;
										const jId = file.jurisdictionId || file.court?.jurisdiction?.id;
										setForm({
											...form,
											fileId: file.id,
											jurisdictionId: jId ? String(jId) : "",
										});
										setShowJurisdictionPicker(!jId);
										setSelectedDeadlineTypeId(null);
										setIsOtherType(false);
									}}
								/>
							</div>

							{/* Circunscripción: sale del expediente; se elige solo si no tiene. */}
							{form.fileId && !showJurisdictionPicker && form.jurisdictionId && (
								<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
									<MapPin className="h-3.5 w-3.5" />
									Circunscripción:{" "}
									<span className="font-medium text-foreground">{selectedJurisdictionLabel}</span>
									<button
										type="button"
										onClick={() => setShowJurisdictionPicker(true)}
										className="ml-1 text-primary hover:underline"
									>
										cambiar
									</button>
								</p>
							)}
							{form.fileId && (showJurisdictionPicker || !form.jurisdictionId) && (
								<div>
									<label className={labelClass}>
										Circunscripción <span className="text-red-500">*</span>
									</label>
									<SearchSelect
										className={inputClass}
										value={form.jurisdictionId}
										label={form.jurisdictionId ? selectedJurisdictionLabel : null}
										placeholder="Seleccionar circunscripción..."
										searchPlaceholder="Buscar circunscripción..."
										options={jurisdictionOptions}
										onSelect={(v) => {
											setForm({ ...form, jurisdictionId: v });
											setSelectedDeadlineTypeId(null);
											setIsOtherType(false);
											setShowJurisdictionPicker(false);
										}}
									/>
								</div>
							)}
						</div>

						{/* ── Tipo de plazo y título ── */}
						{form.jurisdictionId && (
							<div className="space-y-3">
								<div>
									<label className={labelClass}>
										Tipo de plazo <span className="text-red-500">*</span>
									</label>
									<SearchSelect
										className={inputClass}
										value={selectedDeadlineTypeId ? String(selectedDeadlineTypeId) : ""}
										label={isOtherType ? "Otro (días a mano)" : selectedTypeLabel}
										placeholder="Elegí el tipo de plazo..."
										searchPlaceholder="Buscar tipo de plazo..."
										options={typeOptions}
										onSelect={(v) => handleTypeChange(Number(v))}
										extra={{
											label: "Otro (cargo los días a mano)",
											selected: isOtherType,
											onSelect: handleOtherType,
										}}
									/>
									{genericTypes && (
										<p className="mt-0.5 text-xs text-muted-foreground">
											Esta circunscripción no tiene catálogo propio: se muestran los tipos
											generales.
										</p>
									)}
								</div>

								<div>
									<label className={labelClass}>
										Título <span className="text-red-500">*</span>
										<span className="font-normal"> — es lo que se ve en el calendario</span>
									</label>
									<input
										type="text"
										value={form.title}
										onChange={(e) => setForm({ ...form, title: e.target.value })}
										placeholder="Ej: Vencimiento contestación de agravios"
										className={inputClass}
									/>
								</div>
							</div>
						)}

						{/* ── Vencimiento ── */}
						{(selectedDeadlineTypeId || isOtherType) && (
							<div className="space-y-3">
								<div className="flex rounded-md border border-input overflow-hidden">
									<button
										type="button"
										onClick={() => setMode("auto")}
										className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${mode === "auto" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
									>
										Calcular desde la notificación
									</button>
									<button
										type="button"
										onClick={() => setMode("manual")}
										className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${mode === "manual" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
									>
										Cargar el vencimiento
									</button>
								</div>

								{mode === "auto" ? (
									<div className="bg-muted rounded-lg p-3 space-y-2.5">
										<div className="grid grid-cols-2 gap-2">
											<div>
												<label className={labelClass}>Fecha de notificación</label>
												<input
													type="date"
													value={form.notificationDate}
													onChange={(e) => setForm({ ...form, notificationDate: e.target.value })}
													className={inputClass}
												/>
											</div>
											<div>
												<label className={labelClass}>
													{form.daysType === "calendar" ? "Días corridos" : "Días hábiles"}
												</label>
												<input
													type="number"
													value={form.daysCount}
													onChange={(e) => setForm({ ...form, daysCount: e.target.value })}
													placeholder="Ej: 10"
													min="1"
													className={inputClass}
												/>
											</div>
										</div>
										<p className="text-[11px] text-muted-foreground">
											Notificación: el día que llegó la cédula o la notificación electrónica.
											El plazo empieza a correr el día hábil siguiente y se saltean fines de
											semana, feriados y ferias judiciales.
										</p>
										{previewLoading ? (
											<p className="text-xs text-muted-foreground">Calculando…</p>
										) : preview ? (
											<div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
												<p className="text-sm text-foreground">
													Vence el{" "}
													<span className="font-semibold">{fmtDate(preview.dueDate, true)}</span>
												</p>
												<p className="text-[11px] text-muted-foreground">
													Último día del plazo
													{preview.detail.feriados_excluidos.length > 0 &&
														` · se saltearon ${preview.detail.feriados_excluidos.length} días de feriado o feria`}
												</p>
											</div>
										) : null}
									</div>
								) : (
									<div className="bg-muted rounded-lg p-3 space-y-1.5">
										<label className={labelClass}>Fecha de vencimiento</label>
										<input
											type="date"
											value={form.dueDate}
											onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
											className={inputClass}
										/>
										<p className="text-[11px] text-muted-foreground">
											Vencimiento: el último día para presentar. Se guarda tal cual, sin cálculo.
										</p>
									</div>
								)}

								<div className="grid grid-cols-2 gap-2">
									<div>
										<label className={labelClass}>Avisar por mail</label>
										<select
											value={form.advanceNoticeDays}
											onChange={(e) => setForm({ ...form, advanceNoticeDays: e.target.value })}
											className={selectClass}
										>
											{AVISO_OPCIONES.map((n) => (
												<option key={n} value={String(n)}>
													{n === 0 ? "Solo el día que vence" : `${n} día${n > 1 ? "s" : ""} antes`}
												</option>
											))}
										</select>
									</div>
									<div>
										<label className={labelClass}>Responsable</label>
										<select
											value={form.responsibleId}
											onChange={(e) => setForm({ ...form, responsibleId: e.target.value })}
											className={selectClass}
										>
											{responsibleLawyer && (
												<option value={String(responsibleLawyer.id)}>
													{responsibleLawyer.name} (responsable)
												</option>
											)}
											{internalLawyer && internalLawyer.id !== responsibleLawyer?.id && (
												<option value={String(internalLawyer.id)}>
													{internalLawyer.name} (interno)
												</option>
											)}
										</select>
									</div>
								</div>
								<p className="text-[11px] text-muted-foreground">
									El aviso llega a las 8:00 a los dos abogados del caso, y otra vez el día del
									vencimiento. El vencimiento se agenda solo en el calendario.
								</p>
							</div>
						)}
					</div>

					{/* Actions */}
					<DialogFooter className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
						<Button variant="outline" onClick={() => setIsModalOpen(false)}>
							Cancelar
						</Button>
						<Button
							variant="default"
							className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium"
							onClick={handleSave}
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{" "}
									Guardando...
								</>
							) : editingId ? (
								"Guardar cambios"
							) : (
								"Crear plazo"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Modal Ajustar Fecha de Vencimiento ── */}
			<Dialog open={isAdjustModalOpen} onOpenChange={(open) => !open && setIsAdjustModalOpen(false)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<div className="flex items-center gap-3">
							<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
								<CalendarClock className="h-5 w-5 text-primary" />
							</div>
							<div>
								<DialogTitle className="text-lg font-bold text-foreground">
									Ajustar Fecha de Vencimiento
								</DialogTitle>
								<DialogDescription className="text-xs text-muted-foreground">
									{adjustingDeadline?.title}
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					<div className="space-y-4">
						{/* Fecha calculada actual */}
						<div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
							<div className="flex items-center gap-2">
								<Info className="h-4 w-4 text-blue-500 shrink-0" />
								<p className="text-sm text-blue-800 dark:text-blue-300">
									<span className="font-medium">
										Fecha{" "}
										{adjustingDeadline?.mode === "auto"
											? "calculada automáticamente"
											: "actual"}
										:
									</span>{" "}
									{fmtDate(adjustingDeadline?.dueDate)}
								</p>
							</div>
						</div>

						{/* Si ya fue ajustado antes, mostrar info */}
						{adjustingDeadline?.adjustedAt && (
							<div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
								<p className="text-xs text-amber-800 dark:text-amber-300">
									<span className="font-semibold">Ajuste previo:</span>{" "}
									{adjustingDeadline.adjustmentReason}
									<br />
									<span className="text-[11px] text-amber-600">
										{new Date(adjustingDeadline.adjustedAt).toLocaleString(
											"es-AR",
											{
												day: "2-digit",
												month: "2-digit",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											},
										)}
									</span>
								</p>
							</div>
						)}

						{/* Nueva fecha */}
						<div>
							<label className="block text-xs font-medium text-muted-foreground mb-1">
								Nueva fecha de vencimiento{" "}
								<span className="text-red-500">*</span>
							</label>
							<input
								type="date"
								value={adjustForm.newDueDate}
								onChange={(e) =>
									setAdjustForm({ ...adjustForm, newDueDate: e.target.value })
								}
								className="w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
							/>
						</div>

						{/* Motivo */}
						<div>
							<label className="block text-xs font-medium text-muted-foreground mb-1">
								Motivo del ajuste <span className="text-red-500">*</span>
							</label>
							<textarea
								value={adjustForm.reason}
								onChange={(e) =>
									setAdjustForm({ ...adjustForm, reason: e.target.value })
								}
								placeholder="Ej: Feriado extraordinario por..., Suspensión judicial por..., Error en el cálculo debido a..."
								rows={3}
								className="w-full rounded-md border border-input bg-card px-2.5 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
							/>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Mínimo 10 caracteres. Este motivo quedará registrado para
								auditoría.
							</p>
						</div>

						{/* Aviso importante */}
						<div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
							<div className="flex items-start gap-2">
								<AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
								<p className="text-xs text-amber-800 dark:text-amber-300">
									<span className="font-semibold">Importante:</span> El ajuste
									manual sobreescribe el cálculo automático. Asegurate de
									documentar correctamente el motivo.
								</p>
							</div>
						</div>
					</div>

					{/* Actions */}
					<DialogFooter className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
						<Button
							variant="outline"
							onClick={() => setIsAdjustModalOpen(false)}
						>
							Cancelar
						</Button>
						<Button
							variant="default"
							className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium"
							onClick={handleSaveAdjust}
							disabled={isAdjusting || adjustForm.reason.length < 10}
						>
							{isAdjusting ? (
								<>
									<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{" "}
									Guardando...
								</>
							) : (
								"Guardar Ajuste"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{ConfirmationDialog}
		</div>
	);
};
