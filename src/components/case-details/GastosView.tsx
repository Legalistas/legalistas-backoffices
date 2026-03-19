"use client";

import {
	Calendar,
	ChevronDown,
	DollarSign,
	FileText,
	Loader2,
	Pencil,
	Plus,
	Search,
	Tag,
	Trash2,
	TrendingUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useConfirm } from "@/hooks/useConfirm";
import {
	CASE_EXPENSE_BY_ID_ENDPOINT,
	CASE_EXPENSES_ENDPOINT,
} from "@/constant/api-endpoints";
import { TYPES_PROCCESS } from "@/constant/causes";
import type { CaseExpense, CasesFiles } from "@/types/cases";

const CATEGORY_OPTIONS = [
	{ value: "tasa_justicia", label: "Tasa de justicia" },
	{ value: "honorarios", label: "Honorarios" },
	{ value: "peritos", label: "Peritos" },
	{ value: "notificaciones", label: "Notificaciones" },
	{ value: "copias", label: "Copias certificadas" },
	{ value: "bonos", label: "Bonos" },
	{ value: "traslados", label: "Traslados" },
	{ value: "otros", label: "Otros" },
];

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

const EMPTY_FORM = {
	fileId: "" as string | number,
	description: "",
	amount: "",
	date: "",
	category: "",
};

interface GastosViewProps {
	caseId: string;
	files?: CasesFiles[];
	customerName?: string;
}

export const GastosView = ({
	caseId,
	files = [],
	customerName,
}: GastosViewProps) => {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [expenses, setExpenses] = useState<CaseExpense[]>([]);
	const [loading, setLoading] = useState(true);

	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
	const [form, setForm] = useState(EMPTY_FORM);

	// Dropdowns state
	const [isFileOpen, setIsFileOpen] = useState(false);
	const [fileSearch, setFileSearch] = useState("");
	const fileRef = useRef<HTMLDivElement>(null);
	const fileSearchRef = useRef<HTMLInputElement>(null);
	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const categoryRef = useRef<HTMLDivElement>(null);

	// Close dropdowns on outside click
	useEffect(() => {
		const handle = (e: MouseEvent) => {
			if (isFileOpen && !fileRef.current?.contains(e.target as Node))
				setIsFileOpen(false);
			if (isCategoryOpen && !categoryRef.current?.contains(e.target as Node))
				setIsCategoryOpen(false);
		};
		document.addEventListener("mousedown", handle);
		return () => document.removeEventListener("mousedown", handle);
	}, [isFileOpen, isCategoryOpen]);

	// Auto-focus file search
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

	const totalExpenses = useMemo(
		() => expenses.reduce((acc, e) => acc + e.amount, 0),
		[expenses],
	);

	// Fetch expenses
	const fetchExpenses = useCallback(async () => {
		try {
			const res = await fetch(CASE_EXPENSES_ENDPOINT(Number(caseId)), {
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
			});
			if (!res.ok) throw new Error("Error al cargar gastos");
			const data = await res.json();
			setExpenses(data.expenses || []);
		} catch (error) {
			console.error("Error fetching expenses:", error);
		} finally {
			setLoading(false);
		}
	}, [caseId, session?.user?.accessToken]);

	useEffect(() => {
		if (session?.user?.accessToken) {
			fetchExpenses();
		} else {
			setLoading(false);
		}
	}, [fetchExpenses, session?.user?.accessToken]);

	// Handlers
	const handleOpenNew = () => {
		setForm({ ...EMPTY_FORM });
		setEditingExpenseId(null);
		setIsModalOpen(true);
	};

	const handleEdit = (expense: CaseExpense) => {
		setEditingExpenseId(expense.id);
		setForm({
			fileId: expense.fileId || "",
			description: expense.description || "",
			amount: String(expense.amount),
			date: expense.date ? expense.date.slice(0, 10) : "",
			category: expense.category || "",
		});
		setIsModalOpen(true);
	};

	const handleSave = async () => {
		if (
			!form.amount ||
			isNaN(Number(form.amount)) ||
			Number(form.amount) <= 0
		) {
			toast.error("El monto es obligatorio y debe ser mayor a 0");
			return;
		}

		setIsSubmitting(true);
		try {
			const isEditing = editingExpenseId !== null;
			const url = isEditing
				? CASE_EXPENSE_BY_ID_ENDPOINT(Number(caseId), editingExpenseId)
				: CASE_EXPENSES_ENDPOINT(Number(caseId));

			const res = await fetch(url, {
				method: isEditing ? "PUT" : "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					fileId: form.fileId ? Number(form.fileId) : null,
					description: form.description || null,
					amount: Number(form.amount),
					date: form.date || null,
					category: form.category || null,
					userId: session?.user?.id ? Number(session.user.id) : null,
				}),
			});

			if (!res.ok) {
				const errorData = await res.text();
				throw new Error(errorData);
			}

			toast.success(
				isEditing
					? "Gasto actualizado correctamente"
					: "Gasto creado correctamente",
			);
			setIsModalOpen(false);
			setEditingExpenseId(null);
			await fetchExpenses();
		} catch (error) {
			console.error("Error saving expense:", error);
			toast.error(
				editingExpenseId
					? "Error al actualizar el gasto"
					: "Error al crear el gasto",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (expenseId: number) => {
		if (!(await confirm({ description: "¿Estás seguro de eliminar este gasto?", confirmLabel: "Eliminar" }))) return;

		try {
			const res = await fetch(
				CASE_EXPENSE_BY_ID_ENDPOINT(Number(caseId), expenseId),
				{
					method: "DELETE",
					headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
				},
			);
			if (!res.ok) throw new Error("Error al eliminar");
			toast.success("Gasto eliminado");
			await fetchExpenses();
		} catch (error) {
			console.error("Error deleting expense:", error);
			toast.error("Error al eliminar el gasto");
		}
	};

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("es-AR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const getCategoryLabel = (code: string) =>
		CATEGORY_OPTIONS.find((c) => c.value === code)?.label || code;

	// Loading
	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const inputClass =
		"w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";

	return (
		<>
			<div className="rounded-xl border border-border bg-card shadow-sm">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<div className="flex items-center gap-2">
						<DollarSign className="h-5 w-5 text-muted-foreground" />
						<h3 className="text-md font-semibold text-foreground">
							Gastos
						</h3>
						{expenses.length > 0 && (
							<span className="text-xs text-muted-foreground">
								({expenses.length} gastos)
							</span>
						)}
						{expenses.length > 0 && (
							<div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md bg-primary/5 dark:bg-primary/80/20 border border-primary/20 dark:border-primary/20">
								<TrendingUp className="h-3.5 w-3.5 text-primary dark:text-primary" />
								<span className="text-xs font-semibold text-primary dark:text-primary">
									Total: ${totalExpenses.toLocaleString("es-AR")}
								</span>
							</div>
						)}
					</div>
					<button
						onClick={handleOpenNew}
						className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted transition-colors"
					>
						<Plus className="h-3.5 w-3.5" />
						Nuevo gasto
					</button>
				</div>

				{/* Content */}
				{expenses.length === 0 ? (
					<div className="flex flex-col items-center justify-center px-5 py-14">
						<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
							<DollarSign className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-foreground mb-1">
							No hay gastos registrados
						</p>
						<p className="text-xs text-muted-foreground mb-3">
							Registrá los gastos asociados al caso.
						</p>
						<button
							onClick={handleOpenNew}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/85 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Nuevo gasto
						</button>
					</div>
				) : (
					<div className="p-4 space-y-3">
						{expenses.map((gasto) => (
							<div
								key={gasto.id}
								className="rounded-lg border p-5 bg-card border-border"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-start gap-3 min-w-0 flex-1">
										<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 shrink-0">
											<DollarSign className="h-5 w-5 text-green-500" />
										</div>
										<div className="min-w-0 flex-1">
											<h4 className="text-sm font-semibold text-foreground">
												{gasto.description || "Sin descripción"}
											</h4>
											{gasto.category && (
												<span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-md text-xs font-medium border bg-muted text-foreground border-border">
													{getCategoryLabel(gasto.category)}
												</span>
											)}
											<div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
												{gasto.date && (
													<>
														<span>{formatDate(gasto.date)}</span>
														<span>•</span>
													</>
												)}
												{gasto.file && (
													<>
														<span className="flex items-center gap-1">
															<FileText className="h-3 w-3 text-blue-400" />
															{getFileLabel(gasto.file, customerName)}
														</span>
														<span>•</span>
													</>
												)}
												{gasto.user && <span>{gasto.user.name}</span>}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<span className="text-sm font-bold text-foreground">
											${gasto.amount.toLocaleString("es-AR")}
										</span>
										<div className="flex items-center gap-1.5">
											<button
												onClick={() => handleEdit(gasto)}
												title="Editar gasto"
												className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
											>
												<Pencil className="h-4 w-4" />
											</button>
											<button
												onClick={() => handleDelete(gasto.id)}
												title="Eliminar gasto"
												className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							</div>
						))}

						{/* Total card */}
						<div className="rounded-lg border-2 p-5 bg-primary/5 dark:bg-primary/80/10 border-primary/20 dark:border-primary/20">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-primary dark:text-primary">
									Total acumulado
								</span>
								<span className="text-lg font-bold text-primary dark:text-primary">
									${totalExpenses.toLocaleString("es-AR")}
								</span>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Modal Crear / Editar Gasto */}
			<Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
				<DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
					{/* Header */}
					<DialogHeader className="flex flex-row items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
							<DollarSign className="h-5 w-5 text-primary" />
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-foreground">
								{editingExpenseId ? "Editar gasto" : "Nuevo gasto"}
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">Gasto asociado al caso</DialogDescription>
						</div>
					</DialogHeader>

					<div className="space-y-5 overflow-y-auto flex-1 pr-1">
						{/* Sección: Vinculación */}
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
												setIsCategoryOpen(false);
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

						{/* Sección: Detalle del gasto */}
						<div className="space-y-3">
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								Detalle del gasto
							</h3>

							{/* Descripción */}
							<div>
								<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
									<FileText className="h-3.5 w-3.5 text-muted-foreground" />
									Descripción
								</label>
								<input
									type="text"
									className={inputClass}
									placeholder="Ej: Tasa de justicia, honorarios perito..."
									value={form.description}
									onChange={(e) =>
										setForm({ ...form, description: e.target.value })
									}
								/>
							</div>

							{/* Monto + Fecha */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
										Monto <span className="text-red-500">*</span>
									</label>
									<input
										type="number"
										step="0.01"
										min="0"
										className={inputClass}
										placeholder="0.00"
										value={form.amount}
										onChange={(e) =>
											setForm({ ...form, amount: e.target.value })
										}
									/>
								</div>
								<div>
									<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
										<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
										Fecha
									</label>
									<input
										type="date"
										className={inputClass}
										value={form.date}
										onChange={(e) => setForm({ ...form, date: e.target.value })}
									/>
								</div>
							</div>

							{/* Categoría dropdown */}
							<div>
								<label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
									<Tag className="h-3.5 w-3.5 text-muted-foreground" />
									Categoría
								</label>
								<div className="relative" ref={categoryRef}>
									<button
										type="button"
										onClick={() => {
											setIsCategoryOpen(!isCategoryOpen);
											setIsFileOpen(false);
										}}
										className="w-full flex items-center justify-between text-sm text-left bg-muted border border-border rounded-lg px-3 py-2.5 hover:border-input focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
									>
										<span
											className={`truncate ${form.category ? "text-foreground" : "text-muted-foreground"}`}
										>
											{form.category
												? getCategoryLabel(form.category)
												: "Seleccionar categoría"}
										</span>
										<ChevronDown
											className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`}
										/>
									</button>
									{isCategoryOpen && (
										<div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
											<div className="max-h-52 overflow-y-auto">
												<button
													type="button"
													onClick={() => {
														setForm({ ...form, category: "" });
														setIsCategoryOpen(false);
													}}
													className={`w-full px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors border-b border-border ${!form.category ? "bg-primary/5 text-primary font-medium" : "text-muted-foreground"}`}
												>
													Sin categoría
												</button>
												{CATEGORY_OPTIONS.map((c) => (
													<button
														key={c.value}
														type="button"
														onClick={() => {
															setForm({ ...form, category: c.value });
															setIsCategoryOpen(false);
														}}
														className={`w-full px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors border-b border-border last:border-0 ${form.category === c.value ? "bg-primary/5 text-primary font-medium" : "text-foreground"}`}
													>
														{c.label}
													</button>
												))}
											</div>
										</div>
									)}
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
							{editingExpenseId ? "Guardar cambios" : "Agregar gasto"}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			{ConfirmationDialog}
		</>
	);
};
