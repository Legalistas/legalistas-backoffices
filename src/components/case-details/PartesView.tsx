"use client";

import {
	Building2,
	ChevronDown,
	FileText,
	Loader2,
	Mail,
	MapPin,
	Pencil,
	Phone,
	Plus,
	Search,
	Trash2,
	User,
	Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useConfirm } from "@/hooks/useConfirm";
import {
	CASE_PART_BY_ID_ENDPOINT,
	CASE_PARTS_ENDPOINT,
	SETTINGS_COUNTRIES_ENDPOINT,
} from "@/constant/api-endpoints";
import { getExpedienteLabel } from "@/lib/expediente-label";
import {
	PARTY_TYPE_LABELS,
	PARTY_TYPES,
	partyTypeLabel,
} from "@/constant/parties";
import { apiErrorMessage } from "@/lib/api-error";
import type { CasePart, CasesFiles } from "@/types/cases";

// Tipo de persona y tipo de documento se eliminaron del formulario
// (relevamiento 5.1): el único documento relevante es el DNI del testigo.

// Los cinco tipos del relevamiento 5.2. Se conservan además los colores de los
// valores heredados, porque las partes que todavía no se migraron siguen
// trayéndolos y hay que poder mostrarlas.
const partyTypeColors: Record<string, string> = {
	ACTOR:
		"bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
	DEMANDADO:
		"bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
	TERCERO_CITADO_GARANTIA:
		"bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
	TESTIGO:
		"bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
	PERITO:
		"bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800",
	// Heredados, solo lectura.
	actor:
		"bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
	DEMANDANTE:
		"bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
	demandado:
		"bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
	TERCERO:
		"bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
	art: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
	abogado: "bg-muted text-foreground border-input",
};

// Carátula del expediente: helper compartido (usa la carátula automática).
const getFileLabel = getExpedienteLabel;

interface Country {
	id: number;
	name: string;
	states?: State[];
}

interface State {
	id: number;
	name: string;
}

// Campos del relevamiento 5.1. Ya no están tipo de persona, tipo de documento,
// país (fijo en Argentina), mail ni letrado patrocinante.
const EMPTY_FORM = {
	fileId: "" as string | number,
	partyId: null as number | null,
	partyType: "" as string,
	name: "",
	documentNumber: "",
	stateId: "" as string | number,
	city: "",
	postalCode: "",
	address: "",
	phone: "",
};

interface PartesViewProps {
	caseId: string;
	files?: CasesFiles[];
	customerName?: string;
}

export const PartesView = ({
	caseId,
	files = [],
	customerName,
}: PartesViewProps) => {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [parts, setParts] = useState<CasePart[]>([]);
	const [loading, setLoading] = useState(true);

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingPartId, setEditingPartId] = useState<number | null>(null);
	const [form, setForm] = useState(EMPTY_FORM);

	// Provincias de Argentina — el país ya no se elige.
	const [states, setStates] = useState<State[]>([]);
	const [isStateOpen, setIsStateOpen] = useState(false);
	const stateRef = useRef<HTMLDivElement>(null);

	// ── Dropdowns state ──
	const [isFileOpen, setIsFileOpen] = useState(false);
	const [fileSearch, setFileSearch] = useState("");
	const fileRef = useRef<HTMLDivElement>(null);
	const fileSearchRef = useRef<HTMLInputElement>(null);
	const [isPartyTypeOpen, setIsPartyTypeOpen] = useState(false);
	const partyTypeRef = useRef<HTMLDivElement>(null);

	// Cerrar dropdowns al click fuera
	useEffect(() => {
		const handle = (e: MouseEvent) => {
			if (isFileOpen && !fileRef.current?.contains(e.target as Node))
				setIsFileOpen(false);
			if (isPartyTypeOpen && !partyTypeRef.current?.contains(e.target as Node))
				setIsPartyTypeOpen(false);
			if (isStateOpen && !stateRef.current?.contains(e.target as Node))
				setIsStateOpen(false);
		};
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, [isFileOpen, isPartyTypeOpen, isStateOpen]);

	// Auto-focus file search on open
	useEffect(() => {
		if (isFileOpen) setTimeout(() => fileSearchRef.current?.focus(), 0);
	}, [isFileOpen]);

	const selectedFileLabel = useMemo(() => {
		const f = files.find((file) => String(file.id) === String(form.fileId));
		if (!f) return "Sin vincular (general del caso)";
		return getFileLabel(f, customerName);
	}, [form.fileId, files, customerName]);

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

	// El país quedó fijo en Argentina (relevamiento 5.1), así que ya no se
	// elige: se cargan directamente sus provincias en vez de encadenar dos
	// selects.
	const fetchStates = useCallback(async () => {
		try {
			const res = await fetch(`${SETTINGS_COUNTRIES_ENDPOINT}`, {
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
			});
			if (!res.ok) return;
			const data = await res.json();
			const argentina = (data.data || []).find(
				(c: Country) => c.name?.toLowerCase() === "argentina",
			);
			setStates(argentina?.states || []);
		} catch (error) {
			console.error("Error fetching states:", error);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		if (session?.user?.accessToken) fetchStates();
	}, [fetchStates, session?.user?.accessToken]);

	// ── Fetch partes ──
	const fetchParts = useCallback(async () => {
		try {
			const res = await fetch(CASE_PARTS_ENDPOINT(Number(caseId)), {
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});
			if (!res.ok) throw new Error("Error al cargar partes");
			const data = await res.json();
			setParts(data.parts || []);
		} catch (error) {
			console.error("Error fetching parts:", error);
		} finally {
			setLoading(false);
		}
	}, [caseId, session?.user?.accessToken]);

	useEffect(() => {
		if (session?.user?.accessToken) {
			fetchParts();
		} else {
			setLoading(false);
		}
	}, [fetchParts, session?.user?.accessToken]);

	// ── Handlers ──
	const handleOpenNew = () => {
		setForm({ ...EMPTY_FORM });
		setEditingPartId(null);
		setIsModalOpen(true);
	};

	const handleEdit = (part: CasePart) => {
		setEditingPartId(part.id);
		setForm({
			fileId: part.fileId || "",
			partyId: part.partyId ?? null,
			// Una parte sin migrar puede traer un tipo que ya no se ofrece
			// ('actor', 'DEMANDANTE'). Se deja vacío para que se elija uno válido
			// en vez de traducirlo por nuestra cuenta.
			partyType: (PARTY_TYPES as readonly string[]).includes(part.partyType)
				? part.partyType
				: "",
			name: part.name || "",
			documentNumber: part.documentNumber || "",
			stateId: part.stateId || "",
			city: part.city || "",
			postalCode: part.postalCode || "",
			address: part.address || "",
			phone: part.phone || "",
		});
		setIsModalOpen(true);
	};

	const handleSave = async () => {
		// Los cinco obligatorios del relevamiento 5.1, más el expediente: la
		// asignación es por expediente y no por caso (5.3).
		const faltantes: string[] = [];
		if (!form.name.trim()) faltantes.push("razón social o nombre");
		if (!form.partyType) faltantes.push("tipo de parte");
		if (!form.fileId) faltantes.push("expediente");
		if (!form.address.trim()) faltantes.push("domicilio");
		if (!form.city.trim()) faltantes.push("ciudad");
		if (!form.stateId) faltantes.push("provincia");
		if (!form.postalCode.trim()) faltantes.push("código postal");
		if (faltantes.length > 0) {
			toast.error(`Falta completar: ${faltantes.join(", ")}`);
			return;
		}

		setIsSubmitting(true);
		try {
			const isEditing = editingPartId !== null;
			const url = isEditing
				? CASE_PART_BY_ID_ENDPOINT(Number(caseId), editingPartId)
				: CASE_PARTS_ENDPOINT(Number(caseId));

			const res = await fetch(url, {
				method: isEditing ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					fileId: Number(form.fileId),
					partyId: form.partyId,
					partyType: form.partyType,
					name: form.name.trim(),
					address: form.address.trim(),
					city: form.city.trim(),
					stateId: Number(form.stateId),
					postalCode: form.postalCode.trim(),
					phone: form.phone.trim() || null,
					documentNumber: form.documentNumber.trim() || null,
				}),
			});

			if (!res.ok) {
				throw new Error(
					await apiErrorMessage(
						res,
						isEditing ? "Error al actualizar la parte" : "Error al crear la parte",
					),
				);
			}

			toast.success(
				isEditing
					? "Parte actualizada correctamente"
					: "Parte creada correctamente",
			);
			setIsModalOpen(false);
			setEditingPartId(null);
			await fetchParts();
		} catch (error) {
			console.error("Error saving part:", error);
			toast.error(
				error instanceof Error
					? error.message
					: editingPartId
						? "Error al actualizar la parte"
						: "Error al crear la parte",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (partId: number) => {
		if (!(await confirm({ description: "¿Estás seguro de eliminar esta parte?", confirmLabel: "Eliminar" }))) return;

		try {
			const res = await fetch(
				CASE_PART_BY_ID_ENDPOINT(Number(caseId), partId),
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);
			if (!res.ok)
				throw new Error(await apiErrorMessage(res, "Error al eliminar la parte"));
			toast.success("Parte eliminada");
			await fetchParts();
		} catch (error) {
			console.error("Error deleting part:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al eliminar la parte",
			);
		}
	};

	// Resuelve también los tipos heredados, para que una parte sin migrar no
	// muestre el código crudo en la tarjeta.
	const getPartyTypeLabel = (code: string) => partyTypeLabel(code);

	// ── Loading ──
	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const inputClass =
		"w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
	const labelClass =
		"block text-xs font-medium text-muted-foreground mb-1";

	return (
		<>
			<div className="rounded-xl border border-border bg-card shadow-sm">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<div className="flex items-center gap-2">
						<Users className="h-5 w-5 text-muted-foreground" />
						<h3 className="text-md font-semibold text-foreground">
							Partes del Caso
						</h3>
						<span className="text-xs text-muted-foreground">({parts.length})</span>
					</div>
					<button
						onClick={handleOpenNew}
						className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
						Agregar parte
					</button>
				</div>

				{/* Content */}
				{parts.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-5 py-14">
						<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
							<Users className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-foreground mb-1">
							No hay partes registradas
						</p>
						<p className="text-xs text-muted-foreground mb-3">
							Agregá las partes involucradas en el caso.
						</p>
						<button
							onClick={handleOpenNew}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/85 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Agregar parte
						</button>
					</div>
				) : (
					<div className="p-4 space-y-3">
						{parts.map((parte) => (
							<div
								key={parte.id}
								className="rounded-lg border p-5 bg-card border-border"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-start gap-3 min-w-0 flex-1">
										{/* El ícono ya no depende del tipo de persona, que se eliminó
										    del formulario: ahora distingue una parte reutilizada del
										    catálogo de una carga suelta. */}
										<div
											className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${parte.party ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" : "bg-muted border border-border"}`}
											title={
												parte.party
													? `Del catálogo: ${parte.party.name}`
													: "Carga suelta, no está en el catálogo"
											}
										>
											{parte.party ? (
												<Building2 className="h-5 w-5 text-blue-500" />
											) : (
												<User className="h-5 w-5 text-muted-foreground" />
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 flex-wrap">
												<h4 className="text-sm font-semibold text-foreground truncate">
													{parte.name}
												</h4>
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${partyTypeColors[parte.partyType] || "bg-muted text-muted-foreground border-border"}`}
												>
													{getPartyTypeLabel(parte.partyType)}
												</span>
											</div>

											{/* DNI — el tipo de documento se eliminó del formulario. */}
											{parte.documentNumber && (
												<p className="mt-1 text-xs text-muted-foreground">
													<span className="font-medium">DNI:</span>{" "}
													{parte.documentNumber}
												</p>
											)}

											<div className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
												{parte.address && (
													<div className="flex items-center gap-1.5">
														<MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
														<span>
															{parte.address}
															{parte.city ? `, ${parte.city}` : ""}
														</span>
													</div>
												)}
												{parte.phone && (
													<div className="flex items-center gap-1.5">
														<Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
														<span>{parte.phone}</span>
													</div>
												)}
												{parte.postalCode && (
													<div className="flex items-center gap-1.5">
														<MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
														<span>
															C.P. {parte.postalCode}
															{parte.state ? ` — ${parte.state.name}` : ""}
														</span>
													</div>
												)}
												{parte.party && !parte.party.isActive && (
													<div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
														<FileText className="h-3.5 w-3.5 shrink-0" />
														<span>
															"{parte.party.name}" está dada de baja en el
															catálogo
														</span>
													</div>
												)}
												{parte.file && (
													<div className="flex items-center gap-1.5">
														<FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
														<span>
															{getFileLabel(parte.file, customerName)}
														</span>
													</div>
												)}
											</div>
										</div>
									</div>

									{/* Acciones */}
									<div className="flex items-center gap-1.5 shrink-0">
										<button
											onClick={() => handleEdit(parte)}
											title="Editar parte"
											className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
										>
											<Pencil className="h-4 w-4" />
										</button>
										<button
											onClick={() => handleDelete(parte.id)}
											title="Eliminar parte"
											className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* ── Modal Crear / Editar Parte ── */}
			<Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
				<DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
					{/* Header */}
					<DialogHeader className="flex flex-row items-center gap-3 mb-5">
						<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
							<Users className="h-5 w-5 text-primary" />
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-foreground">
								{editingPartId ? "Editar parte" : "Nueva parte"}
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Parte involucrada en el caso
							</DialogDescription>
						</div>
					</DialogHeader>

					<div className="space-y-5 overflow-y-auto flex-1 pr-1">
						{/* ── Sección: Vinculación ── */}
						{files.length > 0 && (
							<div className="space-y-3">
								<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Vinculación
								</h3>
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										<FileText className="h-3.5 w-3.5 text-muted-foreground" />
										Expediente vinculado
									</label>
									<div ref={fileRef} className="relative">
										<button
											type="button"
											onClick={() => {
												setIsFileOpen(!isFileOpen);
												setIsPartyTypeOpen(false);
												setIsStateOpen(false);
											}}
											className="w-full flex items-center justify-between text-sm text-left bg-muted border border-border rounded-lg px-3 py-2.5 hover:border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
										>
											<span
												className={`truncate ${form.fileId ? "text-foreground" : "text-muted-foreground"}`}
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
												<button
													type="button"
													onClick={() => {
														setForm({ ...form, fileId: "" });
														setIsFileOpen(false);
														setFileSearch("");
													}}
													className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted ${!form.fileId ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
												>
													Sin vincular (general del caso)
												</button>
												{searchedFiles.map((f) => (
													<button
														key={f.id}
														type="button"
														onClick={() => {
															setForm({ ...form, fileId: f.id });
															setIsFileOpen(false);
															setFileSearch("");
														}}
														className={`w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted truncate ${String(form.fileId) === String(f.id) ? "bg-primary/10 text-primary" : "text-foreground"}`}
													>
														{getFileLabel(f, customerName)}
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{files.length > 0 && (
							<div className="border-t border-border" />
						)}

						{/* ── Sección: Identificación ── */}
						<div className="space-y-3">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Identificación
							</h3>

							{/* Nombre */}
							<div>
								<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
									<User className="h-3.5 w-3.5 text-muted-foreground" />
									Nombre <span className="text-red-500">*</span>
								</label>
								<input
									type="text"
									className={inputClass}
									placeholder="Nombre completo o razón social"
									value={form.name}
									onChange={(e) => setForm({ ...form, name: e.target.value })}
								/>
							</div>

							{/* Tipo de parte */}
							<div className="grid grid-cols-1 gap-3">
								{/* Dropdown: Tipo de parte */}
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										Tipo de parte <span className="text-red-500">*</span>
									</label>
									<div className="relative" ref={partyTypeRef}>
										<button
											type="button"
											onClick={() => {
												setIsPartyTypeOpen(!isPartyTypeOpen);
											}}
											className="w-full flex items-center justify-between text-sm text-left bg-muted border border-border rounded-lg px-3 py-2.5 hover:border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
										>
											<span className="truncate text-foreground">
												{form.partyType
													? PARTY_TYPE_LABELS[
															form.partyType as keyof typeof PARTY_TYPE_LABELS
														]
													: "Seleccionar"}
											</span>
											<ChevronDown
												className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isPartyTypeOpen ? "rotate-180" : ""}`}
											/>
										</button>
										{isPartyTypeOpen && (
											<div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
												<div className="max-h-52 overflow-y-auto">
													{PARTY_TYPES.map((t) => (
														<button
															key={t}
															type="button"
															onClick={() => {
																setForm({ ...form, partyType: t });
																setIsPartyTypeOpen(false);
															}}
															className={`w-full px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-border last:border-0 ${form.partyType === t ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
														>
															<span className="text-sm">
																{PARTY_TYPE_LABELS[t]}
															</span>
														</button>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Documento */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										Nro. de documento
									</label>
									<input
										type="text"
										className={inputClass}
										placeholder="Ej: 30-12345678-9"
										value={form.documentNumber}
										onChange={(e) =>
											setForm({ ...form, documentNumber: e.target.value })
										}
									/>
								</div>
							</div>
						</div>

						{/* Separador */}
						<div className="border-t border-border" />

						{/* ── Sección: Domicilio ── */}
						<div className="space-y-3">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Domicilio
							</h3>

							{/* País + Provincia */}
							<div className="grid grid-cols-2 gap-3">
								{/* Dropdown: Provincia/Estado */}
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										Provincia
									</label>
									<div className="relative" ref={stateRef}>
										<button
											type="button"
											onClick={() => {
												if (states.length > 0) {
													setIsStateOpen(!isStateOpen);
													setIsPartyTypeOpen(false);
												}
											}}
											disabled={states.length === 0}
											className="w-full flex items-center justify-between text-sm text-left bg-muted border border-border rounded-lg px-3 py-2.5 hover:border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<span
												className={`truncate ${!form.stateId ? "text-muted-foreground" : "text-foreground"}`}
											>
												{form.stateId
													? states.find((s) => s.id === Number(form.stateId))
															?.name || "Seleccionar"
													: states.length === 0
														? "Seleccioná un país"
														: "Seleccionar provincia"}
											</span>
											<ChevronDown
												className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isStateOpen ? "rotate-180" : ""}`}
											/>
										</button>
										{isStateOpen && (
											<div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
												<div className="max-h-52 overflow-y-auto">
													{states.map((s) => (
														<button
															key={s.id}
															type="button"
															onClick={() => {
																setForm({ ...form, stateId: s.id });
																setIsStateOpen(false);
															}}
															className={`w-full px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors border-b border-border last:border-0 ${Number(form.stateId) === s.id ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
														>
															{s.name}
														</button>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>

							{/* Ciudad + Código Postal */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										Ciudad
									</label>
									<input
										type="text"
										className={inputClass}
										placeholder="Ciudad"
										value={form.city}
										onChange={(e) => setForm({ ...form, city: e.target.value })}
									/>
								</div>
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										Código Postal
									</label>
									<input
										type="text"
										className={inputClass}
										placeholder="Ej: 1425"
										value={form.postalCode}
										onChange={(e) =>
											setForm({ ...form, postalCode: e.target.value })
										}
									/>
								</div>
							</div>

							{/* Domicilio */}
							<div>
								<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
									<MapPin className="h-3.5 w-3.5 text-muted-foreground" />
									Dirección
								</label>
								<input
									type="text"
									className={inputClass}
									placeholder="Calle, número, piso, depto"
									value={form.address}
									onChange={(e) =>
										setForm({ ...form, address: e.target.value })
									}
								/>
							</div>
						</div>

						{/* Separador */}
						<div className="border-t border-border" />

						{/* ── Sección: Contacto ── */}
						<div className="space-y-3">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Contacto
							</h3>

							{/* Teléfono */}
							<div className="grid grid-cols-1 gap-3">
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										<Phone className="h-3.5 w-3.5 text-muted-foreground" />
										Teléfono
									</label>
									<input
										type="text"
										className={inputClass}
										placeholder="+54 9 11 ..."
										value={form.phone}
										onChange={(e) =>
											setForm({ ...form, phone: e.target.value })
										}
									/>
								</div>
							</div>
						</div>

					</div>

					{/* Footer */}
					<DialogFooter className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
						<button
							onClick={() => setIsModalOpen(false)}
							disabled={isSubmitting}
							className="px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							onClick={handleSave}
							disabled={isSubmitting}
							className="px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
						>
							{isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
							{editingPartId ? "Guardar cambios" : "Agregar parte"}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{ConfirmationDialog}
		</>
	);
};
