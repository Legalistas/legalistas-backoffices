"use client";

import {
	AlertCircle,
	ArrowDownCircle,
	ArrowDownRight,
	ArrowRight,
	ArrowRightLeft,
	ArrowUpCircle,
	ArrowUpRight,
	Ban,
	Calendar,
	Check,
	Loader2,
	Palmtree,
	Receipt,
	TrendingUp,
	Users2,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	computeStats,
	type EmployeeWithEmployment,
	type LeaveSummary,
} from "@/components/reports/rrhh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	CASH_ENDPOINT,
	LEAVE_APPROVE_ENDPOINT,
	LEAVE_REJECT_ENDPOINT,
	LEAVES_BY_USER_ENDPOINT,
	SCHEDULED_TX_ENDPOINT,
	SCHEDULED_TX_SUMMARY_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import { MOVEMENTS } from "@/constant/cash";
import { Role } from "@/constant/user";
import type { Transaction } from "@/types/cash";
import type {
	ScheduledSummary,
	ScheduledTransaction,
} from "@/types/scheduled-transaction";
import DashboardGreetingHeader from "./DashboardGreetingHeader";

const formatCurrency = (n: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		maximumFractionDigits: 0,
	}).format(n);

const formatDay = (iso: string) => {
	const [y, m, d] = iso.slice(0, 10).split("-");
	return `${d}/${m}/${y}`;
};

const typeLabel: Record<string, string> = {
	VACATION: "Vacaciones",
	SICK: "Enfermedad",
	STUDY: "Estudio",
	MATERNITY: "Maternidad",
	PATERNITY: "Paternidad",
	UNPAID: "Sin goce",
	OTHER: "Otra",
};

const getSubtypeLabel = (type: string, subtype: string): string => {
	const movement = MOVEMENTS.find((m) => m.value === type);
	if (movement?.subMovements?.length) {
		const sm = movement.subMovements.find((s) => s.value === subtype);
		if (sm) return sm.label;
	}
	// Fallback al label del tipo (ej. "Transferencia") cuando no hay submovimiento.
	return movement?.label ?? subtype;
};

interface PendingLeave {
	id: number;
	userId: number;
	userName: string;
	type: string;
	startDate: string;
	endDate: string;
	daysRequested: number;
	reason: string | null;
}

interface ActiveLeave {
	id: number;
	userId: number;
	userName: string;
	type: string;
	startDate: string;
	endDate: string;
	daysRequested: number;
}

export default function AccountingDashboard() {
	const { data: session } = useSession();
	const [loading, setLoading] = useState(false);
	const [employees, setEmployees] = useState<EmployeeWithEmployment[]>([]);
	const [representativeIds, setRepresentativeIds] = useState<Set<number>>(
		new Set(),
	);
	const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
	const [activeLeaves, setActiveLeaves] = useState<ActiveLeave[]>([]);
	const [recentMovements, setRecentMovements] = useState<Transaction[]>([]);
	const [actingId, setActingId] = useState<number | null>(null);
	const [upcomingIncomes, setUpcomingIncomes] = useState<ScheduledTransaction[]>(
		[],
	);
	const [upcomingExpenses, setUpcomingExpenses] = useState<
		ScheduledTransaction[]
	>([]);
	const [scheduledSummary, setScheduledSummary] =
		useState<ScheduledSummary | null>(null);

	const token = session?.user?.accessToken;

	const fetchData = useCallback(async () => {
		if (!token) return;
		setLoading(true);

		// Rango del mes actual para detectar licencias vigentes
		const now = new Date();
		const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
		const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
		const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

		try {
			const horizonEnd = new Date();
			horizonEnd.setDate(horizonEnd.getDate() + 60);
			const horizonEndStr = horizonEnd.toISOString().slice(0, 10);
			const todayStr = new Date().toISOString().slice(0, 10);

			const [usersRes, cashRes, scheduledRes, scheduledSummaryRes] =
				await Promise.all([
					fetch(`${USERS_ENDPOINT}?limit=500`, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(CASH_ENDPOINT, {
						headers: { Authorization: `Bearer ${token}` },
					}),
					fetch(
						`${SCHEDULED_TX_ENDPOINT}?status=pending&from=${todayStr}&to=${horizonEndStr}`,
						{ headers: { Authorization: `Bearer ${token}` } },
					),
					fetch(SCHEDULED_TX_SUMMARY_ENDPOINT, {
						headers: { Authorization: `Bearer ${token}` },
					}),
				]);

			if (scheduledRes.ok) {
				const sJson = await scheduledRes.json();
				const arr = (sJson.data ?? []) as ScheduledTransaction[];
				const sorted = [...arr].sort((a, b) =>
					a.dueDate.localeCompare(b.dueDate),
				);
				setUpcomingIncomes(
					sorted.filter((x) => x.type === "income").slice(0, 5),
				);
				setUpcomingExpenses(
					sorted.filter((x) => x.type === "expense").slice(0, 5),
				);
			}

			if (scheduledSummaryRes.ok) {
				const ssJson = await scheduledSummaryRes.json();
				setScheduledSummary(ssJson.data as ScheduledSummary);
			}

			if (!usersRes.ok) throw new Error();
			const usersJson = await usersRes.json();
			const rawUsers = usersJson.data ?? usersJson ?? [];

			// biome-ignore lint/suspicious/noExplicitAny: payload del backend
			const mapped: EmployeeWithEmployment[] = rawUsers.map((u: any) => ({
				id: u.id,
				name: u.name,
				email: u.email,
				employment: u.employment ?? null,
			}));
			setEmployees(mapped);

			const repIds = new Set<number>();
			// biome-ignore lint/suspicious/noExplicitAny: payload del backend
			for (const u of rawUsers as any[]) {
				const isRep = Array.isArray(u.roleUser)
					? // biome-ignore lint/suspicious/noExplicitAny: payload del backend
						u.roleUser.some(
							// biome-ignore lint/suspicious/noExplicitAny: payload del backend
							(ru: any) => ru?.role?.name === Role.ABOGADO_REPRESENTANTE,
						)
					: false;
				if (isRep) repIds.add(u.id);
			}
			setRepresentativeIds(repIds);

			if (cashRes.ok) {
				const cashJson = await cashRes.json();
				const txs = (
					Array.isArray(cashJson.transactions) ? cashJson.transactions : []
				) as Transaction[];
				const sorted = [...txs].sort(
					(a, b) =>
						new Date(b.date).getTime() - new Date(a.date).getTime(),
				);
				setRecentMovements(sorted.slice(0, 8));
			}

			const withEmployment = mapped.filter((e) => e.employment);
			const leavesByUser = await Promise.all(
				withEmployment.map(async (e) => {
					try {
						const res = await fetch(LEAVES_BY_USER_ENDPOINT(e.id), {
							headers: { Authorization: `Bearer ${token}` },
						});
						if (!res.ok)
							return { pending: [] as PendingLeave[], active: [] as ActiveLeave[] };
						const json = await res.json();
						const arr = (json.data ?? []) as Array<
							LeaveSummary & { id: number; reason?: string | null }
						>;
						const pending = arr
							.filter((l) => l.status === "PENDING")
							.map<PendingLeave>((l) => ({
								id: l.id,
								userId: e.id,
								userName: e.name,
								type: l.type,
								startDate: l.startDate,
								endDate: l.endDate,
								daysRequested: l.daysRequested,
								reason: l.reason ?? null,
							}));
						// Aprobadas que se solapan con el mes actual:
						// startDate <= finDelMes && endDate >= inicioDelMes
						const active = arr
							.filter((l) => {
								if (l.status !== "APPROVED") return false;
								const start = l.startDate.slice(0, 10);
								const end = l.endDate.slice(0, 10);
								return start <= monthEnd && end >= monthStart;
							})
							.map<ActiveLeave>((l) => ({
								id: l.id,
								userId: e.id,
								userName: e.name,
								type: l.type,
								startDate: l.startDate,
								endDate: l.endDate,
								daysRequested: l.daysRequested,
							}));
						return { pending, active };
					} catch {
						return { pending: [] as PendingLeave[], active: [] as ActiveLeave[] };
					}
				}),
			);
			setPendingLeaves(leavesByUser.flatMap((x) => x.pending));
			setActiveLeaves(
				leavesByUser
					.flatMap((x) => x.active)
					.sort((a, b) => a.startDate.localeCompare(b.startDate)),
			);
		} catch {
			toast.error("Error al cargar datos contables");
		} finally {
			setLoading(false);
		}
	}, [token]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const stats = useMemo(() => {
		const start = new Date();
		start.setDate(1);
		const end = new Date();
		return computeStats(
			employees,
			start.toISOString().slice(0, 10),
			end.toISOString().slice(0, 10),
		);
	}, [employees]);

	const headcount = useMemo(() => {
		let internos = 0;
		let representantes = 0;
		for (const e of employees) {
			if (e.employment?.status !== "ACTIVE") continue;
			if (representativeIds.has(e.id)) representantes++;
			else internos++;
		}
		return { internos, representantes };
	}, [employees, representativeIds]);

	const handleApprove = async (l: PendingLeave) => {
		if (!token) return;
		setActingId(l.id);
		try {
			const res = await fetch(LEAVE_APPROVE_ENDPOINT(l.id), {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error();
			toast.success("Licencia aprobada");
			setPendingLeaves((prev) => prev.filter((x) => x.id !== l.id));
		} catch {
			toast.error("Error al aprobar");
		} finally {
			setActingId(null);
		}
	};

	const handleReject = async (l: PendingLeave) => {
		if (!token) return;
		const reason = prompt("Motivo del rechazo (opcional):") ?? "";
		setActingId(l.id);
		try {
			const res = await fetch(LEAVE_REJECT_ENDPOINT(l.id), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ rejectionReason: reason || null }),
			});
			if (!res.ok) throw new Error();
			toast.success("Licencia rechazada");
			setPendingLeaves((prev) => prev.filter((x) => x.id !== l.id));
		} catch {
			toast.error("Error al rechazar");
		} finally {
			setActingId(null);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			<DashboardGreetingHeader
				subtitle={
					<>
						Vista contable:{" "}
						<span className="font-medium">{headcount.internos}</span> internos
						·{" "}
						<span className="font-medium">{headcount.representantes}</span>{" "}
						representantes ·{" "}
						<span
							className={
								pendingLeaves.length > 0
									? "text-amber-600 font-medium"
									: "font-medium"
							}
						>
							{pendingLeaves.length} licencias pendientes
						</span>
					</>
				}
				onRefresh={fetchData}
				isRefreshing={loading}
			/>

			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center gap-2 mb-3">
							<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
								<Users2 className="size-4 text-primary" />
							</div>
							<p className="text-xs text-muted-foreground">
								Empleados activos
							</p>
						</div>
						{loading ? (
							<Skeleton className="h-12 w-full" />
						) : (
							<div className="grid grid-cols-2 gap-2">
								<div>
									<p className="text-2xl font-bold leading-none">
										{headcount.internos}
									</p>
									<p className="text-[11px] text-muted-foreground mt-1">
										Internos
									</p>
								</div>
								<div className="border-l border-border pl-2">
									<p className="text-2xl font-bold leading-none">
										{headcount.representantes}
									</p>
									<p className="text-[11px] text-muted-foreground mt-1">
										Representantes
									</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 flex items-center gap-3">
						<div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
							<TrendingUp className="size-5 text-emerald-600" />
						</div>
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">Altas este mes</p>
							{loading ? (
								<Skeleton className="h-7 w-12 mt-1" />
							) : (
								<p className="text-2xl font-bold">{stats.altas}</p>
							)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 flex items-center gap-3">
						<div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
							<Calendar className="size-5 text-amber-600" />
						</div>
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">
								Licencias pendientes
							</p>
							{loading ? (
								<Skeleton className="h-7 w-12 mt-1" />
							) : (
								<p className="text-2xl font-bold">{pendingLeaves.length}</p>
							)}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4 flex items-center gap-3">
						<div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
							<Wallet className="size-5 text-blue-600" />
						</div>
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">
								Costo nómina mensual
							</p>
							{loading ? (
								<Skeleton className="h-7 w-20 mt-1" />
							) : (
								<p className="text-lg font-bold truncate">
									{formatCurrency(stats.costoMensualTotal)}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* KPIs Gestor de Gastos e Ingresos */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-4 flex items-center gap-3">
						<div className="size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
							<ArrowUpCircle className="size-5 text-emerald-600" />
						</div>
						<div className="min-w-0">
							<p className="text-xs text-muted-foreground">
								A cobrar pendiente
								{scheduledSummary
									? ` · ${scheduledSummary.pending.income.count}`
									: ""}
							</p>
							{loading ? (
								<Skeleton className="h-7 w-24 mt-1" />
							) : (
								<p className="text-lg font-bold truncate text-emerald-700 dark:text-emerald-400">
									{formatCurrency(
										scheduledSummary?.pending.income.amount ?? 0,
									)}
								</p>
							)}
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
								A pagar pendiente
								{scheduledSummary
									? ` · ${scheduledSummary.pending.expense.count}`
									: ""}
							</p>
							{loading ? (
								<Skeleton className="h-7 w-24 mt-1" />
							) : (
								<p className="text-lg font-bold truncate text-red-700 dark:text-red-400">
									{formatCurrency(
										scheduledSummary?.pending.expense.amount ?? 0,
									)}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
				<Card
					className={
						(scheduledSummary?.overdueExpense.count ?? 0) > 0
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
								Gastos vencidos
								{scheduledSummary
									? ` · ${scheduledSummary.overdueExpense.count}`
									: ""}
							</p>
							{loading ? (
								<Skeleton className="h-7 w-24 mt-1" />
							) : (
								<p className="text-lg font-bold truncate text-amber-700 dark:text-amber-400">
									{formatCurrency(
										scheduledSummary?.overdueExpense.amount ?? 0,
									)}
								</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-base flex items-center gap-2">
							<AlertCircle className="size-5 text-amber-600" />
							Licencias pendientes de aprobación
						</CardTitle>
						<Badge variant="outline">
							{pendingLeaves.length}{" "}
							{pendingLeaves.length === 1 ? "solicitud" : "solicitudes"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="space-y-3">
							{[1, 2, 3].map((i) => (
								<Skeleton key={i} className="h-16 w-full" />
							))}
						</div>
					) : pendingLeaves.length === 0 ? (
						<div className="text-center py-6">
							<Check className="size-8 text-emerald-500 mx-auto mb-2" />
							<p className="text-sm text-muted-foreground">
								No hay licencias pendientes
							</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{pendingLeaves.map((l) => (
								<div
									key={l.id}
									className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 flex-wrap">
											<p className="text-sm font-medium">{l.userName}</p>
											<Badge variant="outline" className="text-[10px]">
												{typeLabel[l.type] ?? l.type}
											</Badge>
											<span className="text-xs text-muted-foreground">
												{l.daysRequested}{" "}
												{l.daysRequested === 1 ? "día" : "días"}
											</span>
										</div>
										<p className="text-xs text-muted-foreground mt-0.5">
											{formatDay(l.startDate)} → {formatDay(l.endDate)}
										</p>
										{l.reason && (
											<p className="text-xs text-muted-foreground mt-1 italic">
												{l.reason}
											</p>
										)}
									</div>
									<div className="flex items-center gap-1 shrink-0">
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleApprove(l)}
											disabled={actingId === l.id}
											className="text-emerald-600 hover:text-emerald-700"
										>
											{actingId === l.id ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<Check className="h-3.5 w-3.5 mr-1" />
											)}
											Aprobar
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => handleReject(l)}
											disabled={actingId === l.id}
											className="text-destructive hover:text-destructive"
										>
											<Ban className="h-3.5 w-3.5 mr-1" />
											Rechazar
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-base flex items-center gap-2">
								<Receipt className="size-5 text-primary" />
								Últimos movimientos · Caja Principal
							</CardTitle>
							<Link
								href="/admin/cashbox"
								className="text-xs text-primary hover:underline flex items-center gap-1"
							>
								Ver caja <ArrowRight className="size-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="space-y-3">
								{[1, 2, 3, 4].map((i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : recentMovements.length === 0 ? (
							<div className="text-center py-6 text-sm text-muted-foreground">
								Sin movimientos registrados
							</div>
						) : (
							<div className="divide-y divide-border">
								{recentMovements.map((t) => {
									const isIncome = t.type === "income";
									const isExpense = t.type === "expense";
									const sign = isIncome ? "+" : isExpense ? "−" : "";
									const colorClass = isIncome
										? "text-emerald-600"
										: isExpense
											? "text-destructive"
											: "text-muted-foreground";
									const Icon = isIncome
										? ArrowUpRight
										: isExpense
											? ArrowDownRight
											: ArrowRightLeft;
									return (
										<div
											key={t.id}
											className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
										>
											<div className="flex items-center gap-2 min-w-0 flex-1">
												<div
													className={`size-8 rounded-full bg-muted flex items-center justify-center shrink-0 ${colorClass}`}
												>
													<Icon className="size-4" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2 flex-wrap">
														<p className="text-sm font-medium truncate">
															{getSubtypeLabel(t.type, t.subtype)}
														</p>
														<span className="text-[10px] text-muted-foreground">
															{formatDay(t.date)}
														</span>
													</div>
													{(t.description || t.user?.name) && (
														<p className="text-xs text-muted-foreground truncate">
															{t.user?.name}
															{t.description ? ` · ${t.description}` : ""}
														</p>
													)}
												</div>
											</div>
											<p
												className={`text-sm font-semibold tabular-nums shrink-0 ${colorClass}`}
											>
												{sign}
												{formatCurrency(Math.abs(Number(t.amount) || 0))}
											</p>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-base flex items-center gap-2">
								<Palmtree className="size-5 text-emerald-600" />
								Licencias vigentes este mes
							</CardTitle>
							<Badge variant="outline">
								{activeLeaves.length}{" "}
								{activeLeaves.length === 1 ? "vigente" : "vigentes"}
							</Badge>
						</div>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : activeLeaves.length === 0 ? (
							<div className="text-center py-6 text-sm text-muted-foreground">
								Ninguna licencia aprobada está vigente este mes
							</div>
						) : (
							<div className="divide-y divide-border">
								{activeLeaves.map((l) => (
									<div
										key={l.id}
										className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2 flex-wrap">
												<p className="text-sm font-medium truncate">
													{l.userName}
												</p>
												<Badge
													variant="outline"
													className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400"
												>
													{typeLabel[l.type] ?? l.type}
												</Badge>
											</div>
											<p className="text-xs text-muted-foreground mt-0.5">
												{formatDay(l.startDate)} → {formatDay(l.endDate)}
											</p>
										</div>
										<span className="text-xs text-muted-foreground shrink-0">
											{l.daysRequested}{" "}
											{l.daysRequested === 1 ? "día" : "días"}
										</span>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Próximos cobros / Próximos pagos */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<Card className="border-emerald-200 dark:border-emerald-900">
					<CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
								<ArrowUpCircle className="size-5" />
								Próximos cobros
							</CardTitle>
							<Link
								href="/admin/accounting"
								className="text-xs text-emerald-700 hover:underline flex items-center gap-1"
							>
								Ver todos <ArrowRight className="size-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : upcomingIncomes.length === 0 ? (
							<div className="text-center py-6 text-sm text-muted-foreground">
								Sin cobros previstos
							</div>
						) : (
							<div className="divide-y divide-border">
								{upcomingIncomes.map((it) => (
									<div
										key={it.id}
										className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">
												{it.concept}
											</p>
											<p className="text-xs text-muted-foreground">
												{formatDay(it.dueDate)}
												{it.detail ? ` · ${it.detail}` : ""}
											</p>
										</div>
										<p className="text-sm font-semibold tabular-nums shrink-0 text-emerald-700 dark:text-emerald-400">
											+{formatCurrency(Number(it.amount || 0))}
										</p>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="border-red-200 dark:border-red-900">
					<CardHeader className="bg-red-50/50 dark:bg-red-950/20 rounded-t-xl">
						<div className="flex items-center justify-between">
							<CardTitle className="text-base flex items-center gap-2 text-red-800 dark:text-red-300">
								<ArrowDownCircle className="size-5" />
								Próximos pagos
							</CardTitle>
							<Link
								href="/admin/accounting"
								className="text-xs text-red-700 hover:underline flex items-center gap-1"
							>
								Ver todos <ArrowRight className="size-3" />
							</Link>
						</div>
					</CardHeader>
					<CardContent>
						{loading ? (
							<div className="space-y-3">
								{[1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-12 w-full" />
								))}
							</div>
						) : upcomingExpenses.length === 0 ? (
							<div className="text-center py-6 text-sm text-muted-foreground">
								Sin pagos próximos
							</div>
						) : (
							<div className="divide-y divide-border">
								{upcomingExpenses.map((it) => {
									const overdue =
										new Date(it.dueDate).getTime() < Date.now() - 24 * 3600_000;
									return (
										<div
											key={it.id}
											className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
										>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium truncate">
													{it.concept}
												</p>
												<p
													className={`text-xs ${overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}
												>
													{formatDay(it.dueDate)}
													{it.detail ? ` · ${it.detail}` : ""}
												</p>
											</div>
											<p className="text-sm font-semibold tabular-nums shrink-0 text-red-700 dark:text-red-400">
												−{formatCurrency(Number(it.amount || 0))}
											</p>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Link href="/admin/accounting">
					<Card className="hover:bg-muted/40 transition-colors cursor-pointer">
						<CardContent className="p-4 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Receipt className="size-5 text-primary" />
								<div>
									<p className="text-sm font-medium">Gastos e Ingresos</p>
									<p className="text-xs text-muted-foreground">
										A cobrar / A pagar
									</p>
								</div>
							</div>
							<ArrowRight className="size-4 text-muted-foreground" />
						</CardContent>
					</Card>
				</Link>
				<Link href="/admin/cashbox">
					<Card className="hover:bg-muted/40 transition-colors cursor-pointer">
						<CardContent className="p-4 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Wallet className="size-5 text-primary" />
								<div>
									<p className="text-sm font-medium">Caja Principal</p>
									<p className="text-xs text-muted-foreground">
										Movimientos y cierres
									</p>
								</div>
							</div>
							<ArrowRight className="size-4 text-muted-foreground" />
						</CardContent>
					</Card>
				</Link>
				<Link href="/admin/rrhh/reports">
					<Card className="hover:bg-muted/40 transition-colors cursor-pointer">
						<CardContent className="p-4 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<TrendingUp className="size-5 text-primary" />
								<div>
									<p className="text-sm font-medium">Reportes RRHH</p>
									<p className="text-xs text-muted-foreground">
										Rotación, costos, ausentismo
									</p>
								</div>
							</div>
							<ArrowRight className="size-4 text-muted-foreground" />
						</CardContent>
					</Card>
				</Link>
				<Link href="/admin/teams">
					<Card className="hover:bg-muted/40 transition-colors cursor-pointer">
						<CardContent className="p-4 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Users2 className="size-5 text-primary" />
								<div>
									<p className="text-sm font-medium">Equipo</p>
									<p className="text-xs text-muted-foreground">
										Empleados y asistencia
									</p>
								</div>
							</div>
							<ArrowRight className="size-4 text-muted-foreground" />
						</CardContent>
					</Card>
				</Link>
			</div>
		</div>
	);
}
