"use client";

import {
	Calendar,
	CheckCircle2,
	Clock,
	DollarSign,
	FileText,
	Landmark,
	Loader2,
	Pencil,
	Plus,
	Tag,
	Trash2,
	TrendingUp,
	UserRound,
	Wallet,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CASE_EXPENSE_BY_ID_ENDPOINT, CASE_EXPENSES_ENDPOINT } from "@/constant/api-endpoints";
import { GASTO_CATEGORIAS, gastoCategoriaLabel, PAGADO_POR_LABEL } from "@/constant/gastos";
import { useConfirm } from "@/hooks/useConfirm";
import { apiErrorMessage } from "@/lib/api-error";
import { getExpedienteLabel } from "@/lib/expediente-label";
import { cn } from "@/lib/utils";
import type { CaseExpense, CasesFiles } from "@/types/cases";
import { ExpedienteSelect } from "./ExpedienteSelect";

type PagadoPor = "ESTUDIO" | "ABOGADO_EXTERNO";

const SIN_CATEGORIA = "none";

const hoyISO = () =>
	new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

/** "2026-09-25" o ISO → "25/09/2026", sin corrimiento de zona horaria. */
const formatFecha = (valor: string) => valor.slice(0, 10).split("-").reverse().join("/");

const EMPTY_FORM = {
	fileId: null as number | null,
	description: "",
	amount: "",
	date: "",
	category: "",
	pagadoPor: null as PagadoPor | null,
};

type TonoEstado = "pendiente" | "pagado" | "reintegro" | "caja";

const TONO_CLASS: Record<TonoEstado, string> = {
	pendiente:
		"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
	pagado:
		"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
	reintegro:
		"bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800",
	caja: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
};

/** El gasto ya fue pagado por Contabilidad desde una caja. */
const estaPago = (gasto: CaseExpense) => gasto.scheduledTransaction?.status === "paid";

/** Caja de la que salió un gasto viejo (los que descontaban al cargarse). */
const cajaDelGastoViejo = (gasto: CaseExpense) =>
	gasto.cajaMovimientos?.find((m) => !m.informativo)?.caja.nombre ?? null;

/** En qué está el gasto, para su tarjeta: pendiente en Contabilidad, pagado o a reintegrar. */
function estadoDelGasto(gasto: CaseExpense): { texto: string; tono: TonoEstado } | null {
	if (gasto.pagadoPor === "ABOGADO_EXTERNO") {
		return { texto: PAGADO_POR_LABEL.ABOGADO_EXTERNO, tono: "reintegro" };
	}
	if (gasto.pagadoPor !== "ESTUDIO") return null;

	const fila = gasto.scheduledTransaction;
	if (fila?.status === "paid") {
		const pago = fila.cajaMovimientos[0];
		return {
			texto: pago ? `Pagado el ${formatFecha(pago.fecha)} desde ${pago.caja.nombre}` : "Pagado",
			tono: "pagado",
		};
	}
	if (fila) return { texto: "Pendiente de aprobación en Contabilidad", tono: "pendiente" };

	const caja = cajaDelGastoViejo(gasto);
	if (!caja && !gasto.medioPago) return { texto: PAGADO_POR_LABEL.ESTUDIO, tono: "caja" };
	const medio = gasto.medioPago === "TRANSFERENCIA" ? "Transferencia" : "Efectivo";
	return { texto: caja ? `${medio} · ${caja}` : medio, tono: "caja" };
}

interface GastosViewProps {
	caseId: string;
	files?: CasesFiles[];
	customerName?: string;
}

/**
 * Gastos de la causa (relevamiento 11). Cada gasto es de un expediente y dice
 * quién lo paga. Cargarlo no descuenta de ninguna caja: si lo paga el estudio
 * queda pendiente en Gastos e Ingresos con su fecha de pago, y Contabilidad lo
 * aprueba pagándolo desde la caja que corresponda; si lo adelantó el abogado
 * externo, queda a reintegrarle. Todos se suman en "Liquidar honorarios".
 */
export const GastosView = ({ caseId, files = [], customerName }: GastosViewProps) => {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const { confirm, ConfirmationDialog } = useConfirm();
	const [expenses, setExpenses] = useState<CaseExpense[]>([]);
	const [loading, setLoading] = useState(true);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
	const [form, setForm] = useState(EMPTY_FORM);

	const totalExpenses = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);

	const fetchExpenses = useCallback(async () => {
		try {
			const res = await fetch(CASE_EXPENSES_ENDPOINT(Number(caseId)), {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Error al cargar gastos");
			const data = await res.json();
			setExpenses(data.expenses || []);
		} catch (error) {
			console.error("Error fetching expenses:", error);
		} finally {
			setLoading(false);
		}
	}, [caseId, token]);

	useEffect(() => {
		if (token) fetchExpenses();
		else setLoading(false);
	}, [fetchExpenses, token]);

	const handleOpenNew = () => {
		setForm({ ...EMPTY_FORM, date: hoyISO() });
		setEditingExpenseId(null);
		setIsModalOpen(true);
	};

	const handleEdit = (expense: CaseExpense) => {
		setEditingExpenseId(expense.id);
		setForm({
			fileId: expense.fileId ?? null,
			description: expense.description || "",
			amount: String(expense.amount),
			date: expense.date ? expense.date.slice(0, 10) : "",
			category: expense.category || "",
			pagadoPor: expense.pagadoPor ?? null,
		});
		setIsModalOpen(true);
	};

	const editando =
		editingExpenseId !== null ? expenses.find((e) => e.id === editingExpenseId) : undefined;
	// Ya lo pagó Contabilidad: el monto, la fecha y quién lo paga quedan fijos
	// hasta que se anule el pago en la Caja.
	const bloqueado = editando ? estaPago(editando) : false;
	const cajaVieja = editando ? cajaDelGastoViejo(editando) : null;

	const handleSave = async () => {
		const amount = Number(form.amount.replace(",", "."));
		if (!form.fileId) {
			toast.error("Seleccioná el expediente del gasto");
			return;
		}
		if (!(amount > 0)) {
			toast.error("El monto es obligatorio y debe ser mayor a 0");
			return;
		}
		// Un gasto cargado antes (sin "quién paga") se puede editar sin elegirlo:
		// así no pasa a Gastos e Ingresos algo que quizás ya se registró.
		const gastoViejo = editando !== undefined && !editando.pagadoPor;
		if (!form.pagadoPor && !gastoViejo) {
			toast.error("Indicá quién paga el gasto");
			return;
		}
		if (form.pagadoPor === "ESTUDIO" && !form.date) {
			toast.error("Indicá la fecha en que se va a pagar");
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
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					fileId: form.fileId,
					description: form.description || null,
					amount,
					date: form.date || null,
					category: form.category || null,
					pagadoPor: form.pagadoPor,
					// El backend nuevo toma el usuario del token; el anterior lo exige acá.
					userId: session?.user?.id ? Number(session.user.id) : null,
				}),
			});
			if (!res.ok) {
				throw new Error(
					await apiErrorMessage(
						res,
						isEditing ? "Error al actualizar el gasto" : "Error al crear el gasto",
					),
				);
			}

			toast.success(
				isEditing
					? "Gasto actualizado"
					: form.pagadoPor === "ESTUDIO"
						? "Gasto enviado a Contabilidad para su aprobación"
						: "Gasto registrado",
			);
			setIsModalOpen(false);
			setEditingExpenseId(null);
			await fetchExpenses();
		} catch (error) {
			console.error("Error saving expense:", error);
			toast.error(error instanceof Error ? error.message : "Error al guardar el gasto");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async (expense: CaseExpense) => {
		if (estaPago(expense)) {
			toast.error("El gasto ya está pago: anulá el pago en la Caja antes de eliminarlo");
			return;
		}
		const conCaja = (expense.cajaMovimientos?.length ?? 0) > 0;
		if (
			!(await confirm({
				description: expense.scheduledTransaction
					? "¿Eliminar este gasto? También se quita de Gastos e Ingresos, donde está pendiente de pago."
					: conCaja
						? "¿Eliminar este gasto? Sus movimientos en la Caja quedan anulados."
						: "¿Estás seguro de eliminar este gasto?",
				confirmLabel: "Eliminar",
			}))
		)
			return;

		try {
			const res = await fetch(CASE_EXPENSE_BY_ID_ENDPOINT(Number(caseId), expense.id), {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al eliminar el gasto"));
			toast.success("Gasto eliminado");
			await fetchExpenses();
		} catch (error) {
			console.error("Error deleting expense:", error);
			toast.error(error instanceof Error ? error.message : "Error al eliminar el gasto");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const inputClass =
		"w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary";
	const labelClass = "flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5";
	const opcionClass = (activa: boolean) =>
		cn(
			"flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors",
			activa
				? "border-primary bg-primary/10 text-primary font-medium"
				: "border-border bg-card text-muted-foreground hover:bg-muted",
		);

	return (
		<>
			<div className="rounded-xl border border-border bg-card shadow-sm">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-border">
					<div className="flex items-center gap-2">
						<DollarSign className="h-5 w-5 text-muted-foreground" />
						<h3 className="text-md font-semibold text-foreground">Gastos</h3>
						{expenses.length > 0 && (
							<span className="text-xs text-muted-foreground">({expenses.length} gastos)</span>
						)}
						{expenses.length > 0 && (
							<div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md bg-primary/5 border border-primary/20">
								<TrendingUp className="h-3.5 w-3.5 text-primary" />
								<span className="text-xs font-semibold text-primary">
									Total: ${totalExpenses.toLocaleString("es-AR")}
								</span>
							</div>
						)}
					</div>
					<button
						type="button"
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
						<p className="text-sm font-medium text-foreground mb-1">No hay gastos registrados</p>
						<p className="text-xs text-muted-foreground mb-3 text-center">
							Gastos y cédulas que paga el estudio o adelantó el abogado externo. Los del estudio
							pasan a Contabilidad, que los aprueba y los paga. Lo que paga el cliente directamente
							no se carga.
						</p>
						<button
							type="button"
							onClick={handleOpenNew}
							className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/85 transition-colors"
						>
							<Plus className="h-4 w-4" />
							Nuevo gasto
						</button>
					</div>
				) : (
					<div className="p-4 space-y-3">
						{expenses.map((gasto) => {
							const estado = estadoDelGasto(gasto);
							const pendiente = estado?.tono === "pendiente";
							const EstadoIcon =
								estado?.tono === "pendiente"
									? Clock
									: estado?.tono === "pagado"
										? CheckCircle2
										: Wallet;
							return (
								<div key={gasto.id} className="rounded-lg border p-5 bg-card border-border">
									<div className="flex items-start justify-between gap-4">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 shrink-0">
												<DollarSign className="h-5 w-5 text-green-500" />
											</div>
											<div className="min-w-0 flex-1">
												<h4 className="text-sm font-semibold text-foreground">
													{gasto.description || gastoCategoriaLabel(gasto.category) || "Sin descripción"}
												</h4>
												<div className="mt-1 flex flex-wrap gap-1.5">
													{gasto.category && (
														<span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border bg-muted text-foreground border-border">
															{gastoCategoriaLabel(gasto.category)}
														</span>
													)}
													{estado && (
														<span
															className={cn(
																"inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
																TONO_CLASS[estado.tono],
															)}
														>
															<EstadoIcon className="h-3 w-3" />
															{estado.texto}
														</span>
													)}
												</div>
												<div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
													{gasto.date && (
														<>
															<span>
																{pendiente ? "Se paga el " : ""}
																{formatFecha(gasto.date)}
															</span>
															<span>•</span>
														</>
													)}
													{gasto.file && (
														<>
															<span className="flex items-center gap-1">
																<FileText className="h-3 w-3 text-blue-400" />
																{getExpedienteLabel(gasto.file, customerName)}
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
													type="button"
													onClick={() => handleEdit(gasto)}
													title="Editar gasto"
													className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground transition-colors"
												>
													<Pencil className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => handleDelete(gasto)}
													title="Eliminar gasto"
													className="p-2 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
										</div>
									</div>
								</div>
							);
						})}

						<div className="rounded-lg border-2 p-5 bg-primary/5 border-primary/20">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold text-primary">Total acumulado</span>
								<span className="text-lg font-bold text-primary">
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
					<DialogHeader className="flex flex-row items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
							<DollarSign className="h-5 w-5 text-primary" />
						</div>
						<div>
							<DialogTitle className="text-lg font-bold text-foreground">
								{editingExpenseId ? "Editar gasto" : "Nuevo gasto"}
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Si lo pagó el cliente directamente, no se carga.
							</DialogDescription>
						</div>
					</DialogHeader>

					<div className="space-y-4 overflow-y-auto flex-1 pr-1">
						{bloqueado && (
							<p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
								Contabilidad ya pagó este gasto. Para cambiar el monto, la fecha o quién lo paga hay
								que anular antes el pago en la Caja.
							</p>
						)}
						<div>
							<label className={labelClass}>
								<FileText className="h-3.5 w-3.5 text-muted-foreground" />
								Expediente <span className="text-red-500">*</span>
							</label>
							<ExpedienteSelect
								files={files}
								value={form.fileId}
								onChange={(fileId) => setForm((f) => ({ ...f, fileId }))}
								customerName={customerName}
							/>
						</div>

						<div>
							<label className={labelClass}>
								<FileText className="h-3.5 w-3.5 text-muted-foreground" />
								Descripción
							</label>
							<input
								type="text"
								className={inputClass}
								placeholder="Ej: Cédula a la ART, tasa de justicia…"
								value={form.description}
								onChange={(e) => setForm({ ...form, description: e.target.value })}
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className={labelClass}>
									<DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
									Monto <span className="text-red-500">*</span>
								</label>
								<input
									inputMode="decimal"
									className={cn(inputClass, "disabled:opacity-60")}
									placeholder="0,00"
									value={form.amount}
									disabled={bloqueado}
									onChange={(e) =>
										setForm({ ...form, amount: e.target.value.replace(/[^\d.,]/g, "") })
									}
								/>
							</div>
							<div>
								<label className={labelClass}>
									<Calendar className="h-3.5 w-3.5 text-muted-foreground" />
									Fecha de pago
									{form.pagadoPor === "ESTUDIO" && <span className="text-red-500">*</span>}
								</label>
								<input
									type="date"
									className={cn(inputClass, "disabled:opacity-60")}
									value={form.date}
									disabled={bloqueado}
									onChange={(e) => setForm({ ...form, date: e.target.value })}
								/>
							</div>
						</div>

						<div>
							<label className={labelClass}>
								<Tag className="h-3.5 w-3.5 text-muted-foreground" />
								Categoría
							</label>
							<Select
								value={form.category || SIN_CATEGORIA}
								onValueChange={(v) => setForm({ ...form, category: v === SIN_CATEGORIA ? "" : v })}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SIN_CATEGORIA}>Sin categoría</SelectItem>
									{GASTO_CATEGORIAS.map((c) => (
										<SelectItem key={c.value} value={c.value}>
											{c.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="border-t border-border pt-4 space-y-3">
							<div>
								<label className={labelClass}>
									<Wallet className="h-3.5 w-3.5 text-muted-foreground" />
									¿Quién lo paga? <span className="text-red-500">*</span>
								</label>
								<div className="flex gap-2">
									<button
										type="button"
										disabled={bloqueado}
										className={cn(opcionClass(form.pagadoPor === "ESTUDIO"), "disabled:opacity-60")}
										onClick={() => setForm({ ...form, pagadoPor: "ESTUDIO" })}
									>
										<Landmark className="h-4 w-4" />
										{PAGADO_POR_LABEL.ESTUDIO}
									</button>
									<button
										type="button"
										disabled={bloqueado}
										className={cn(
											opcionClass(form.pagadoPor === "ABOGADO_EXTERNO"),
											"disabled:opacity-60",
										)}
										onClick={() => setForm({ ...form, pagadoPor: "ABOGADO_EXTERNO" })}
									>
										<UserRound className="h-4 w-4" />
										Abogado externo
									</button>
								</div>
								{!form.pagadoPor && editingExpenseId !== null && (
									<p className="mt-1.5 text-xs text-muted-foreground">
										Gasto cargado antes de registrar quién paga: si no lo elegís, no pasa a
										Contabilidad.
									</p>
								)}
								{form.pagadoPor === "ESTUDIO" &&
									!bloqueado &&
									(cajaVieja ? (
										<p className="mt-1.5 text-xs text-muted-foreground">
											Este gasto ya salió de {cajaVieja} cuando se cargó: si corregís el monto o la
											fecha, se corrige ese movimiento.
										</p>
									) : (
										<p className="mt-1.5 text-xs text-muted-foreground">
											No descuenta de ninguna caja: queda pendiente en Gastos e Ingresos con esa
											fecha de pago, y Contabilidad lo aprueba y lo paga desde la caja que
											corresponda.
										</p>
									))}
								{form.pagadoPor === "ABOGADO_EXTERNO" && (
									<p className="mt-1.5 text-xs text-muted-foreground">
										Queda a reintegrarle: no sale plata de ninguna caja y se suma a lo que se le
										cobra al cliente.
									</p>
								)}
							</div>
						</div>
					</div>

					<DialogFooter className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
						<button
							type="button"
							onClick={() => setIsModalOpen(false)}
							disabled={isSubmitting}
							className="px-4 py-2.5 text-sm font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
						>
							Cancelar
						</button>
						<button
							type="button"
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
