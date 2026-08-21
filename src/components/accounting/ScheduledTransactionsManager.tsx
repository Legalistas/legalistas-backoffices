"use client";

import {
	AlertCircle,
	ArrowDownCircle,
	ArrowUpCircle,
	Check,
	Link2,
	Loader2,
	MoreHorizontal,
	Pencil,
	Plus,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import NextLink from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Autocomplete } from "@/components/shared/Autocomplete";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	SCHEDULED_TX_BY_ID_ENDPOINT,
	SCHEDULED_TX_CANCEL_ENDPOINT,
	SCHEDULED_TX_ENDPOINT,
	SCHEDULED_TX_MARK_PAID_ENDPOINT,
	SCHEDULED_TX_MARK_PENDING_ENDPOINT,
	SCHEDULED_TX_SUMMARY_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	ScheduledFormPayload,
	ScheduledStatus,
	ScheduledSummary,
	ScheduledTransaction,
	ScheduledType,
} from "@/types/scheduled-transaction";
import type { User } from "@/types/users";
import ScheduledTransactionDialog from "./ScheduledTransactionDialog";

const formatCurrency = (n: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 2,
	}).format(n);

const formatDate = (iso: string) => {
	const [y, m, d] = iso.slice(0, 10).split("-");
	return `${d}/${m}/${y}`;
};

const STATUS_LABEL: Record<ScheduledStatus, string> = {
	pending: "Pendiente",
	paid: "Pagado",
	cancelled: "Cancelado",
};

interface MonthFilter {
	from: string;
	to: string;
	label: string;
}

const buildMonthOptions = (): MonthFilter[] => {
	const opts: MonthFilter[] = [];
	const now = new Date();
	for (let i = -1; i <= 6; i++) {
		const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
		const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, "0");
		opts.push({
			from: `${yyyy}-${mm}-01`,
			to: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`,
			label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
		});
	}
	return opts;
};

export default function ScheduledTransactionsManager() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const monthOptions = useMemo(() => buildMonthOptions(), []);
	const [monthIdx, setMonthIdx] = useState(1); // mes actual
	const [showAll, setShowAll] = useState(false);
	const [statusFilter, setStatusFilter] = useState<ScheduledStatus | "all">(
		"pending",
	);

	const [loading, setLoading] = useState(true);
	const [items, setItems] = useState<ScheduledTransaction[]>([]);
	const [summary, setSummary] = useState<ScheduledSummary | null>(null);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogType, setDialogType] = useState<ScheduledType>("income");
	const [editing, setEditing] = useState<ScheduledTransaction | null>(null);
	const [actingId, setActingId] = useState<number | null>(null);

	// "A Pagar" → marcar como pagado pide quién paga, y esa Caja se descuenta.
	const [apiUsers, setApiUsers] = useState<User[]>([]);
	const [payingItem, setPayingItem] = useState<ScheduledTransaction | null>(
		null,
	);
	const [payUserId, setPayUserId] = useState<number | null>(null);

	useEffect(() => {
		if (!token) return;
		(async () => {
			try {
				const res = await fetch(`${USERS_ENDPOINT}?limit=1000000`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) return;
				const data = await res.json();
				setApiUsers(data.data || []);
			} catch (err) {
				console.error("Error fetching users:", err);
			}
		})();
	}, [token]);

	const fetchData = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (statusFilter !== "all") params.set("status", statusFilter);
			if (!showAll) {
				const m = monthOptions[monthIdx];
				if (m) {
					params.set("from", m.from);
					params.set("to", m.to);
				}
			}

			const [listRes, summaryRes] = await Promise.all([
				fetch(`${SCHEDULED_TX_ENDPOINT}?${params.toString()}`, {
					headers: { Authorization: `Bearer ${token}` },
				}),
				fetch(SCHEDULED_TX_SUMMARY_ENDPOINT, {
					headers: { Authorization: `Bearer ${token}` },
				}),
			]);

			if (!listRes.ok) throw new Error();
			const listJson = await listRes.json();
			const data = (listJson.data ?? []) as ScheduledTransaction[];
			data.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
			setItems(data);

			if (summaryRes.ok) {
				const sJson = await summaryRes.json();
				setSummary(sJson.data as ScheduledSummary);
			}
		} catch {
			toast.error("Error al cargar el gestor contable");
		} finally {
			setLoading(false);
		}
	}, [token, statusFilter, showAll, monthIdx, monthOptions]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const incomes = useMemo(
		() => items.filter((i) => i.type === "income"),
		[items],
	);
	const expenses = useMemo(
		() => items.filter((i) => i.type === "expense"),
		[items],
	);

	const incomeTotal = useMemo(
		() => incomes.reduce((acc, x) => acc + Number(x.amount || 0), 0),
		[incomes],
	);
	const expenseTotal = useMemo(
		() => expenses.reduce((acc, x) => acc + Number(x.amount || 0), 0),
		[expenses],
	);

	const openCreate = (type: ScheduledType) => {
		setDialogType(type);
		setEditing(null);
		setDialogOpen(true);
	};

	const openEdit = (item: ScheduledTransaction) => {
		setDialogType(item.type);
		setEditing(item);
		setDialogOpen(true);
	};

	const handleSubmit = async (payload: ScheduledFormPayload) => {
		if (!token) return;
		try {
			const res = await fetch(
				editing ? SCHEDULED_TX_BY_ID_ENDPOINT(editing.id) : SCHEDULED_TX_ENDPOINT,
				{
					method: editing ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(payload),
				},
			);
			if (!res.ok) throw new Error();
			toast.success(editing ? "Registro actualizado" : "Registro creado");
			fetchData();
		} catch {
			toast.error("Error al guardar");
			throw new Error();
		}
	};

	const handleAction = async (
		id: number,
		url: string,
		method: "PATCH" | "DELETE",
		successMsg: string,
		body?: Record<string, unknown>,
	) => {
		if (!token) return;
		setActingId(id);
		try {
			const res = await fetch(url, {
				method,
				headers: {
					Authorization: `Bearer ${token}`,
					...(body ? { "Content-Type": "application/json" } : {}),
				},
				...(body ? { body: JSON.stringify(body) } : {}),
			});
			const result = await res.json().catch(() => null);
			if (!res.ok) throw new Error(result?.message);
			toast.success(result?.message || successMsg);
			fetchData();
		} catch (err) {
			toast.error((err as Error).message || "Error al ejecutar la acción");
		} finally {
			setActingId(null);
		}
	};

	const handleDelete = (item: ScheduledTransaction) => {
		if (!confirm(`Eliminar "${item.concept}"?`)) return;
		handleAction(
			item.id,
			SCHEDULED_TX_BY_ID_ENDPOINT(item.id),
			"DELETE",
			"Registro eliminado",
		);
	};

	const handleConfirmPay = async () => {
		if (!payingItem || !payUserId) return;
		await handleAction(
			payingItem.id,
			SCHEDULED_TX_MARK_PAID_ENDPOINT(payingItem.id),
			"PATCH",
			"Marcado como pagado",
			{ userId: payUserId },
		);
		setPayingItem(null);
		setPayUserId(null);
	};

	return (
		<div className="flex flex-col gap-6">
			{/* Filtros */}
			<div className="flex flex-wrap items-center gap-2">
				<div className="flex rounded-lg border text-sm overflow-hidden">
					<button
						type="button"
						onClick={() => setShowAll(false)}
						className={`px-3 py-1.5 transition-colors ${!showAll ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
					>
						Por mes
					</button>
					<button
						type="button"
						onClick={() => setShowAll(true)}
						className={`px-3 py-1.5 transition-colors ${showAll ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"}`}
					>
						Todos
					</button>
				</div>
				{!showAll && (
					<select
						value={monthIdx}
						onChange={(e) => setMonthIdx(Number(e.target.value))}
						className="h-9 rounded-md border border-input bg-background px-3 text-sm capitalize"
					>
						{monthOptions.map((m, i) => (
							<option key={m.from} value={i} className="capitalize">
								{m.label}
							</option>
						))}
					</select>
				)}
				<select
					value={statusFilter}
					onChange={(e) =>
						setStatusFilter(e.target.value as ScheduledStatus | "all")
					}
					className="h-9 rounded-md border border-input bg-background px-3 text-sm"
				>
					<option value="all">Todos los estados</option>
					<option value="pending">Solo pendientes</option>
					<option value="paid">Solo pagados</option>
					<option value="cancelled">Solo cancelados</option>
				</select>

				<div className="ml-auto flex items-center gap-2">
					<Button onClick={() => openCreate("income")} size="sm" variant="outline">
						<Plus className="mr-1 h-4 w-4" /> Nuevo cobro
					</Button>
					<Button onClick={() => openCreate("expense")} size="sm" variant="outline">
						<Plus className="mr-1 h-4 w-4" /> Nuevo gasto
					</Button>
				</div>
			</div>

			{/* KPIs */}
			{summary && (
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<Card>
						<CardContent className="p-4 flex items-center gap-3">
							<div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
								<ArrowUpCircle className="size-5 text-emerald-600" />
							</div>
							<div className="min-w-0">
								<p className="text-xs text-muted-foreground">
									A cobrar pendiente · {summary.pending.income.count}
								</p>
								<p className="text-lg font-bold truncate text-emerald-700 dark:text-emerald-400">
									{formatCurrency(summary.pending.income.amount)}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardContent className="p-4 flex items-center gap-3">
							<div className="size-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
								<ArrowDownCircle className="size-5 text-red-600" />
							</div>
							<div className="min-w-0">
								<p className="text-xs text-muted-foreground">
									A pagar pendiente · {summary.pending.expense.count}
								</p>
								<p className="text-lg font-bold truncate text-red-700 dark:text-red-400">
									{formatCurrency(summary.pending.expense.amount)}
								</p>
							</div>
						</CardContent>
					</Card>
					<Card
						className={
							summary.overdueExpense.count > 0
								? "border-amber-300 bg-amber-50 dark:bg-amber-950/20"
								: undefined
						}
					>
						<CardContent className="p-4 flex items-center gap-3">
							<div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
								<AlertCircle className="size-5 text-amber-600" />
							</div>
							<div className="min-w-0">
								<p className="text-xs text-muted-foreground">
									Gastos vencidos · {summary.overdueExpense.count}
								</p>
								<p className="text-lg font-bold truncate text-amber-700 dark:text-amber-400">
									{formatCurrency(summary.overdueExpense.amount)}
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* A COBRAR */}
			<Card className="border-emerald-200 dark:border-emerald-900 overflow-hidden gap-0 py-0">
				<CardHeader className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-semibold flex items-center text-emerald-800 dark:text-emerald-300">
							<ArrowUpCircle className="size-5" />
							A COBRAR
						</CardTitle>
						<span className="inline-flex items-center rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
							{incomes.length}{" "}
							{incomes.length === 1 ? "registro" : "registros"}
						</span>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						type="income"
						loading={loading}
						items={incomes}
						actingId={actingId}
						onEdit={openEdit}
						onMarkPaid={(it) =>
							handleAction(
								it.id,
								SCHEDULED_TX_MARK_PAID_ENDPOINT(it.id),
								"PATCH",
								"Marcado como cobrado",
							)
						}
						onMarkPending={(it) =>
							handleAction(
								it.id,
								SCHEDULED_TX_MARK_PENDING_ENDPOINT(it.id),
								"PATCH",
								"Restaurado a pendiente",
							)
						}
						onCancel={(it) =>
							handleAction(
								it.id,
								SCHEDULED_TX_CANCEL_ENDPOINT(it.id),
								"PATCH",
								"Registro cancelado",
							)
						}
						onDelete={handleDelete}
					/>
					{incomes.length > 0 && (
						<div className="flex items-center justify-between border-t px-4 py-3 bg-emerald-50/50 dark:bg-emerald-950/20">
							<span className="text-sm font-medium text-muted-foreground">
								TOTAL ESTIMADO
							</span>
							<span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
								{formatCurrency(incomeTotal)}
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			{/* A PAGAR */}
			<Card className="border-red-200 dark:border-red-900 overflow-hidden gap-0 py-0">
				<CardHeader className="bg-red-50 dark:bg-red-950/30 px-4 py-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base font-semibold flex items-center text-red-800 dark:text-red-300">
							<ArrowDownCircle className="size-5" />
							A PAGAR
						</CardTitle>
						<span className="inline-flex items-center rounded-full bg-red-100/80 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
							{expenses.length}{" "}
							{expenses.length === 1 ? "registro" : "registros"}
						</span>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<DataTable
						type="expense"
						loading={loading}
						items={expenses}
						actingId={actingId}
						onEdit={openEdit}
						onMarkPaid={(it) => setPayingItem(it)}
						onMarkPending={(it) =>
							handleAction(
								it.id,
								SCHEDULED_TX_MARK_PENDING_ENDPOINT(it.id),
								"PATCH",
								"Restaurado a pendiente",
							)
						}
						onCancel={(it) =>
							handleAction(
								it.id,
								SCHEDULED_TX_CANCEL_ENDPOINT(it.id),
								"PATCH",
								"Registro cancelado",
							)
						}
						onDelete={handleDelete}
					/>
					{expenses.length > 0 && (
						<div className="flex items-center justify-between border-t px-4 py-3 bg-red-50/50 dark:bg-red-950/20">
							<span className="text-sm font-medium text-muted-foreground">
								TOTAL ESTIMADO
							</span>
							<span className="text-base font-bold text-red-700 dark:text-red-400 tabular-nums">
								-{formatCurrency(expenseTotal)}
							</span>
						</div>
					)}
				</CardContent>
			</Card>

			<ScheduledTransactionDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				type={dialogType}
				editing={editing}
				onSubmit={handleSubmit}
			/>

			{/* Marcar como pagado: quién paga, se descuenta de su Caja */}
			<Dialog
				open={!!payingItem}
				onOpenChange={(open) => {
					if (!open) {
						setPayingItem(null);
						setPayUserId(null);
					}
				}}
			>
				<DialogContent className="sm:max-w-96">
					<DialogHeader>
						<DialogTitle>Marcar como pagado</DialogTitle>
						<DialogDescription>
							Se va a registrar un egreso de{" "}
							{formatCurrency(Number(payingItem?.amount || 0))} en la Caja del
							usuario que elijas, como si fuera un movimiento más.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="pay-user">Quién paga</Label>
						<Autocomplete
							id="pay-user"
							value={payUserId}
							onSelect={setPayUserId}
							options={apiUsers}
							placeholder="Selecciona usuario"
						/>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setPayingItem(null);
								setPayUserId(null);
							}}
						>
							Cancelar
						</Button>
						<Button
							onClick={handleConfirmPay}
							disabled={!payUserId || actingId === payingItem?.id}
						>
							Confirmar pago
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

interface DataTableProps {
	type: ScheduledType;
	loading: boolean;
	items: ScheduledTransaction[];
	actingId: number | null;
	onEdit: (item: ScheduledTransaction) => void;
	onMarkPaid: (item: ScheduledTransaction) => void;
	onMarkPending: (item: ScheduledTransaction) => void;
	onCancel: (item: ScheduledTransaction) => void;
	onDelete: (item: ScheduledTransaction) => void;
}

function DataTable({
	type,
	loading,
	items,
	actingId,
	onEdit,
	onMarkPaid,
	onMarkPending,
	onCancel,
	onDelete,
}: DataTableProps) {
	const isIncome = type === "income";
	const conceptHeader = isIncome ? "COBRO" : "CONCEPTO";

	if (loading) {
		return (
			<div className="p-6 space-y-2">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
				Sin registros en este período
			</div>
		);
	}

	const dateColor = isIncome ? "text-emerald-600" : "text-red-600";

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-border/60 text-[11px] font-semibold tracking-wider text-muted-foreground">
						<th className="w-32 px-4 py-3 text-left">FECHA</th>
						<th className="px-4 py-3 text-left">{conceptHeader}</th>
						<th className="px-4 py-3 text-left">DETALLE</th>
						<th className="w-40 px-4 py-3 text-right">MONTO</th>
						<th className="w-28 px-4 py-3 text-center">ESTADO</th>
						<th className="w-12 px-2 py-3" />
					</tr>
				</thead>
				<tbody>
					{items.map((item, idx) => {
						const isCancelled = item.status === "cancelled";
						const isPaid = item.status === "paid";
						const isLast = idx === items.length - 1;
						return (
							<tr
								key={item.id}
								className={`${isLast ? "" : "border-b border-border/40"} transition-colors hover:bg-muted/30 ${isCancelled ? "opacity-50" : ""}`}
							>
								<td
									className={`px-4 py-3 align-middle font-medium ${dateColor} ${isPaid ? "line-through" : ""}`}
								>
									{formatDate(item.dueDate)}
								</td>
								<td
									className={`px-4 py-3 align-middle font-medium text-foreground ${isPaid ? "line-through" : ""}`}
								>
									{item.concept}
								</td>
								<td className="px-4 py-3 align-middle text-xs text-muted-foreground uppercase">
									{item.detail || "—"}
								</td>
								<td
									className={`px-4 py-3 align-middle text-right tabular-nums font-semibold text-foreground ${isPaid ? "line-through" : ""}`}
								>
									{formatCurrency(Number(item.amount || 0))}
								</td>
								<td className="px-4 py-3 align-middle text-center">
									<StatusBadge status={item.status} />
								</td>
								<td className="px-2 py-3 align-middle">
									{item.closingId ? (
										<NextLink
											href={`/admin/closing-manager/${item.closingId}/edit`}
											title="Viene de un cierre — gestionalo desde Gestor de Cierres"
											className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
										>
											<Link2 className="h-4 w-4" />
										</NextLink>
									) : (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8"
												disabled={actingId === item.id}
											>
												{actingId === item.id ? (
													<Loader2 className="h-4 w-4 animate-spin" />
												) : (
													<MoreHorizontal className="h-4 w-4" />
												)}
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{item.status === "pending" && (
												<DropdownMenuItem onClick={() => onMarkPaid(item)}>
													<Check className="mr-2 h-4 w-4 text-emerald-600" />
													Marcar como {isIncome ? "cobrado" : "pagado"}
												</DropdownMenuItem>
											)}
											{item.status !== "pending" && (
												<DropdownMenuItem onClick={() => onMarkPending(item)}>
													<RotateCcw className="mr-2 h-4 w-4" />
													Volver a pendiente
												</DropdownMenuItem>
											)}
											<DropdownMenuItem onClick={() => onEdit(item)}>
												<Pencil className="mr-2 h-4 w-4" />
												Editar
											</DropdownMenuItem>
											{item.status !== "cancelled" && (
												<DropdownMenuItem onClick={() => onCancel(item)}>
													<AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
													Cancelar
												</DropdownMenuItem>
											)}
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={() => onDelete(item)}
												className="text-destructive focus:text-destructive"
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Eliminar
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
									)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function StatusBadge({ status }: { status: ScheduledStatus }) {
	if (status === "paid") {
		return (
			<Badge
				variant="outline"
				className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
			>
				{STATUS_LABEL.paid}
			</Badge>
		);
	}
	if (status === "cancelled") {
		return (
			<Badge variant="outline" className="text-[10px]">
				{STATUS_LABEL.cancelled}
			</Badge>
		);
	}
	return (
		<Badge
			variant="outline"
			className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
		>
			{STATUS_LABEL.pending}
		</Badge>
	);
}
