"use client";

import {
	ArrowLeftRight,
	Ban,
	DollarSign,
	FileDown,
	FileSpreadsheet,
	Loader2,
	Pencil,
	ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { exportarExcel, exportarPdf } from "@/lib/exportar";
import { cn } from "@/lib/utils";
import type { Caja, CajaMovimiento, CajaMovimientosResponse } from "@/types/caja";
import {
	cajaFetch,
	esCambio,
	esCompraDeDolares,
	formatARS,
	formatFecha,
	formatMonto,
	formatUSD,
	traerTodosLosMovimientos,
} from "./api";
import { tablaMovimientos } from "./informes";
import MovimientoDialog from "./MovimientoDialog";

interface MovimientosPanelProps {
	token: string | undefined;
	/** undefined = todas las cajas visibles. */
	cajaId?: number;
	titulo: string;
	/** Muestra la columna Caja (vista de contenedora o de todas). */
	mostrarCaja: boolean;
	esAdmin: boolean;
	/** Cajas a las que se puede pasar un movimiento al editarlo (ver `cajasOperables`). */
	cajas: { caja: Caja; label: string }[];
	/** Cambiarlo fuerza a recargar (después de cargar/editar/anular algo). */
	version: number;
	onChanged: () => void;
	limit?: number;
	/** Período elegido arriba (mes o año): la lista arranca filtrada por él. */
	rango?: { desde: string; hasta: string };
	/** Para el nombre del informe ("septiembre 2026", "año 2026"). */
	periodoLabel?: string;
}

/** En un ingreso o egreso en dólares, a cuánto se tomó el dólar. */
function ValorDelDolar({ movimiento: m }: { movimiento: CajaMovimiento }) {
	if (m.moneda !== "USD" || !m.cotizacion || m.transferenciaId) return null;
	return (
		<span className="block text-[11px] font-normal text-muted-foreground">
			a {formatARS(m.cotizacion)}
		</span>
	);
}

function AnularDialog({
	movimiento,
	onClose,
	token,
	onDone,
}: {
	movimiento: CajaMovimiento | null;
	onClose: () => void;
	token: string | undefined;
	onDone: () => void;
}) {
	const [motivo, setMotivo] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => setMotivo(""), [movimiento]);

	const anular = async () => {
		if (!movimiento || !motivo.trim()) {
			toast.error("Indicá el motivo");
			return;
		}
		setSaving(true);
		try {
			const res = await cajaFetch<{ message: string }>(
				`/movimientos/${movimiento.id}/anular`,
				token,
				{ method: "PATCH", json: { motivo } },
			);
			toast.success(res.message);
			onClose();
			onDone();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={!!movimiento} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Anular movimiento</DialogTitle>
					<DialogDescription>
						{movimiento && esCambio(movimiento)
							? "Es una compra o venta de dólares: se anulan las dos puntas (los pesos y los dólares)."
							: movimiento?.transferenciaId
								? "Es una transferencia: se anulan las dos puntas."
								: movimiento?.closingId
									? "Es el cobro de un cierre: el cierre vuelve a Parcial o Pendiente y su fila de Gastos e Ingresos, a pendiente."
									: movimiento?.scheduledTransactionId
										? "Paga una fila de Gastos e Ingresos: la fila vuelve a pendiente."
										: "El movimiento queda en el historial marcado como anulado y deja de sumar al saldo."}
					</DialogDescription>
				</DialogHeader>
				{movimiento && (
					<p className="text-sm">
						{formatFecha(movimiento.fecha)} · {movimiento.caja.nombre} ·{" "}
						<span className="font-medium tabular-nums">
							{formatMonto(movimiento.monto, movimiento.moneda)}
						</span>
					</p>
				)}
				<div className="space-y-2">
					<Label htmlFor="motivo-anulacion">Motivo</Label>
					<Textarea
						id="motivo-anulacion"
						rows={3}
						value={motivo}
						onChange={(e) => setMotivo(e.target.value)}
						placeholder="Ej.: cargado dos veces"
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={saving}>
						Cancelar
					</Button>
					<Button variant="destructive" onClick={anular} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Anular
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default function MovimientosPanel({
	token,
	cajaId,
	titulo,
	mostrarCaja,
	esAdmin,
	cajas,
	version,
	onChanged,
	limit = 25,
	rango,
	periodoLabel,
}: MovimientosPanelProps) {
	const [desde, setDesde] = useState(rango?.desde ?? "");
	const [hasta, setHasta] = useState(rango?.hasta ?? "");
	const [exportando, setExportando] = useState<"xlsx" | "pdf" | null>(null);

	// Al cambiar el período de arriba, la lista lo sigue (se puede ajustar a mano).
	const rangoDesde = rango?.desde;
	const rangoHasta = rango?.hasta;
	useEffect(() => {
		if (rangoDesde === undefined || rangoHasta === undefined) return;
		setDesde(rangoDesde);
		setHasta(rangoHasta);
	}, [rangoDesde, rangoHasta]);
	const [tipo, setTipo] = useState("todos");
	const [moneda, setMoneda] = useState("todas");
	const [incluirAnulados, setIncluirAnulados] = useState(false);
	const [page, setPage] = useState(1);
	const [data, setData] = useState<CajaMovimientosResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [aAnular, setAAnular] = useState<CajaMovimiento | null>(null);
	// El movimiento queda seteado al cerrar para que el diálogo no cambie de
	// contenido durante la animación de salida.
	const [aEditar, setAEditar] = useState<CajaMovimiento | null>(null);
	const [editOpen, setEditOpen] = useState(false);

	// Al cambiar de caja o de filtros, volver a la primera página.
	useEffect(() => setPage(1), [cajaId, desde, hasta, tipo, moneda, incluirAnulados]);

	const cargar = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		const params = new URLSearchParams({ page: String(page), limit: String(limit) });
		if (cajaId) params.set("cajaId", String(cajaId));
		if (desde) params.set("desde", desde);
		if (hasta) params.set("hasta", hasta);
		if (tipo !== "todos") params.set("tipo", tipo);
		if (moneda !== "todas") params.set("moneda", moneda);
		if (incluirAnulados) params.set("incluirAnulados", "true");
		try {
			setData(await cajaFetch<CajaMovimientosResponse>(`/movimientos?${params}`, token));
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setLoading(false);
		}
	}, [token, cajaId, desde, hasta, tipo, moneda, incluirAnulados, page, limit]);

	useEffect(() => {
		cargar();
	}, [cargar, version]);

	// Informe con los mismos filtros de la lista (todas las páginas).
	const exportar = async (formato: "xlsx" | "pdf") => {
		setExportando(formato);
		try {
			const params = new URLSearchParams();
			if (cajaId) params.set("cajaId", String(cajaId));
			if (desde) params.set("desde", desde);
			if (hasta) params.set("hasta", hasta);
			if (tipo !== "todos") params.set("tipo", tipo);
			if (moneda !== "todas") params.set("moneda", moneda);
			if (incluirAnulados) params.set("incluirAnulados", "true");
			const { data: movs, totales } = await traerTodosLosMovimientos(token, params);

			const tabla = tablaMovimientos(movs, totales, !!mostrarCaja);
			const rangoTexto =
				desde || hasta
					? `${desde ? formatFecha(desde) : "inicio"} al ${hasta ? formatFecha(hasta) : "hoy"}`
					: "todo el historial";
			const archivo = `${titulo.replace("Movimientos · ", "")} ${periodoLabel ?? rangoTexto}`;
			if (formato === "xlsx") await exportarExcel(archivo, [tabla]);
			else
				await exportarPdf(archivo, {
					titulo,
					subtitulo: `${rangoTexto} · Neto ${formatARS(totales.ingresos - totales.egresos)}${
						totales.ingresosUsd || totales.egresosUsd
							? ` · Neto en dólares ${formatUSD(totales.ingresosUsd - totales.egresosUsd)}`
							: ""
					}`,
					tablas: [tabla],
					horizontal: true,
				});
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setExportando(null);
		}
	};

	const columnas = 6 + (mostrarCaja ? 1 : 0) + (esAdmin ? 1 : 0);
	const pagination = data?.pagination;

	return (
		<Card>
			<CardHeader className="gap-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<CardTitle className="text-base">{titulo}</CardTitle>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => exportar("xlsx")}
							disabled={!!exportando || !data?.data.length}
						>
							{exportando === "xlsx" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<FileSpreadsheet className="mr-2 h-4 w-4" />
							)}
							Excel
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => exportar("pdf")}
							disabled={!!exportando || !data?.data.length}
						>
							{exportando === "pdf" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<FileDown className="mr-2 h-4 w-4" />
							)}
							PDF
						</Button>
					</div>
				</div>
				<div className="flex flex-wrap items-end gap-3">
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">Desde</Label>
						<Input
							type="date"
							value={desde}
							onChange={(e) => setDesde(e.target.value)}
							className="h-9 w-40"
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">Hasta</Label>
						<Input
							type="date"
							value={hasta}
							onChange={(e) => setHasta(e.target.value)}
							className="h-9 w-40"
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">Tipo</Label>
						<Select value={tipo} onValueChange={setTipo}>
							<SelectTrigger className="h-9 w-36">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todos">Todos</SelectItem>
								<SelectItem value="INGRESO">Ingresos</SelectItem>
								<SelectItem value="EGRESO">Egresos</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label className="text-xs text-muted-foreground">Moneda</Label>
						<Select value={moneda} onValueChange={setMoneda}>
							<SelectTrigger className="h-9 w-32">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="todas">Todas</SelectItem>
								<SelectItem value="ARS">Pesos</SelectItem>
								<SelectItem value="USD">Dólares</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<Label className="flex h-9 items-center gap-2 text-sm font-normal">
						<Checkbox
							checked={incluirAnulados}
							onCheckedChange={(v) => setIncluirAnulados(v === true)}
						/>
						Ver anulados
					</Label>
					{(desde || hasta || tipo !== "todos" || moneda !== "todas") && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								setDesde("");
								setHasta("");
								setTipo("todos");
								setMoneda("todas");
							}}
						>
							Limpiar
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<Table>
					<TableHeader className="bg-muted/50">
						<TableRow>
							<TableHead>Fecha</TableHead>
							{mostrarCaja && <TableHead>Caja</TableHead>}
							<TableHead>Rubro</TableHead>
							<TableHead>Descripción</TableHead>
							<TableHead>Cargado por</TableHead>
							<TableHead className="text-right">Ingreso</TableHead>
							<TableHead className="text-right">Egreso</TableHead>
							{esAdmin && <TableHead className="w-20" />}
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading && !data ? (
							Array.from({ length: 4 }, (_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={columnas}>
										<Skeleton className="h-5 w-full" />
									</TableCell>
								</TableRow>
							))
						) : data?.data.length ? (
							data.data.map((m) => (
								<TableRow key={m.id} className={cn((m.anulado || m.informativo) && "opacity-50")}>
									<TableCell className="whitespace-nowrap tabular-nums">
										{formatFecha(m.fecha)}
									</TableCell>
									{mostrarCaja && (
										<TableCell className="whitespace-nowrap">{m.caja.nombre}</TableCell>
									)}
									<TableCell>
										{esCambio(m) ? (
											<Badge variant="secondary" className="gap-1">
												<DollarSign className="h-3 w-3" />
												{esCompraDeDolares(m) ? "Compra de dólares" : "Venta de dólares"}
											</Badge>
										) : m.transferenciaId ? (
											<Badge variant="secondary" className="gap-1">
												<ArrowLeftRight className="h-3 w-3" />
												{m.tipo === "EGRESO" ? "A" : "Desde"}{" "}
												{m.cajaContraparte?.nombre ?? "otra caja"}
											</Badge>
										) : (
											<span>
												{m.rubro?.nombre ?? "—"}
												{m.subRubro && (
													<span className="text-muted-foreground"> › {m.subRubro.nombre}</span>
												)}
											</span>
										)}
									</TableCell>
									<TableCell className="max-w-72">
										<span className={cn("line-clamp-2", m.anulado && "line-through")}>
											{m.descripcion || "—"}
										</span>
										{m.caseExpense && (
											<span className="mt-1 flex flex-wrap items-center gap-1">
												<Link
													href={`/admin/legal-cases/${m.caseExpense.caseId}?tab=gastos`}
													className="text-xs text-primary hover:underline"
												>
													Gasto de causa
												</Link>
												{m.informativo && (
													<Badge variant="outline" className="text-[10px]">
														Réplica: no suma al saldo
													</Badge>
												)}
											</span>
										)}
										{m.closing && (
											<Link
												href={`/admin/closing-manager?openId=${m.closing.id}`}
												className="mt-1 block text-xs text-primary hover:underline"
											>
												Cobro de cierre ({m.closingConcepto === "pcl" ? "PCL" : "HP"}) ·{" "}
												{m.closing.case?.title ?? `Causa #${m.closing.caseId}`}
											</Link>
										)}
										{!m.closing && m.scheduledTransaction && (
											<Link
												href="/admin/accounting"
												className="mt-1 block text-xs text-primary hover:underline"
											>
												{m.scheduledTransaction.type === "income" ? "Cobro" : "Pago"} de Gastos e
												Ingresos
											</Link>
										)}
										{m.anulado && (
											<span className="block text-xs text-red-600">
												Anulado por {m.anuladoBy?.name ?? "—"}: {m.motivoAnulacion}
											</span>
										)}
									</TableCell>
									<TableCell className="whitespace-nowrap text-muted-foreground">
										{m.createdBy.name}
									</TableCell>
									<TableCell className="whitespace-nowrap text-right tabular-nums text-emerald-600">
										{m.tipo === "INGRESO" ? formatMonto(m.monto, m.moneda) : ""}
										{m.tipo === "INGRESO" && <ValorDelDolar movimiento={m} />}
									</TableCell>
									<TableCell className="whitespace-nowrap text-right tabular-nums text-red-600">
										{m.tipo === "EGRESO" ? formatMonto(m.monto, m.moneda) : ""}
										{m.tipo === "EGRESO" && <ValorDelDolar movimiento={m} />}
									</TableCell>
									{esAdmin && (
										<TableCell>
											{/* Los gastos de causa se editan y anulan desde el caso. */}
											{!m.anulado && !m.caseExpenseId && (
												<div className="flex justify-end">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-muted-foreground hover:text-foreground"
														title="Editar"
														onClick={() => {
															setAEditar(m);
															setEditOpen(true);
														}}
													>
														<Pencil className="h-4 w-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 text-muted-foreground hover:text-red-600"
														title="Anular"
														onClick={() => setAAnular(m)}
													>
														<Ban className="h-4 w-4" />
													</Button>
												</div>
											)}
										</TableCell>
									)}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columnas} className="py-10 text-center text-muted-foreground">
									<ReceiptText className="mx-auto mb-2 h-8 w-8 opacity-40" />
									No hay movimientos para mostrar
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>

				{data && (
					<div className="flex flex-wrap items-center justify-between gap-3 text-sm">
						<p className="text-muted-foreground">
							Total filtrado:{" "}
							<span className="text-emerald-600 tabular-nums">
								+{formatARS(data.totales.ingresos)}
							</span>{" "}
							<span className="text-red-600 tabular-nums">−{formatARS(data.totales.egresos)}</span>
							{(data.totales.ingresosUsd > 0 || data.totales.egresosUsd > 0) && (
								<>
									{" · en dólares: "}
									<span className="text-emerald-600 tabular-nums">
										+{formatUSD(data.totales.ingresosUsd)}
									</span>{" "}
									<span className="text-red-600 tabular-nums">
										−{formatUSD(data.totales.egresosUsd)}
									</span>
								</>
							)}
						</p>
						{pagination && pagination.totalPages > 1 && (
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page <= 1 || loading}
									onClick={() => setPage((p) => p - 1)}
								>
									Anterior
								</Button>
								<span className="tabular-nums text-muted-foreground">
									{page} / {pagination.totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page >= pagination.totalPages || loading}
									onClick={() => setPage((p) => p + 1)}
								>
									Siguiente
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>

			<AnularDialog
				movimiento={aAnular}
				onClose={() => setAAnular(null)}
				token={token}
				onDone={onChanged}
			/>
			{esAdmin && (
				<MovimientoDialog
					open={editOpen}
					onOpenChange={setEditOpen}
					token={token}
					cajas={cajas}
					movimiento={aEditar}
					onSaved={onChanged}
				/>
			)}
		</Card>
	);
}
