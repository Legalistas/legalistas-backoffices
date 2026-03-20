"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CASH_ENDPOINT } from "@/constant/api-endpoints";
import { Loader2 } from "lucide-react";

interface Transaction {
	id: number;
	type: string;
	subtype: string;
	userId: number;
	amount: number;
	date: string;
	description: string | null;
	closed: boolean;
	userTransferId: number | null;
	user: { id: number; name: string; image: string | null };
	transferUser?: { id: number; name: string } | null;
}

interface ClosedMonth {
	id: number;
	month: string;
	year: string;
	initialBalance: number;
	monthlyIncome: number;
	monthlyExpenses: number;
	monthlyBalance: number;
	closingDate: string;
}

interface UserTransfer {
	id: number;
	fromUserId: number;
	toUserId: number;
	amount: number;
	createdAt: string;
	description: string | null;
	fromUser: { id: number; name: string; image: string | null };
	toUser: { id: number; name: string; image: string | null };
}

interface MonthData {
	key: string;
	month: number;
	year: number;
	label: string;
	openIncome: number;
	openExpenses: number;
	openTransfers: number;
	closedIncome: number;
	closedExpenses: number;
	closedTransfers: number;
	totalIncome: number;
	totalExpenses: number;
	totalTransfers: number;
	openCount: number;
	closedCount: number;
	closedReport: ClosedMonth | null;
}

interface UserData {
	id: number;
	name: string;
	allIncome: number;
	allExpenses: number;
	allTransfersSent: number;
	transfersReceived: number;
	openIncome: number;
	openExpenses: number;
	balance: number;
}

const fmt = (n: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
	}).format(n);

export default function CashboxDebugPage() {
	const { data: session } = useSession();
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const [closedMonths, setClosedMonths] = useState<ClosedMonth[]>([]);
	const [userTransfers, setUserTransfers] = useState<UserTransfer[]>([]);
	const [initialBalance, setInitialBalance] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [repairing, setRepairing] = useState(false);
	const [repairResult, setRepairResult] = useState<any>(null);

	const handleRepair = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		if (!confirm("Esto va a borrar TODOS los cierres de mes y re-cerrarlos con los datos reales. Continuar?")) return;
		setRepairing(true);
		setRepairResult(null);
		try {
			const res = await fetch(`${CASH_ENDPOINT}/repair`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});
			const data = await res.json();
			setRepairResult(data);
			if (data.success) {
				loadData();
			}
		} catch (err: any) {
			setRepairResult({ success: false, message: err.message });
		} finally {
			setRepairing(false);
		}
	}, [session?.user?.accessToken]);

	const loadData = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(CASH_ENDPOINT, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Error");

			setTransactions(data.transactions || []);
			setClosedMonths(data.closedMonths || []);
			setUserTransfers(data.userTransfers || []);
			setInitialBalance(data.initialBalance || 0);
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Desglose mes a mes
	const monthlyBreakdown = useMemo(() => {
		const map = new Map<string, MonthData>();

		for (const t of transactions) {
			const d = new Date(t.date);
			const m = d.getUTCMonth() + 1;
			const y = d.getUTCFullYear();
			const key = `${y}-${String(m).padStart(2, "0")}`;
			const label = `${String(m).padStart(2, "0")}/${y}`;

			if (!map.has(key)) {
				map.set(key, {
					key,
					month: m,
					year: y,
					label,
					openIncome: 0,
					openExpenses: 0,
					openTransfers: 0,
					closedIncome: 0,
					closedExpenses: 0,
					closedTransfers: 0,
					totalIncome: 0,
					totalExpenses: 0,
					totalTransfers: 0,
					openCount: 0,
					closedCount: 0,
					closedReport: null,
				});
			}

			const entry = map.get(key)!;
			const amount = Number(t.amount) || 0;

			if (t.closed) {
				entry.closedCount++;
				if (t.type === "income") entry.closedIncome += amount;
				else if (t.type === "expense") entry.closedExpenses += amount;
				else if (t.type === "transfer") entry.closedTransfers += amount;
			} else {
				entry.openCount++;
				if (t.type === "income") entry.openIncome += amount;
				else if (t.type === "expense") entry.openExpenses += amount;
				else if (t.type === "transfer") entry.openTransfers += amount;
			}

			if (t.type === "income") entry.totalIncome += amount;
			else if (t.type === "expense") entry.totalExpenses += amount;
			else if (t.type === "transfer") entry.totalTransfers += amount;
		}

		// Asociar reportes de meses cerrados
		for (const cm of closedMonths) {
			const key = `${cm.year}-${cm.month.padStart(2, "0")}`;
			const entry = map.get(key);
			if (entry) {
				entry.closedReport = cm;
			} else {
				map.set(key, {
					key,
					month: Number(cm.month),
					year: Number(cm.year),
					label: `${cm.month.padStart(2, "0")}/${cm.year}`,
					openIncome: 0,
					openExpenses: 0,
					openTransfers: 0,
					closedIncome: 0,
					closedExpenses: 0,
					closedTransfers: 0,
					totalIncome: 0,
					totalExpenses: 0,
					totalTransfers: 0,
					openCount: 0,
					closedCount: 0,
					closedReport: cm,
				});
			}
		}

		return Array.from(map.values()).sort((a, b) =>
			a.key < b.key ? -1 : a.key > b.key ? 1 : 0,
		);
	}, [transactions, closedMonths]);

	// Desglose por usuario
	const userBreakdown = useMemo(() => {
		const map = new Map<number, UserData>();

		const getOrCreate = (id: number, name: string): UserData => {
			if (!map.has(id)) {
				map.set(id, {
					id,
					name,
					allIncome: 0,
					allExpenses: 0,
					allTransfersSent: 0,
					transfersReceived: 0,
					openIncome: 0,
					openExpenses: 0,
					balance: 0,
				});
			}
			return map.get(id)!;
		};

		for (const t of transactions) {
			const u = getOrCreate(t.userId, t.user?.name || `ID ${t.userId}`);
			const amount = Number(t.amount) || 0;

			if (t.type === "income") {
				u.allIncome += amount;
				if (!t.closed) u.openIncome += amount;
			} else if (t.type === "expense") {
				u.allExpenses += amount;
				if (!t.closed) u.openExpenses += amount;
			} else if (t.type === "transfer") {
				u.allTransfersSent += amount;
			}
		}

		for (const tr of userTransfers) {
			const receiver = getOrCreate(
				tr.toUserId,
				tr.toUser?.name || `ID ${tr.toUserId}`,
			);
			receiver.transfersReceived += Number(tr.amount) || 0;
		}

		map.forEach((u) => {
			u.balance =
				u.allIncome +
				u.transfersReceived -
				u.allExpenses -
				u.allTransfersSent;
		});

		return Array.from(map.values()).sort((a, b) =>
			a.name.localeCompare(b.name),
		);
	}, [transactions, userTransfers]);

	// Totales
	const totals = useMemo(() => {
		const openIncome = transactions
			.filter((t) => !t.closed && t.type === "income")
			.reduce((s, t) => s + (Number(t.amount) || 0), 0);
		const openExpenses = transactions
			.filter((t) => !t.closed && t.type === "expense")
			.reduce((s, t) => s + (Number(t.amount) || 0), 0);
		const allIncome = transactions
			.filter((t) => t.type === "income")
			.reduce((s, t) => s + (Number(t.amount) || 0), 0);
		const allExpenses = transactions
			.filter((t) => t.type === "expense")
			.reduce((s, t) => s + (Number(t.amount) || 0), 0);
		const allTransfers = transactions
			.filter((t) => t.type === "transfer")
			.reduce((s, t) => s + (Number(t.amount) || 0), 0);

		return {
			totalTransactions: transactions.length,
			openTransactions: transactions.filter((t) => !t.closed).length,
			closedTransactions: transactions.filter((t) => t.closed).length,
			openIncome,
			openExpenses,
			openBalance: openIncome - openExpenses,
			allIncome,
			allExpenses,
			allBalance: allIncome - allExpenses,
			allTransfers,
			initialBalance,
			cashBalance: initialBalance + openIncome - openExpenses,
		};
	}, [transactions, initialBalance]);

	const userTotals = useMemo(() => {
		return {
			income: userBreakdown.reduce((s, u) => s + u.allIncome, 0),
			expenses: userBreakdown.reduce((s, u) => s + u.allExpenses, 0),
			balance: userBreakdown.reduce((s, u) => s + u.balance, 0),
			transfersSent: userBreakdown.reduce(
				(s, u) => s + u.allTransfersSent,
				0,
			),
			transfersReceived: userBreakdown.reduce(
				(s, u) => s + u.transfersReceived,
				0,
			),
		};
	}, [userBreakdown]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="p-6">
					<p className="text-destructive">{error}</p>
					<Button onClick={loadData} className="mt-4">
						Reintentar
					</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Debug Caja - Datos Crudos</h1>

			{/* Resumen general */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">
							Total Transacciones
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{totals.totalTransactions}</p>
						<p className="text-xs text-muted-foreground">
							{totals.openTransactions} abiertas / {totals.closedTransactions}{" "}
							cerradas
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">
							Saldo Caja (init + open)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold">{fmt(totals.cashBalance)}</p>
						<p className="text-xs text-muted-foreground">
							Init: {fmt(totals.initialBalance)} + Ing:{" "}
							{fmt(totals.openIncome)} - Gas: {fmt(totals.openExpenses)}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">
							Ingresos (solo abiertas)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-green-600">
							{fmt(totals.openIncome)}
						</p>
						<p className="text-xs text-muted-foreground">
							Todas: {fmt(totals.allIncome)}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm text-muted-foreground">
							Gastos (solo abiertas)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold text-red-600">
							{fmt(totals.openExpenses)}
						</p>
						<p className="text-xs text-muted-foreground">
							Todas: {fmt(totals.allExpenses)}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Tabla mes a mes */}
			<Card>
				<CardHeader>
					<CardTitle>Desglose Mes a Mes</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mes</TableHead>
									<TableHead className="text-center">Abiertas</TableHead>
									<TableHead className="text-center">Cerradas</TableHead>
									<TableHead className="text-right">Ing. Abiertas</TableHead>
									<TableHead className="text-right">Gas. Abiertas</TableHead>
									<TableHead className="text-right">Ing. Totales</TableHead>
									<TableHead className="text-right">Gas. Totales</TableHead>
									<TableHead className="text-right">Saldo Mes</TableHead>
									<TableHead className="text-center">Reporte Cierre</TableHead>
									<TableHead className="text-right">Cierre Ing.</TableHead>
									<TableHead className="text-right">Cierre Gas.</TableHead>
									<TableHead className="text-right">Cierre Saldo</TableHead>
									<TableHead className="text-center">Match?</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{monthlyBreakdown.map((m) => {
									const reportMatch =
										m.closedReport &&
										Math.abs(
											m.closedReport.monthlyIncome - m.totalIncome,
										) < 0.01 &&
										Math.abs(
											m.closedReport.monthlyExpenses - m.totalExpenses,
										) < 0.01;

									return (
										<TableRow key={m.key}>
											<TableCell className="font-medium">{m.label}</TableCell>
											<TableCell className="text-center">
												{m.openCount}
											</TableCell>
											<TableCell className="text-center">
												{m.closedCount}
											</TableCell>
											<TableCell className="text-right text-green-600">
												{fmt(m.openIncome)}
											</TableCell>
											<TableCell className="text-right text-red-600">
												{fmt(m.openExpenses)}
											</TableCell>
											<TableCell className="text-right text-green-700 font-medium">
												{fmt(m.totalIncome)}
											</TableCell>
											<TableCell className="text-right text-red-700 font-medium">
												{fmt(m.totalExpenses)}
											</TableCell>
											<TableCell className="text-right font-bold">
												{fmt(m.totalIncome - m.totalExpenses)}
											</TableCell>
											<TableCell className="text-center">
												{m.closedReport ? (
													<Badge variant="default">Cerrado</Badge>
												) : (
													<Badge variant="outline">Abierto</Badge>
												)}
											</TableCell>
											<TableCell className="text-right">
												{m.closedReport
													? fmt(m.closedReport.monthlyIncome)
													: "-"}
											</TableCell>
											<TableCell className="text-right">
												{m.closedReport
													? fmt(m.closedReport.monthlyExpenses)
													: "-"}
											</TableCell>
											<TableCell className="text-right font-bold">
												{m.closedReport
													? fmt(m.closedReport.monthlyBalance)
													: "-"}
											</TableCell>
											<TableCell className="text-center">
												{m.closedReport ? (
													reportMatch ? (
														<Badge className="bg-green-500">OK</Badge>
													) : (
														<Badge variant="destructive">DIFF</Badge>
													)
												) : (
													"-"
												)}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Tabla por usuario */}
			<Card>
				<CardHeader>
					<CardTitle>Desglose por Usuario (todas las transacciones)</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Usuario</TableHead>
									<TableHead className="text-right">Ingresos</TableHead>
									<TableHead className="text-right">Gastos</TableHead>
									<TableHead className="text-right">Transf. Enviadas</TableHead>
									<TableHead className="text-right">Transf. Recibidas</TableHead>
									<TableHead className="text-right">Ing. Abiertas</TableHead>
									<TableHead className="text-right">Gas. Abiertas</TableHead>
									<TableHead className="text-right">Saldo Total</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{userBreakdown.map((u) => (
									<TableRow key={u.id}>
										<TableCell className="font-medium">{u.name}</TableCell>
										<TableCell className="text-right text-green-600">
											{fmt(u.allIncome)}
										</TableCell>
										<TableCell className="text-right text-red-600">
											{fmt(u.allExpenses)}
										</TableCell>
										<TableCell className="text-right text-orange-600">
											{fmt(u.allTransfersSent)}
										</TableCell>
										<TableCell className="text-right text-blue-600">
											{fmt(u.transfersReceived)}
										</TableCell>
										<TableCell className="text-right text-green-400">
											{fmt(u.openIncome)}
										</TableCell>
										<TableCell className="text-right text-red-400">
											{fmt(u.openExpenses)}
										</TableCell>
										<TableCell
											className={`text-right font-bold ${u.balance >= 0 ? "text-green-700" : "text-red-700"}`}
										>
											{fmt(u.balance)}
										</TableCell>
									</TableRow>
								))}
								<TableRow className="border-t-2 font-bold">
									<TableCell>Totales</TableCell>
									<TableCell className="text-right text-green-600">
										{fmt(userTotals.income)}
									</TableCell>
									<TableCell className="text-right text-red-600">
										{fmt(userTotals.expenses)}
									</TableCell>
									<TableCell className="text-right text-orange-600">
										{fmt(userTotals.transfersSent)}
									</TableCell>
									<TableCell className="text-right text-blue-600">
										{fmt(userTotals.transfersReceived)}
									</TableCell>
									<TableCell />
									<TableCell />
									<TableCell
										className={`text-right ${userTotals.balance >= 0 ? "text-green-700" : "text-red-700"}`}
									>
										{fmt(userTotals.balance)}
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Meses cerrados del backend */}
			<Card>
				<CardHeader>
					<CardTitle>Reportes de Meses Cerrados (backend)</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mes/Anio</TableHead>
									<TableHead className="text-right">Saldo Inicial</TableHead>
									<TableHead className="text-right">Ingresos</TableHead>
									<TableHead className="text-right">Gastos</TableHead>
									<TableHead className="text-right">Saldo Final</TableHead>
									<TableHead>Fecha Cierre</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{closedMonths.map((cm) => (
									<TableRow key={cm.id}>
										<TableCell className="font-medium">
											{cm.month.padStart(2, "0")}/{cm.year}
										</TableCell>
										<TableCell className="text-right">
											{fmt(cm.initialBalance)}
										</TableCell>
										<TableCell className="text-right text-green-600">
											{fmt(cm.monthlyIncome)}
										</TableCell>
										<TableCell className="text-right text-red-600">
											{fmt(cm.monthlyExpenses)}
										</TableCell>
										<TableCell
											className={`text-right font-bold ${cm.monthlyBalance >= 0 ? "text-green-700" : "text-red-700"}`}
										>
											{fmt(cm.monthlyBalance)}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{new Date(cm.closingDate).toLocaleDateString("es-AR")}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Reparación */}
			<Card className="border-orange-300">
				<CardHeader>
					<CardTitle className="text-orange-600">Reparar Cierres de Mes</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						Borra todos los reportes de cierre existentes y los re-crea en orden
						cronológico usando los datos reales de las transacciones. Marca cada
						transacción de meses pasados como <code>closed: true</code>. El mes
						actual queda abierto.
					</p>
					<div className="flex gap-2">
						<Button
							onClick={handleRepair}
							disabled={repairing}
							variant="destructive"
						>
							{repairing ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Reparando...
								</>
							) : (
								"Ejecutar Reparación"
							)}
						</Button>
						<Button onClick={loadData} variant="outline">
							Recargar datos
						</Button>
					</div>

					{repairResult && (
						<div
							className={`p-4 rounded-md text-sm ${repairResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
						>
							<p className="font-medium mb-2">
								{repairResult.success ? "Reparación exitosa" : "Error"}
							</p>
							<p>{repairResult.message}</p>
							{repairResult.finalBalance !== undefined && (
								<p className="mt-1">
									Saldo final: <strong>{fmt(repairResult.finalBalance)}</strong>
								</p>
							)}
							{repairResult.details && (
								<div className="mt-3 overflow-x-auto">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Mes</TableHead>
												<TableHead>Estado</TableHead>
												<TableHead className="text-right">Transacciones</TableHead>
												<TableHead className="text-right">Ingresos</TableHead>
												<TableHead className="text-right">Gastos</TableHead>
												<TableHead className="text-right">Saldo Inicial</TableHead>
												<TableHead className="text-right">Saldo Final</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{repairResult.details.map((d: any, i: number) => (
												<TableRow key={i}>
													<TableCell className="font-medium">{d.month}</TableCell>
													<TableCell>
														<Badge
															variant={d.status === "CLOSED" ? "default" : "outline"}
														>
															{d.status}
														</Badge>
													</TableCell>
													<TableCell className="text-right">{d.transactions}</TableCell>
													<TableCell className="text-right text-green-600">
														{d.income !== undefined ? fmt(d.income) : "-"}
													</TableCell>
													<TableCell className="text-right text-red-600">
														{d.expenses !== undefined ? fmt(d.expenses) : "-"}
													</TableCell>
													<TableCell className="text-right">
														{d.initialBalance !== undefined ? fmt(d.initialBalance) : "-"}
													</TableCell>
													<TableCell className="text-right font-bold">
														{d.finalBalance !== undefined ? fmt(d.finalBalance) : "-"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
