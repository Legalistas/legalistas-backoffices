"use client";

import {
	ArrowDownCircle,
	ArrowUpCircle,
	Ban,
	CalendarClock,
	ChevronLeft,
	ChevronRight,
	FileDown,
	Loader2,
	Minus,
	MoreHorizontal,
	Pencil,
	Plus,
	RotateCcw,
	Scale,
	Search,
	SlidersHorizontal,
	Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { exportScheduledPdf } from "@/components/accounting/exportScheduledPdf";
import NewMovementDialog from "@/components/accounting/NewMovementDialog";
import PayFromCashDialog from "@/components/accounting/PayFromCashDialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	SCHEDULED_TX_BY_ID_ENDPOINT,
	SCHEDULED_TX_CANCEL_ENDPOINT,
	SCHEDULED_TX_ENDPOINT,
	SCHEDULED_TX_MARK_PAID_ENDPOINT,
	SCHEDULED_TX_MARK_PENDING_ENDPOINT,
	SCHEDULED_TX_SUMMARY_ENDPOINT,
} from "@/constant/api-endpoints";
import { CURRENCY_SYMBOL } from "@/constant/scheduled-categories";
import { cn } from "@/lib/utils";
import type {
	ScheduledStatus,
	ScheduledSummary,
	ScheduledTransaction,
	ScheduledType,
} from "@/types/scheduled-transaction";

// =============================================================================
// Gestor de Gastos e Ingresos — pantalla completa.
//
// Los datos salen de `/accounting/scheduled`, que devuelve los movimientos del
// período. El filtrado por texto, la pestaña y la paginación se resuelven acá:
// son decenas de filas, no miles, y así el cambio de pestaña es instantáneo.
// =============================================================================

type TabId = "todos" | "cobrar" | "pagar" | "vencidos";

const TABS: { id: TabId; label: string }[] = [
	{ id: "todos", label: "Todos" },
	{ id: "cobrar", label: "A cobrar" },
	{ id: "pagar", label: "A pagar" },
	{ id: "vencidos", label: "Vencidos" },
];

const STATUS_LABEL: Record<ScheduledStatus, string> = {
	pending: "Pendiente",
	paid: "Pagado",
	cancelled: "Cancelado",
};

const STATUS_STYLE: Record<ScheduledStatus, string> = {
	pending: "bg-amber-50 text-amber-700 ring-amber-200",
	paid: "bg-green-50 text-green-700 ring-green-200",
	cancelled: "bg-gray-100 text-gray-600 ring-gray-200",
};

const PAYMENT_LABEL: Record<string, string> = {
	cash: "Efectivo",
	transfer: "Transferencia",
	debit: "Débito automático",
};

const PAGE_SIZES = [10, 25, 50];

const money = (n: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 2,
	}).format(n);

const amountFmt = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2 });

/** Monto en su propia moneda (ARS o USD) — distinto de `money()`, que siempre
 * formatea en pesos (usada para los totales del resumen, ya convertidos). */
const formatByCurrency = (tx: ScheduledTransaction) =>
	`${CURRENCY_SYMBOL[tx.currency]} ${amountFmt.format(Number(tx.amount))}`;

/** Próximos 3 meses + últimos 12, del más futuro al más viejo. */
function buildMonths() {
	const today = new Date();
	return Array.from({ length: 15 }, (_, i) => {
		const d = new Date(today.getFullYear(), today.getMonth() + 3 - i, 1);
		const from = new Date(d.getFullYear(), d.getMonth(), 1);
		const to = new Date(d.getFullYear(), d.getMonth() + 1, 0);
		const iso = (x: Date) =>
			`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
				x.getDate(),
			).padStart(2, "0")}`;
		return {
			key: `${d.getFullYear()}-${d.getMonth()}`,
			label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
			from: iso(from),
			to: iso(to),
		};
	});
}

export default function CollectionsManager() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const months = useMemo(buildMonths, []);
	const currentMonthKey = useMemo(() => {
		const now = new Date();
		return `${now.getFullYear()}-${now.getMonth()}`;
	}, []);
	const [monthKey, setMonthKey] = useState(currentMonthKey);
	const [statusFilter, setStatusFilter] = useState<ScheduledStatus | "all">(
		"all",
	);
	const [onlyPending, setOnlyPending] = useState(false);
	const [search, setSearch] = useState("");
	const [tab, setTab] = useState<TabId>("todos");
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [dateSort, setDateSort] = useState<"asc" | "desc">("desc");

	const [items, setItems] = useState<ScheduledTransaction[]>([]);
	const [summary, setSummary] = useState<ScheduledSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [actingId, setActingId] = useState<number | null>(null);
	const [newType, setNewType] = useState<ScheduledType | null>(null);
	const [editing, setEditing] = useState<ScheduledTransaction | null>(null);
	// Gasto esperando que se elija de qué caja sale.
	const [paying, setPaying] = useState<ScheduledTransaction | null>(null);
	const [exportingPdf, setExportingPdf] = useState(false);

	const month = months.find((m) => m.key === monthKey) ?? months[0];

	const fetchData = useCallback(async () => {
		if (!token || !month) return;
		setLoading(true);
		try {
			const params = new URLSearchParams({ from: month.from, to: month.to });
			if (statusFilter !== "all") params.set("status", statusFilter);

			const [listRes, summaryRes] = await Promise.all([
				fetch(`${SCHEDULED_TX_ENDPOINT}?${params}`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(SCHEDULED_TX_SUMMARY_ENDPOINT, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);
			if (!listRes.ok) throw new Error("No se pudieron cargar los movimientos");

			const listJson = await listRes.json();
			setItems((listJson.data ?? []) as ScheduledTransaction[]);

			if (summaryRes.ok) setSummary((await summaryRes.json()).data);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [token, month, statusFilter]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Cualquier cambio de filtro vuelve a la primera página: si no, se queda en
	// una página que ya no existe y la tabla aparece vacía.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset al filtrar
	useEffect(() => setPage(1), [tab, search, onlyPending, monthKey, statusFilter]);

	const isOverdue = useCallback((tx: ScheduledTransaction) => {
		const today = new Date().toLocaleDateString("en-CA");
		return tx.status === "pending" && tx.dueDate.slice(0, 10) < today;
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		return items
			.filter((tx) => {
				if (onlyPending && tx.status !== "pending") return false;
				if (tab === "cobrar" && tx.type !== "income") return false;
				if (tab === "pagar" && tx.type !== "expense") return false;
				if (tab === "vencidos" && !isOverdue(tx)) return false;
				if (!q) return true;
				return (
					tx.concept.toLowerCase().includes(q) ||
					(tx.detail ?? "").toLowerCase().includes(q)
				);
			})
			.sort((a, b) =>
				dateSort === "asc"
					? a.dueDate.localeCompare(b.dueDate)
					: b.dueDate.localeCompare(a.dueDate),
			);
	}, [items, search, onlyPending, tab, isOverdue, dateSort]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

	const runAction = async (
		id: number,
		url: string,
		method: "PATCH" | "DELETE",
		okMsg: string,
	) => {
		if (!token) return;
		setActingId(id);
		try {
			const res = await fetch(url, {
				method,
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				throw new Error(e.message || "No se pudo completar la acción");
			}
			toast.success(okMsg);
			await fetchData();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setActingId(null);
		}
	};

	/**
	 * Un cobro se marca de un click. Un gasto sale de la Caja de alguien, así
	 * que primero hay que elegir de quién: eso lo resuelve el diálogo.
	 */
	const markPaid = (tx: ScheduledTransaction) => {
		if (tx.type === "expense") {
			setPaying(tx);
			return;
		}
		runAction(
			tx.id,
			SCHEDULED_TX_MARK_PAID_ENDPOINT(tx.id),
			"PATCH",
			"Cobro registrado",
		);
	};

	// El informe trae todo el historial, no solo el período filtrado en pantalla.
	const handleExportPdf = async () => {
		if (!token) return;
		setExportingPdf(true);
		try {
			const res = await fetch(SCHEDULED_TX_ENDPOINT, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("No se pudo traer el historial completo");
			const json = await res.json();
			await exportScheduledPdf((json.data ?? []) as ScheduledTransaction[]);
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setExportingPdf(false);
		}
	};

	const porCobrar = summary?.pending.income ?? { count: 0, amount: 0 };
	const porPagar = summary?.pending.expense ?? { count: 0, amount: 0 };
	const vencido = summary?.overdueExpense ?? { count: 0, amount: 0 };
	const balance = porCobrar.amount - porPagar.amount;

	return (
		<div className="space-y-5">
			{/* ── Encabezado ─────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">
						Gestor de Gastos e Ingresos
					</h1>
					<p className="text-sm text-muted-foreground">
						Controlá cobros, pagos y vencimientos
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
						{exportingPdf ? (
							<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
						) : (
							<FileDown className="mr-1.5 h-4 w-4" />
						)}
						Exportar PDF
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							setEditing(null);
							setNewType("income");
						}}
						className="border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300"
					>
						<Plus className="mr-1.5 h-4 w-4" />
						Nuevo cobro
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							setEditing(null);
							setNewType("expense");
						}}
						className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
					>
						<Plus className="mr-1.5 h-4 w-4" />
						Nuevo gasto
					</Button>
				</div>
			</div>

			{/* ── Filtros ────────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
				<Select value={monthKey} onValueChange={setMonthKey}>
					<SelectTrigger className="h-10 w-52">
						<CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
						<SelectValue placeholder="Período" />
					</SelectTrigger>
					<SelectContent>
						{months.map((m) => (
							<SelectItem key={m.key} value={m.key} className="capitalize">
								{m.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={statusFilter}
					onValueChange={(v) => setStatusFilter(v as ScheduledStatus | "all")}
				>
					<SelectTrigger className="h-10 w-40">
						<SelectValue placeholder="Estado" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos</SelectItem>
						<SelectItem value="pending">Pendientes</SelectItem>
						<SelectItem value="paid">Pagados</SelectItem>
						<SelectItem value="cancelled">Cancelados</SelectItem>
					</SelectContent>
				</Select>

				<div className="relative min-w-64 flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Buscar cliente, concepto o detalle..."
						className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
					/>
				</div>

				<Button
					variant={onlyPending ? "default" : "outline"}
					onClick={() => setOnlyPending((v) => !v)}
					className="h-10"
				>
					<SlidersHorizontal className="mr-1.5 h-4 w-4" />
					Solo pendientes
				</Button>
			</div>

			{/* ── Tarjetas ───────────────────────────────────────────────── */}
			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<KpiCard
					label="Por cobrar"
					amount={porCobrar.amount}
					hint={`${porCobrar.count} movimientos`}
					tone="teal"
					icon={<ArrowUpCircle className="h-5 w-5" />}
				/>
				<KpiCard
					label="Por pagar"
					amount={porPagar.amount}
					hint={`${porPagar.count} movimientos`}
					tone="red"
					icon={<ArrowDownCircle className="h-5 w-5" />}
				/>
				<KpiCard
					label="Balance proyectado"
					amount={balance}
					hint="Ingresos - Gastos"
					tone="emerald"
					icon={<Scale className="h-5 w-5" />}
				/>
				<KpiCard
					label="Vencido"
					amount={vencido.amount}
					hint={vencido.count === 0 ? "Todo al día" : `${vencido.count} vencidos`}
					tone="amber"
					icon={<CalendarClock className="h-5 w-5" />}
				/>
			</div>

			{/* ── Pestañas + tabla ───────────────────────────────────────── */}
			<div className="rounded-xl border border-border bg-card">
				<div className="flex gap-1 border-b border-border px-3">
					{TABS.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => setTab(t.id)}
							className={cn(
								"border-b-2 px-3 py-3 text-sm font-medium transition-colors",
								tab === t.id
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{t.label}
						</button>
					))}
				</div>

				{loading ? (
					<div className="flex justify-center py-16">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : pageItems.length === 0 ? (
					<p className="py-16 text-center text-sm text-muted-foreground">
						No hay movimientos para este filtro.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border text-xs text-muted-foreground">
									<th className="w-10" />
									<th className="px-3 py-3 text-left font-medium">
										<button
											type="button"
											onClick={() =>
												setDateSort((s) => (s === "asc" ? "desc" : "asc"))
											}
											className="inline-flex items-center gap-1 hover:text-foreground"
										>
											Fecha {dateSort === "asc" ? "↑" : "↓"}
										</button>
									</th>
									<th className="px-3 py-3 text-left font-medium">
										Cliente / Concepto
									</th>
									<th className="px-3 py-3 text-left font-medium">Categoría</th>
									<th className="px-3 py-3 text-left font-medium">Detalle</th>
									<th className="px-3 py-3 text-right font-medium">Monto</th>
									<th className="px-3 py-3 text-left font-medium">Estado</th>
									<th className="px-3 py-3 text-left font-medium">Cargado por</th>
									<th className="px-3 py-3 text-center font-medium">Acción</th>
								</tr>
							</thead>
							<tbody>
								{pageItems.map((tx) => {
									const income = tx.type === "income";
									return (
										<tr
											key={tx.id}
											className="border-b border-border/60 last:border-0 hover:bg-muted/40"
										>
											<td className="pl-4">
												<span
													className={cn(
														"flex h-6 w-6 items-center justify-center rounded-full",
														income
															? "bg-teal-50 text-teal-600"
															: "bg-red-50 text-red-500",
													)}
												>
													{income ? (
														<ArrowUpCircle className="h-3.5 w-3.5" />
													) : (
														<Minus className="h-3.5 w-3.5" />
													)}
												</span>
											</td>
											<td className="whitespace-nowrap px-3 py-3">
												{new Date(tx.dueDate).toLocaleDateString("es-AR")}
											</td>
											<td className="px-3 py-3 font-medium text-foreground">
												{tx.concept}
											</td>
											<td className="px-3 py-3 text-muted-foreground">
												{tx.category}
												{tx.subcategory && (
													<span className="block text-xs">{tx.subcategory}</span>
												)}
											</td>
											<td className="px-3 py-3 text-muted-foreground">
												{tx.detail || "–"}
											</td>
											<td className="whitespace-nowrap px-3 py-3 text-right font-medium">
												{formatByCurrency(tx)}
												{tx.currency === "USD" && (
													<span className="block text-xs font-normal text-muted-foreground">
														≈ {money(Number(tx.amount) * Number(tx.exchangeRate ?? 0))}
													</span>
												)}
												{tx.paymentMethod !== "cash" && (
													<span className="block text-xs font-normal text-muted-foreground">
														{PAYMENT_LABEL[tx.paymentMethod]}
													</span>
												)}
												{tx.offBooksAmount != null && (
													<span className="block text-xs font-normal text-amber-600">
														En negro: {CURRENCY_SYMBOL[tx.currency]}{" "}
														{amountFmt.format(Number(tx.offBooksAmount))}
													</span>
												)}
											</td>
											<td className="px-3 py-3">
												<span
													className={cn(
														"rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
														isOverdue(tx)
															? "bg-red-50 text-red-700 ring-red-200"
															: STATUS_STYLE[tx.status],
													)}
												>
													{isOverdue(tx) ? "Vencido" : STATUS_LABEL[tx.status]}
												</span>
											</td>
											<td className="px-3 py-3 text-muted-foreground">
												{tx.createdBy?.name ?? "–"}
											</td>
											<td className="px-3 py-3 text-center">
												{tx.status === "pending" ? (
													<Button
														size="sm"
														variant="outline"
														disabled={actingId === tx.id}
														onClick={() => markPaid(tx)}
														className={cn(
															"h-8",
															income
																? "border-teal-200 text-teal-700 hover:bg-teal-50"
																: "border-red-200 text-red-600 hover:bg-red-50",
														)}
													>
														{actingId === tx.id && (
															<Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
														)}
														{income ? "Cobrar" : "Pagar"}
													</Button>
												) : (
													<span className="text-xs text-muted-foreground">—</span>
												)}

												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															size="sm"
															variant="ghost"
															className="ml-1 h-8 w-8 p-0"
															disabled={actingId === tx.id}
														>
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end" className="w-48">
														{/* Los movimientos que vienen de un cierre no se
														    editan ni se borran acá: sus datos son del
														    cierre que los generó. */}
														{!tx.closingId && (
															<DropdownMenuItem
																onClick={() => {
																	setEditing(tx);
																	setNewType(tx.type);
																}}
															>
																<Pencil className="mr-2 h-4 w-4" />
																Editar
															</DropdownMenuItem>
														)}

														{tx.status !== "pending" && (
															<DropdownMenuItem
																onClick={() =>
																	runAction(
																		tx.id,
																		SCHEDULED_TX_MARK_PENDING_ENDPOINT(tx.id),
																		"PATCH",
																		"Marcado como pendiente",
																	)
																}
															>
																<RotateCcw className="mr-2 h-4 w-4" />
																Marcar pendiente
															</DropdownMenuItem>
														)}

														{tx.status === "pending" && (
															<DropdownMenuItem
																onClick={() =>
																	runAction(
																		tx.id,
																		SCHEDULED_TX_CANCEL_ENDPOINT(tx.id),
																		"PATCH",
																		"Movimiento cancelado",
																	)
																}
															>
																<Ban className="mr-2 h-4 w-4" />
																Cancelar
															</DropdownMenuItem>
														)}

														{!tx.closingId && (
															<DropdownMenuItem
																variant="destructive"
																onClick={() => {
																	if (
																		!window.confirm(
																			`¿Eliminar "${tx.concept}"? No se puede deshacer.`,
																		)
																	)
																		return;
																	runAction(
																		tx.id,
																		SCHEDULED_TX_BY_ID_ENDPOINT(tx.id),
																		"DELETE",
																		"Movimiento eliminado",
																	);
																}}
															>
																<Trash2 className="mr-2 h-4 w-4" />
																Eliminar
															</DropdownMenuItem>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{/* ── Paginación ─────────────────────────────────────────── */}
				{!loading && filtered.length > 0 && (
					<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
						<span className="text-muted-foreground">
							Mostrando {(page - 1) * pageSize + 1} a{" "}
							{Math.min(page * pageSize, filtered.length)} de {filtered.length}{" "}
							movimientos
						</span>
						<div className="flex items-center gap-2">
							<Button
								size="sm"
								variant="outline"
								disabled={page === 1}
								onClick={() => setPage((p) => p - 1)}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
								<Button
									key={n}
									size="sm"
									variant={n === page ? "default" : "outline"}
									onClick={() => setPage(n)}
									className="w-9"
								>
									{n}
								</Button>
							))}
							<Button
								size="sm"
								variant="outline"
								disabled={page === totalPages}
								onClick={() => setPage((p) => p + 1)}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>

							<Select
								value={String(pageSize)}
								onValueChange={(v) => {
									setPageSize(Number(v));
									setPage(1);
								}}
							>
								<SelectTrigger className="h-8 w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAGE_SIZES.map((n) => (
										<SelectItem key={n} value={String(n)}>
											{n} por página
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
				)}
			</div>

			<PayFromCashDialog
				item={paying}
				onClose={() => setPaying(null)}
				onPaid={() => {
					setPaying(null);
					fetchData();
				}}
			/>

			<NewMovementDialog
				type={newType}
				editing={editing}
				onClose={() => {
					setNewType(null);
					setEditing(null);
				}}
				onCreated={() => {
					setNewType(null);
					setEditing(null);
					fetchData();
				}}
			/>
		</div>
	);
}

// ── Tarjeta de resumen ──────────────────────────────────────────────────────

const TONES = {
	teal: "text-teal-600 bg-teal-50 dark:bg-teal-900/20",
	red: "text-red-500 bg-red-50 dark:bg-red-900/20",
	emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
	amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
} as const;

function KpiCard({
	label,
	amount,
	hint,
	tone,
	icon,
}: {
	label: string;
	amount: number;
	hint: string;
	tone: keyof typeof TONES;
	icon: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between rounded-xl border border-border bg-card p-4">
			<div className="min-w-0">
				<p className="text-xs text-muted-foreground">{label}</p>
				<p
					className={cn(
						"mt-1 truncate text-xl font-semibold",
						TONES[tone].split(" ")[0],
					)}
				>
					{money(amount)}
				</p>
				<p className="mt-1 text-xs text-muted-foreground">{hint}</p>
			</div>
			<span
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
					TONES[tone],
				)}
			>
				{icon}
			</span>
		</div>
	);
}
