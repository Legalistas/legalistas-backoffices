"use client";

import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { formatARS, formatFecha } from "@/components/caja/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CLOSINGS_ENDPOINT } from "@/constant/api-endpoints";
import { type Celda, exportarExcel, exportarPdf, type TablaInforme } from "@/lib/exportar";

// Representatives' liquidation (Jona, 06/11/2026): the "LIQUIDACION
// REPRESENTANTES 2026" workbook, built by the backend from the Gestor de
// Cierres (modules/closings/liquidacion.ts has the column rules).

interface Fila {
	closingId: number;
	concepto: "HP" | "CL";
	fecha: string;
	causa: string;
	tipo: string;
	capital: number;
	facturado: number;
	ingresos: number;
	aportes: { demandada: number; abogado: number; legalistas: number; subtotal: number };
	total: number;
	aCobrar: number;
}

interface Totales {
	capital: number;
	facturado: number;
	ingresos: number;
	demandada: number;
	abogado: number;
	legalistas: number;
	aportes: number;
	total: number;
	aCobrar: number;
}

interface Respuesta {
	year: number;
	representantes: { id: number; name: string; dueno: boolean }[];
	representante: { id: number; name: string; dueno: boolean } | null;
	liquidacion: {
		cobradas: Fila[];
		pendientes: Fila[];
		totales: { cobradas: Totales; pendientes: Totales; general: Totales };
		resumen: { mes: number; facturado: number; ingresos: number; causas: number; ticketPromedio: number; total: number }[];
		semestres: { ticketPromedio: number; mayorTicket: number }[];
	} | null;
}

const MESES = [
	"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
	"Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const COLUMNAS = [
	"Fecha", "Causa", "Tipo", "Capital", "Facturado", "Ingresos",
	"Ap. demandada", "Ap. abogado/a", "Ap. Legalistas", "Subtotal aportes", "Total", "A cobrar",
];
/** Columns with amounts in COLUMNAS (Excel/PDF format). */
const MONTOS = [3, 4, 5, 6, 7, 8, 9, 10, 11];

const valoresFila = (f: Fila): Celda[] => [
	formatFecha(f.fecha),
	`${f.causa} · ${f.concepto}`,
	f.tipo,
	f.capital,
	f.facturado,
	f.ingresos,
	f.aportes.demandada,
	f.aportes.abogado,
	f.aportes.legalistas,
	f.aportes.subtotal,
	f.total,
	f.aCobrar,
];
const valoresTotales = (t: Totales): Celda[] => [
	"Subtotales", "", "", t.capital, t.facturado, t.ingresos,
	t.demandada, t.abogado, t.legalistas, t.aportes, t.total, t.aCobrar,
];

function TablaFilas({ titulo, filas, totales }: { titulo: string; filas: Fila[]; totales: Totales }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">
					{titulo} <span className="font-normal text-muted-foreground">({filas.length})</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="overflow-x-auto">
				{filas.length === 0 ? (
					<p className="py-4 text-sm text-muted-foreground">Sin filas en este año.</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								{COLUMNAS.map((c, i) => (
									<TableHead key={c} className={i >= 3 ? "text-right" : undefined}>
										{c}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{filas.map((f) => (
								<TableRow key={`${f.closingId}-${f.concepto}`}>
									<TableCell className="tabular-nums">{formatFecha(f.fecha)}</TableCell>
									<TableCell className="max-w-64">
										<span className="truncate">{f.causa}</span>{" "}
										<Badge variant="outline" className="ml-1 text-[10px]">
											{f.concepto}
										</Badge>
									</TableCell>
									<TableCell>{f.tipo}</TableCell>
									{valoresFila(f)
										.slice(3)
										.map((v, i) => (
											<TableCell key={COLUMNAS[i + 3]} className="text-right tabular-nums">
												{formatARS(Number(v))}
											</TableCell>
										))}
								</TableRow>
							))}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell colSpan={3} className="font-semibold">
									Subtotales
								</TableCell>
								{valoresTotales(totales)
									.slice(3)
									.map((v, i) => (
										<TableCell key={COLUMNAS[i + 3]} className="text-right font-semibold tabular-nums">
											{formatARS(Number(v))}
										</TableCell>
									))}
							</TableRow>
						</TableFooter>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}

export default function LiquidacionRepresentantes() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const miId = Number(session?.user?.id) || null;
	const anioActual = new Date().getFullYear();
	const [year, setYear] = useState(anioActual);
	const [lawyerId, setLawyerId] = useState<number | null>(null);
	const [data, setData] = useState<Respuesta | null>(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [exportando, setExportando] = useState(false);

	const cargar = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		setError(null);
		try {
			const qs = new URLSearchParams({ year: String(year) });
			if (lawyerId) qs.set("lawyerId", String(lawyerId));
			const res = await fetch(`${CLOSINGS_ENDPOINT}/liquidacion-representantes?${qs}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
			const r = body as Respuesta;
			// Nobody chosen yet: oneself if one is a representative, else the first one.
			if (!r.representante && r.representantes.length) {
				setLawyerId(r.representantes.find((x) => x.id === miId)?.id ?? r.representantes[0].id);
				return;
			}
			setData(r);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setCargando(false);
		}
	}, [token, year, lawyerId, miId]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const liq = data?.liquidacion;
	const nombre = data?.representante?.name ?? "";

	const tablas = (): TablaInforme[] =>
		liq
			? [
					{
						titulo: "Cobradas",
						columnas: COLUMNAS,
						filas: liq.cobradas.map(valoresFila),
						totales: valoresTotales(liq.totales.cobradas),
						montos: MONTOS,
					},
					{
						titulo: "Pendientes de cobro",
						columnas: COLUMNAS,
						filas: liq.pendientes.map(valoresFila),
						totales: valoresTotales(liq.totales.pendientes),
						montos: MONTOS,
					},
					{
						titulo: "Resumen anual",
						columnas: ["Mes", "Facturado", "Ingresos", "N° causas", "Ticket promedio", "Total"],
						filas: liq.resumen.map((m) => [
							MESES[m.mes - 1],
							m.facturado,
							m.ingresos,
							m.causas,
							m.ticketPromedio,
							m.total,
						]),
						totales: [
							"Subtotales",
							liq.totales.general.facturado,
							liq.totales.general.ingresos,
							liq.resumen.reduce((s, m) => s + m.causas, 0),
							"",
							liq.totales.general.total,
						],
						montos: [1, 2, 4, 5],
					},
				]
			: [];

	const exportar = async (formato: "excel" | "pdf") => {
		setExportando(true);
		try {
			const archivo = `Liquidacion ${nombre} ${year}`;
			if (formato === "excel") await exportarExcel(archivo, tablas());
			else
				await exportarPdf(archivo, {
					titulo: `Liquidación · ${nombre}`,
					subtitulo: `Año ${year} · desde el Gestor de Cierres`,
					tablas: tablas(),
					horizontal: true,
					resumen: liq
						? [
								{ etiqueta: "Facturado", valor: formatARS(liq.totales.general.facturado) },
								{ etiqueta: "Ingresos", valor: formatARS(liq.totales.general.ingresos) },
								{ etiqueta: "Total", valor: formatARS(liq.totales.general.total) },
								{ etiqueta: "A cobrar", valor: formatARS(liq.totales.general.aCobrar) },
							]
						: [],
				});
		} catch {
			toast.error("No se pudo exportar");
		} finally {
			setExportando(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">Liquidación de representantes</h1>
					<p className="text-sm text-muted-foreground">
						Sale sola del Gestor de Cierres: honorarios (HP) y cuota litis (CL) de cada causa, cobrados y
						pendientes.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{(data?.representantes.length ?? 0) > 1 && (
						<Select value={lawyerId ? String(lawyerId) : undefined} onValueChange={(v) => setLawyerId(Number(v))}>
							<SelectTrigger className="w-64" aria-label="Representante">
								<SelectValue placeholder="Elegí un representante" />
							</SelectTrigger>
							<SelectContent>
								{data?.representantes.map((r) => (
									<SelectItem key={r.id} value={String(r.id)}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					<Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
						<SelectTrigger className="w-28" aria-label="Año">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{[anioActual, anioActual - 1, anioActual - 2].map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button variant="outline" size="sm" disabled={!liq || exportando} onClick={() => exportar("excel")}>
						<FileSpreadsheet className="mr-1.5 h-4 w-4" />
						Excel
					</Button>
					<Button variant="outline" size="sm" disabled={!liq || exportando} onClick={() => exportar("pdf")}>
						{exportando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
						PDF
					</Button>
				</div>
			</div>

			{error ? (
				<p className="rounded-md bg-muted p-4 text-sm">{error}</p>
			) : cargando || !liq ? (
				data && !data.representantes.length ? (
					<p className="rounded-md bg-muted p-4 text-sm">Todavía no hay cierres con un representante.</p>
				) : (
					<div className="space-y-3">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-64 w-full" />
					</div>
				)
			) : (
				<>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						{[
							{ label: "Facturado", value: liq.totales.general.facturado },
							{ label: "Ingresos", value: liq.totales.general.ingresos },
							{ label: "Total", value: liq.totales.general.total, hint: "Ingresos + aportes, como el Excel" },
							{ label: "A cobrar", value: liq.totales.general.aCobrar, hint: "Ingresos − aportes del abogado/a" },
						].map((c) => (
							<Card key={c.label}>
								<CardContent className="p-4">
									<p className="text-xs text-muted-foreground">{c.label}</p>
									<p className="text-xl font-semibold tabular-nums">{formatARS(c.value)}</p>
									{c.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{c.hint}</p>}
								</CardContent>
							</Card>
						))}
					</div>

					{data?.representante?.dueno && (
						<p className="text-xs text-muted-foreground">
							Como dueño, los Ingresos son el HP y la cuota litis completos.
						</p>
					)}

					<TablaFilas titulo="Cobradas" filas={liq.cobradas} totales={liq.totales.cobradas} />
					<TablaFilas titulo="Pendientes de cobro" filas={liq.pendientes} totales={liq.totales.pendientes} />

					<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-base">Resumen anual</CardTitle>
							</CardHeader>
							<CardContent className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Mes</TableHead>
											<TableHead className="text-right">Facturado</TableHead>
											<TableHead className="text-right">Ingresos</TableHead>
											<TableHead className="text-right">N° causas</TableHead>
											<TableHead className="text-right">Ticket promedio</TableHead>
											<TableHead className="text-right">Total</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{liq.resumen.map((m) => (
											<TableRow key={m.mes} className={m.causas === 0 ? "text-muted-foreground" : undefined}>
												<TableCell>{MESES[m.mes - 1]}</TableCell>
												<TableCell className="text-right tabular-nums">{formatARS(m.facturado)}</TableCell>
												<TableCell className="text-right tabular-nums">{formatARS(m.ingresos)}</TableCell>
												<TableCell className="text-right tabular-nums">{m.causas}</TableCell>
												<TableCell className="text-right tabular-nums">{formatARS(m.ticketPromedio)}</TableCell>
												<TableCell className="text-right tabular-nums">{formatARS(m.total)}</TableCell>
											</TableRow>
										))}
									</TableBody>
									<TableFooter>
										<TableRow>
											<TableCell className="font-semibold">Subtotales</TableCell>
											<TableCell className="text-right font-semibold tabular-nums">
												{formatARS(liq.totales.general.facturado)}
											</TableCell>
											<TableCell className="text-right font-semibold tabular-nums">
												{formatARS(liq.totales.general.ingresos)}
											</TableCell>
											<TableCell className="text-right font-semibold tabular-nums">
												{liq.resumen.reduce((s, m) => s + m.causas, 0)}
											</TableCell>
											<TableCell />
											<TableCell className="text-right font-semibold tabular-nums">
												{formatARS(liq.totales.general.total)}
											</TableCell>
										</TableRow>
									</TableFooter>
								</Table>
							</CardContent>
						</Card>
						<div className="space-y-3">
							{liq.semestres.map((s, i) => (
								<Card key={i === 0 ? "1" : "2"}>
									<CardContent className="space-y-1 p-4 text-sm">
										<p className="font-semibold">{i === 0 ? "1er semestre" : "2do semestre"}</p>
										<p className="flex justify-between gap-2">
											<span className="text-muted-foreground">Ticket promedio semestral</span>
											<span className="tabular-nums">{formatARS(s.ticketPromedio)}</span>
										</p>
										<p className="flex justify-between gap-2">
											<span className="text-muted-foreground">Mayor ticket promedio</span>
											<span className="tabular-nums">{formatARS(s.mayorTicket)}</span>
										</p>
									</CardContent>
								</Card>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
