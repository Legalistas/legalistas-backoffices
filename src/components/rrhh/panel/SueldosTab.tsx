"use client";

import { Eye, FilePlus2, Wallet } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatARS } from "@/components/caja/api";
import { formatPeriodo } from "@/components/rrhh/api";
import ReciboPreviewDialog from "@/components/rrhh/ReciboPreviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { type EmpleadoPanel, type ResumenPago, resumenPago } from "@/lib/panel-rrhh";
import GenerarRecibosDialog from "./GenerarRecibosDialog";
import PagarSueldosDialog from "./PagarSueldosDialog";
import { panelFetch, periodoActual } from "./shared";

interface Fila {
	e: EmpleadoPanel;
	pago: ResumenPago;
}

const ESTADO: Record<ResumenPago["estado"], { label: string; className: string }> = {
	SIN_RECIBO: { label: "Sin recibo", className: "bg-muted text-muted-foreground" },
	SIN_PAGO: {
		label: "Sin pago cargado",
		className: "bg-transparent border border-amber-300 text-amber-700 dark:text-amber-300",
	},
	PENDIENTE: { label: "Pendiente", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
	PAGADO: { label: "Pagado", className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
};

/** Salaries of the month for everyone: generate the payslips and pay them in one go. */
export default function SueldosTab() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [periodo, setPeriodo] = useState(periodoActual);
	const [empleados, setEmpleados] = useState<EmpleadoPanel[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [conRepresentantes, setConRepresentantes] = useState(false);
	const [marcados, setMarcados] = useState<Set<number>>(new Set());
	const [generar, setGenerar] = useState<EmpleadoPanel[] | null>(null);
	const [pagar, setPagar] = useState<Fila[] | null>(null);
	const [recibo, setRecibo] = useState<number | null>(null);

	const cargar = useCallback(async () => {
		if (!token || !/^\d{4}-\d{2}$/.test(periodo)) return;
		setError(null);
		try {
			const r = await panelFetch<{ data: EmpleadoPanel[] }>(`/sueldos?periodo=${periodo}`, token);
			setEmpleados(r.data);
		} catch (err) {
			setError((err as Error).message);
			setEmpleados([]);
		}
		setMarcados(new Set());
	}, [token, periodo]);

	useEffect(() => {
		setEmpleados(null);
		cargar();
	}, [cargar]);

	const filas: Fila[] = useMemo(
		() =>
			(empleados ?? [])
				.filter((e) => conRepresentantes || e.segmento === "INTERNO")
				.map((e) => ({ e, pago: resumenPago(e.recibos) })),
		[empleados, conRepresentantes],
	);

	const totales = useMemo(() => {
		const pagado = filas.reduce((acc, f) => acc + f.pago.montoPagado, 0);
		const falta = filas.reduce((acc, f) => acc + f.pago.montoPendiente, 0);
		const sinRecibo = filas.filter((f) => f.pago.estado === "SIN_RECIBO").length;
		return { pagado, falta, total: pagado + falta, sinRecibo };
	}, [filas]);

	const seleccion = filas.filter((f) => marcados.has(f.e.userId));
	const paraGenerar = seleccion.filter((f) => f.pago.estado === "SIN_RECIBO").map((f) => f.e);
	const paraPagar = seleccion.filter((f) => f.pago.estado === "PENDIENTE");
	const todosMarcados = filas.length > 0 && filas.every((f) => marcados.has(f.e.userId));

	const marcar = (userId: number, si: boolean) =>
		setMarcados((prev) => {
			const next = new Set(prev);
			if (si) next.add(userId);
			else next.delete(userId);
			return next;
		});

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div className="flex flex-wrap items-end gap-4">
					<div className="space-y-1">
						<Label htmlFor="panel-periodo" className="text-xs text-muted-foreground">
							Mes
						</Label>
						<Input
							id="panel-periodo"
							type="month"
							value={periodo}
							onChange={(e) => e.target.value && setPeriodo(e.target.value)}
							className="w-44"
						/>
					</div>
					<label htmlFor="panel-representantes" className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
						<Switch
							id="panel-representantes"
							checked={conRepresentantes}
							onCheckedChange={setConRepresentantes}
						/>
						Mostrar representantes
					</label>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" disabled={!paraGenerar.length} onClick={() => setGenerar(paraGenerar)}>
						<FilePlus2 className="mr-2 h-4 w-4" />
						Generar recibos{paraGenerar.length ? ` (${paraGenerar.length})` : ""}
					</Button>
					<Button disabled={!paraPagar.length} onClick={() => setPagar(paraPagar)}>
						<Wallet className="mr-2 h-4 w-4" />
						Pagar{paraPagar.length ? ` (${paraPagar.length})` : ""}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Total titulo="A pagar en el mes" valor={formatARS(totales.total)} />
				<Total titulo="Pagado" valor={formatARS(totales.pagado)} tono="text-green-700 dark:text-green-400" />
				<Total titulo="Falta pagar" valor={formatARS(totales.falta)} tono="text-amber-700 dark:text-amber-400" />
				<Total titulo="Sin recibo" valor={`${totales.sinRecibo} ${totales.sinRecibo === 1 ? "persona" : "personas"}`} />
			</div>

			<p className="text-xs text-muted-foreground">
				Marcá a quienes no tienen recibo para generarlos (se copian del mes anterior y los revisás antes de
				guardar), o a quienes tienen pagos pendientes para pagarlos todos juntos desde una caja.
			</p>

			<div className="overflow-x-auto rounded-lg border border-border bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-left text-xs text-muted-foreground">
						<tr>
							<th className="w-10 px-3 py-2">
								<Checkbox
									aria-label="Marcar todos"
									checked={todosMarcados}
									onCheckedChange={(v) =>
										setMarcados(v === true ? new Set(filas.map((f) => f.e.userId)) : new Set())
									}
								/>
							</th>
							<th className="px-3 py-2 font-medium">Persona</th>
							<th className="px-3 py-2 text-right font-medium">Sueldo base</th>
							<th className="px-3 py-2 text-right font-medium">Neto del recibo</th>
							<th className="px-3 py-2 font-medium">Pago</th>
							<th className="px-3 py-2" />
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{empleados === null ? (
							Array.from({ length: 5 }).map((_, i) => (
								<tr key={i}>
									<td colSpan={6} className="px-3 py-2">
										<Skeleton className="h-8 w-full" />
									</td>
								</tr>
							))
						) : error ? (
							<tr>
								<td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
									{error}
								</td>
							</tr>
						) : filas.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
									No hay personas con ficha laboral activa.
								</td>
							</tr>
						) : (
							filas.map(({ e, pago }) => {
								const estado = ESTADO[pago.estado];
								const neto = e.recibos.reduce((acc, r) => acc + (Number(r.netAmount) || 0), 0);
								return (
									<tr key={e.userId} className={marcados.has(e.userId) ? "bg-primary/5" : undefined}>
										<td className="px-3 py-2">
											<Checkbox
												aria-label={`Marcar a ${e.name}`}
												checked={marcados.has(e.userId)}
												onCheckedChange={(v) => marcar(e.userId, v === true)}
											/>
										</td>
										<td className="px-3 py-2">
											<Link
												href={`/admin/rrhh/${e.userId}?section=payrolls`}
												className="font-medium text-foreground hover:underline"
											>
												{e.name}
											</Link>
											<p className="text-xs text-muted-foreground">
												{[e.position, e.area].filter(Boolean).join(" · ") || "—"}
											</p>
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{e.sueldoBase ? formatARS(Number(e.sueldoBase)) : "—"}
										</td>
										<td className="px-3 py-2 text-right tabular-nums">
											{e.recibos.length ? formatARS(neto) : "—"}
										</td>
										<td className="px-3 py-2">
											<Badge
												className={estado.className}
												title={
													pago.estado === "SIN_PAGO"
														? "El recibo no tiene conceptos: su pago no pasa por Gastos e Ingresos"
														: undefined
												}
											>
												{estado.label}
												{pago.estado === "PENDIENTE" && ` · ${formatARS(pago.montoPendiente)}`}
											</Badge>
										</td>
										<td className="px-3 py-2 text-right">
											{e.recibos.length > 0 && (
												<Button
													variant="ghost"
													size="sm"
													className="gap-1.5"
													onClick={() => setRecibo(e.recibos[0].id)}
												>
													<Eye className="h-3.5 w-3.5" />
													Recibo
												</Button>
											)}
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			<GenerarRecibosDialog
				empleados={generar}
				periodo={periodo}
				onClose={() => setGenerar(null)}
				onDone={() => {
					setGenerar(null);
					cargar();
				}}
			/>
			<PagarSueldosDialog
				filas={pagar}
				periodo={periodo}
				onClose={() => setPagar(null)}
				onDone={() => {
					setPagar(null);
					cargar();
				}}
			/>
			<ReciboPreviewDialog payrollId={recibo} periodo={formatPeriodo(periodo)} onClose={() => setRecibo(null)} />
		</div>
	);
}

function Total({ titulo, valor, tono }: { titulo: string; valor: string; tono?: string }) {
	return (
		<div className="rounded-lg border border-border bg-card p-3">
			<p className="text-xs text-muted-foreground">{titulo}</p>
			<p className={`mt-1 text-lg font-semibold tabular-nums ${tono ?? "text-foreground"}`}>{valor}</p>
		</div>
	);
}
