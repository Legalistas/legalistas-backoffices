"use client";

import {
	Ban,
	ChevronDown,
	ChevronRight,
	CreditCard,
	FileDown,
	FileSpreadsheet,
	Loader2,
	Pencil,
	Plus,
	ShoppingCart,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { exportarExcel, exportarPdf, type TablaInforme } from "@/lib/exportar";
import { cn } from "@/lib/utils";
import type { Tarjeta, TarjetaCompra, TarjetaDetalle, TarjetaResumen } from "@/types/caja";
import { cajaFetch, formatARS, formatFecha } from "./api";
import { nombreResumen } from "./cuotas";
import NuevaCompraDialog from "./NuevaCompraDialog";
import PagarResumenDialog from "./PagarResumenDialog";
import TarjetaEditDialog from "./TarjetaEditDialog";

// Caja → Tarjetas: compras en cuotas y sus resúmenes. Las cuotas se proyectan
// en Gastos e Ingresos (un resumen por mes) y se marcan pagas al pagar el
// resumen desde una caja. Es el "registro informativo" de cada tarjeta.

const estadoResumen = (r: TarjetaResumen) =>
	r.pendiente === 0
		? { texto: "Pagado", clase: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
		: r.pagado > 0
			? { texto: "Pago parcial", clase: "bg-amber-50 text-amber-700 ring-amber-200" }
			: { texto: "A pagar", clase: "bg-sky-50 text-sky-700 ring-sky-200" };

function AnularCompraDialog({
	compra,
	token,
	onClose,
	onDone,
}: {
	compra: TarjetaCompra | null;
	token: string | undefined;
	onClose: () => void;
	onDone: () => void;
}) {
	const [motivo, setMotivo] = useState("");
	const [saving, setSaving] = useState(false);
	useEffect(() => setMotivo(""), [compra]);

	const anular = async () => {
		if (!compra || !motivo.trim()) return toast.error("Indicá el motivo");
		setSaving(true);
		try {
			const res = await cajaFetch<{ message: string }>(
				`/tarjetas/compras/${compra.id}/anular`,
				token,
				{
					method: "PATCH",
					json: { motivo },
				},
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
		<Dialog open={!!compra} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Anular compra</DialogTitle>
					<DialogDescription>
						Sus cuotas salen de los resúmenes y de Gastos e Ingresos. Queda en el historial como
						anulada.
					</DialogDescription>
				</DialogHeader>
				{compra && (
					<p className="text-sm">
						{formatFecha(compra.fecha)} · {compra.descripcion} ·{" "}
						<span className="font-medium tabular-nums">{formatARS(compra.montoTotal)}</span>
					</p>
				)}
				<div className="space-y-2">
					<Label htmlFor="motivo-compra">Motivo</Label>
					<Textarea
						id="motivo-compra"
						rows={3}
						value={motivo}
						onChange={(e) => setMotivo(e.target.value)}
						placeholder="Ej.: se devolvió el producto"
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

export default function TarjetasPanel({
	token,
	version,
	onChanged,
}: {
	token: string | undefined;
	version: number;
	onChanged: () => void;
}) {
	const [tarjetas, setTarjetas] = useState<Tarjeta[] | null>(null);
	const [seleccionada, setSeleccionada] = useState<number | null>(null);
	const [detalle, setDetalle] = useState<TarjetaDetalle | null>(null);
	const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
	const [compraOpen, setCompraOpen] = useState(false);
	const [editOpen, setEditOpen] = useState(false);
	const [editando, setEditando] = useState<Tarjeta | null>(null);
	const [pagando, setPagando] = useState<{ tarjetaId: number; periodo: string } | null>(null);
	const [anulando, setAnulando] = useState<TarjetaCompra | null>(null);
	const [exportando, setExportando] = useState<"xlsx" | "pdf" | null>(null);
	const [interno, setInterno] = useState(0);

	const cargar = useCallback(async () => {
		if (!token) return;
		try {
			const res = await cajaFetch<{ data: Tarjeta[] }>("/tarjetas", token);
			setTarjetas(res.data);
			setSeleccionada((s) => s ?? res.data.find((t) => t.activa)?.id ?? res.data[0]?.id ?? null);
		} catch (e) {
			toast.error((e as Error).message);
		}
	}, [token]);

	useEffect(() => {
		cargar();
	}, [cargar, version, interno]);

	useEffect(() => {
		if (!token || !seleccionada) return;
		setDetalle(null);
		cajaFetch<{ data: TarjetaDetalle }>(`/tarjetas/${seleccionada}`, token)
			.then((r) => setDetalle(r.data))
			.catch((e) => toast.error((e as Error).message));
	}, [token, seleccionada, version, interno]);

	const refrescar = () => {
		setInterno((v) => v + 1);
		onChanged();
	};

	const exportar = async (formato: "xlsx" | "pdf") => {
		if (!detalle) return;
		setExportando(formato);
		try {
			const tablas: TablaInforme[] = [
				{
					titulo: "Resúmenes",
					columnas: ["Resumen", "Vence", "Cuotas", "Total", "Pagado", "A pagar", "Pagado desde"],
					filas: detalle.resumenes.map((r) => [
						nombreResumen(r.periodo),
						formatFecha(r.vencimiento),
						r.cuotas.length,
						r.total,
						r.pagado,
						r.pendiente,
						r.pagos.map((p) => `${p.caja} (${formatFecha(p.fecha)})`).join(", "),
					]),
					montos: [3, 4, 5],
				},
				{
					titulo: "Cuotas",
					columnas: ["Resumen", "Compra", "Cuota", "Monto", "Estado"],
					filas: detalle.resumenes.flatMap((r) =>
						r.cuotas.map((c) => [
							nombreResumen(r.periodo),
							c.descripcion,
							`${c.numero}/${c.de}`,
							c.monto,
							c.estado === "PAGADA" ? "Pagada" : "Pendiente",
						]),
					),
					montos: [3],
				},
				{
					titulo: "Compras",
					columnas: [
						"Fecha",
						"Qué",
						"Rubro",
						"Total",
						"Cuotas",
						"Pagadas",
						"1er resumen",
						"Estado",
					],
					filas: detalle.compras.map((c) => [
						formatFecha(c.fecha),
						c.descripcion,
						[c.rubro?.nombre, c.subRubro?.nombre].filter(Boolean).join(" › "),
						c.montoTotal,
						c.cuotas,
						c.cuotasPagadas,
						c.primerPeriodo ? nombreResumen(c.primerPeriodo) : "",
						c.anulada ? `Anulada: ${c.motivoAnulacion ?? ""}` : "Vigente",
					]),
					montos: [3],
				},
			];
			const archivo = `Tarjeta ${detalle.tarjeta.nombre}`;
			if (formato === "xlsx") await exportarExcel(archivo, tablas);
			else
				await exportarPdf(archivo, {
					titulo: `Tarjeta ${detalle.tarjeta.nombre}`,
					subtitulo: `Cierre día ${detalle.tarjeta.diaCierre ?? "—"} · vencimiento día ${detalle.tarjeta.diaVencimiento ?? "—"}`,
					tablas,
					horizontal: true,
				});
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setExportando(null);
		}
	};

	if (!tarjetas) return <Skeleton className="h-64 w-full" />;

	const alternar = (periodo: string) =>
		setAbiertos((prev) => {
			const next = new Set(prev);
			if (next.has(periodo)) next.delete(periodo);
			else next.add(periodo);
			return next;
		});

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					Las compras en cuotas se proyectan mes a mes en Gastos e Ingresos. Al pagar el resumen
					desde una caja, sus cuotas quedan pagas.
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => {
							setEditando(null);
							setEditOpen(true);
						}}
					>
						<Plus className="mr-2 h-4 w-4" />
						Nueva tarjeta
					</Button>
					<Button onClick={() => setCompraOpen(true)} disabled={!tarjetas.some((t) => t.activa)}>
						<ShoppingCart className="mr-2 h-4 w-4" />
						Nueva compra
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				{tarjetas.map((t) => (
					<div
						key={t.id}
						className={cn(
							"relative rounded-xl border bg-card transition-colors hover:bg-muted/40",
							seleccionada === t.id && "border-primary ring-1 ring-primary",
							!t.activa && "opacity-60",
						)}
					>
						{/* Editar va aparte (no se anidan botones): arriba a la derecha de la tarjeta. */}
						<button
							type="button"
							title="Editar tarjeta"
							aria-label={`Editar ${t.nombre}`}
							className="absolute top-3 right-3 z-10 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
							onClick={() => {
								setEditando(t);
								setEditOpen(true);
							}}
						>
							<Pencil className="h-3.5 w-3.5" />
						</button>
						<button
							type="button"
							onClick={() => setSeleccionada(t.id)}
							className="block w-full p-4 pr-10 text-left"
						>
							<span className="flex items-center gap-2 font-medium">
								<CreditCard className="h-4 w-4 text-muted-foreground" />
								{t.nombre}
							</span>
							<p className="mt-1 text-xs text-muted-foreground">
								{t.diaCierre ? `Cierra el ${t.diaCierre}` : "Sin día de cierre"}
								{t.diaVencimiento ? ` · vence el ${t.diaVencimiento}` : ""}
								{!t.activa && " · inactiva"}
							</p>
							{t.proximoResumen ? (
								<div className="mt-3">
									<p className="text-xs text-muted-foreground">
										Próximo resumen ({nombreResumen(t.proximoResumen.periodo)}) · vence{" "}
										{formatFecha(t.proximoResumen.vencimiento)}
									</p>
									<p className="text-lg font-semibold tabular-nums">
										{formatARS(t.proximoResumen.total)}
									</p>
								</div>
							) : (
								<p className="mt-3 text-sm text-muted-foreground">Sin cuotas pendientes</p>
							)}
							{t.pendienteTotal > 0 && (
								<p className="mt-1 text-xs text-muted-foreground">
									Total a pagar: <span className="tabular-nums">{formatARS(t.pendienteTotal)}</span>{" "}
									({t.cuotasPendientes} cuota{t.cuotasPendientes === 1 ? "" : "s"})
								</p>
							)}
						</button>
					</div>
				))}
			</div>

			{seleccionada && (
				<Card>
					<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
						<div>
							<CardTitle className="text-base">{detalle?.tarjeta.nombre ?? "Tarjeta"}</CardTitle>
							<CardDescription>Resúmenes mes a mes y compras con sus cuotas.</CardDescription>
						</div>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => exportar("xlsx")}
								disabled={!detalle || !!exportando}
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
								disabled={!detalle || !!exportando}
							>
								{exportando === "pdf" ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<FileDown className="mr-2 h-4 w-4" />
								)}
								PDF
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{!detalle ? (
							<Skeleton className="h-40 w-full" />
						) : (
							<Tabs defaultValue="resumenes">
								<TabsList>
									<TabsTrigger value="resumenes">Resúmenes</TabsTrigger>
									<TabsTrigger value="compras">Compras ({detalle.compras.length})</TabsTrigger>
								</TabsList>

								<TabsContent value="resumenes" className="mt-4">
									<Table>
										<TableHeader className="bg-muted/50">
											<TableRow>
												<TableHead className="w-8" />
												<TableHead>Resumen</TableHead>
												<TableHead>Vence</TableHead>
												<TableHead className="text-right">Total</TableHead>
												<TableHead>Estado</TableHead>
												<TableHead>Pagado desde</TableHead>
												<TableHead className="w-28" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{detalle.resumenes.length === 0 ? (
												<TableRow>
													<TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
														Todavía no hay compras en esta tarjeta.
													</TableCell>
												</TableRow>
											) : (
												detalle.resumenes.map((r) => {
													const estado = estadoResumen(r);
													const abierto = abiertos.has(r.periodo);
													return (
														<Fragment key={r.periodo}>
															<TableRow
																className="cursor-pointer"
																onClick={() => alternar(r.periodo)}
															>
																<TableCell>
																	{abierto ? (
																		<ChevronDown className="h-4 w-4" />
																	) : (
																		<ChevronRight className="h-4 w-4" />
																	)}
																</TableCell>
																<TableCell>
																	{nombreResumen(r.periodo)}
																	<span className="ml-2 text-xs text-muted-foreground normal-case">
																		{r.cuotas.length} cuota{r.cuotas.length === 1 ? "" : "s"}
																	</span>
																</TableCell>
																<TableCell className="tabular-nums">
																	{formatFecha(r.vencimiento)}
																</TableCell>
																<TableCell className="text-right font-medium tabular-nums">
																	{formatARS(r.total)}
																</TableCell>
																<TableCell>
																	<span
																		className={cn(
																			"rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
																			estado.clase,
																		)}
																	>
																		{estado.texto}
																	</span>
																</TableCell>
																<TableCell className="text-sm text-muted-foreground">
																	{r.pagos
																		.map((p) => `${p.caja} · ${formatFecha(p.fecha)}`)
																		.join(", ") || "—"}
																</TableCell>
																<TableCell className="text-right">
																	{r.pendiente > 0 && (
																		<Button
																			size="sm"
																			variant="outline"
																			onClick={(e) => {
																				e.stopPropagation();
																				setPagando({
																					tarjetaId: detalle.tarjeta.id,
																					periodo: r.periodo,
																				});
																			}}
																		>
																			Pagar
																		</Button>
																	)}
																</TableCell>
															</TableRow>
															{abierto &&
																r.cuotas.map((c) => (
																	<TableRow key={c.id} className="bg-muted/20 text-sm">
																		<TableCell />
																		<TableCell colSpan={2} className="pl-6">
																			{c.descripcion}
																			<span className="ml-2 text-xs text-muted-foreground">
																				{c.de === 1 ? "1 pago" : `cuota ${c.numero}/${c.de}`}
																			</span>
																		</TableCell>
																		<TableCell className="text-right tabular-nums">
																			{formatARS(c.monto)}
																		</TableCell>
																		<TableCell colSpan={3}>
																			<Badge
																				variant={c.estado === "PAGADA" ? "default" : "secondary"}
																			>
																				{c.estado === "PAGADA" ? "Pagada" : "Pendiente"}
																			</Badge>
																		</TableCell>
																	</TableRow>
																))}
														</Fragment>
													);
												})
											)}
										</TableBody>
									</Table>
								</TabsContent>

								<TabsContent value="compras" className="mt-4">
									<Table>
										<TableHeader className="bg-muted/50">
											<TableRow>
												<TableHead>Fecha</TableHead>
												<TableHead>Qué</TableHead>
												<TableHead>Rubro</TableHead>
												<TableHead className="text-right">Total</TableHead>
												<TableHead>Cuotas</TableHead>
												<TableHead>1er resumen</TableHead>
												<TableHead>Cargó</TableHead>
												<TableHead className="w-12" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{detalle.compras.length === 0 ? (
												<TableRow>
													<TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
														Todavía no hay compras en esta tarjeta.
													</TableCell>
												</TableRow>
											) : (
												detalle.compras.map((c) => (
													<TableRow key={c.id} className={cn(c.anulada && "opacity-50")}>
														<TableCell className="tabular-nums">{formatFecha(c.fecha)}</TableCell>
														<TableCell className="max-w-64">
															<span className={cn(c.anulada && "line-through")}>
																{c.descripcion}
															</span>
															{c.anulada && (
																<span className="block text-xs text-red-600">
																	Anulada por {c.anuladaBy?.name ?? "—"}: {c.motivoAnulacion}
																</span>
															)}
														</TableCell>
														<TableCell className="text-sm text-muted-foreground">
															{[c.rubro?.nombre, c.subRubro?.nombre].filter(Boolean).join(" › ") ||
																"—"}
														</TableCell>
														<TableCell className="text-right tabular-nums">
															{formatARS(c.montoTotal)}
														</TableCell>
														<TableCell className="text-sm">
															{c.cuotas === 1 ? "1 pago" : `${c.cuotasPagadas}/${c.cuotas} pagas`}
														</TableCell>
														<TableCell className="text-sm">
															{c.primerPeriodo ? nombreResumen(c.primerPeriodo) : "—"}
														</TableCell>
														<TableCell className="text-sm text-muted-foreground">
															{c.createdBy.name}
														</TableCell>
														<TableCell>
															{!c.anulada && c.cuotasPagadas === 0 && (
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-8 w-8 text-muted-foreground hover:text-red-600"
																	title="Anular compra"
																	onClick={() => setAnulando(c)}
																>
																	<Ban className="h-4 w-4" />
																</Button>
															)}
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</TabsContent>
							</Tabs>
						)}
					</CardContent>
				</Card>
			)}

			<NuevaCompraDialog
				open={compraOpen}
				onOpenChange={setCompraOpen}
				token={token}
				tarjetas={tarjetas}
				tarjetaIdInicial={seleccionada}
				onSaved={refrescar}
			/>
			<TarjetaEditDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				token={token}
				tarjeta={editando}
				onSaved={refrescar}
			/>
			<PagarResumenDialog
				resumen={pagando}
				onClose={() => setPagando(null)}
				onPaid={() => {
					setPagando(null);
					refrescar();
				}}
			/>
			<AnularCompraDialog
				compra={anulando}
				token={token}
				onClose={() => setAnulando(null)}
				onDone={refrescar}
			/>
		</div>
	);
}
