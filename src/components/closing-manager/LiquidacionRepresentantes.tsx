"use client";

import {
	CalendarClock,
	ChevronDown,
	ChevronRight,
	FileDown,
	FileSpreadsheet,
	HandCoins,
	Loader2,
	Receipt,
	Search,
	Sigma,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KpiCard } from "@/components/accounting/CollectionsManager";
import { formatARS, formatFecha, MESES } from "@/components/caja/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLOSINGS_ENDPOINT } from "@/constant/api-endpoints";
import { type Celda, exportarExcel, exportarPdf, type TablaInforme } from "@/lib/exportar";
import { cn } from "@/lib/utils";

// Representatives' liquidation, laid out like the Gestor de Gastos e Ingresos:
// one row per representative that opens her cases. The backend builds it from
// the Gestor de Cierres (modules/closings/liquidacion.ts has the column rules)
// and sends the overall totals (the cards) only to management.

interface Caso {
	closingId: number;
	fecha: string;
	causa: string;
	tipo: string;
	capital: number;
	facturado: number;
	ingresos: number;
	aportes: { demandada: number; abogado: number; legalistas: number; subtotal: number };
	total: number;
	pendiente: number;
	estado: "COBRADO" | "PENDIENTE";
}

interface Totales {
	casos: number;
	capital: number;
	facturado: number;
	ingresos: number;
	demandada: number;
	abogado: number;
	legalistas: number;
	aportes: number;
	total: number;
	pendiente: number;
}

type Clasificacion = "ORO" | "PLATA" | "BRONCE";

const CLASIFICACION: Record<Clasificacion, { texto: string; clase: string }> = {
	ORO: { texto: "Oro", clase: "text-amber-700" },
	PLATA: { texto: "Plata", clase: "text-slate-600" },
	BRONCE: { texto: "Bronce", clase: "text-orange-800" },
};

interface Representante {
	id: number;
	name: string;
	provincia: string | null;
	/** Only management gets it (and can change it by hand). */
	clasificacion: Clasificacion | null;
	casos: Caso[];
	totales: Totales;
}

interface Respuesta {
	year: number;
	representantes: Representante[];
	totales: Totales | null;
}

const COLUMNAS = [
	"Fecha", "Causa", "Tipo", "Capital", "Honorarios", "Cuota Litis",
	"Ap. demandada", "Ap. abogado/a", "Ap. Legalistas", "Subtotal aportes", "Total", "Estado",
];
/** Columns with amounts in COLUMNAS. */
const MONTOS = [3, 4, 5, 6, 7, 8, 9, 10];

const valoresCaso = (c: Caso): Celda[] => [
	formatFecha(c.fecha),
	c.causa,
	c.tipo,
	c.capital,
	c.facturado,
	c.ingresos,
	c.aportes.demandada,
	c.aportes.abogado,
	c.aportes.legalistas,
	c.aportes.subtotal,
	c.total,
	c.estado,
];
const valoresTotales = (t: Totales): Celda[] => [
	"Subtotales", "", "", t.capital, t.facturado, t.ingresos,
	t.demandada, t.abogado, t.legalistas, t.aportes, t.total, "",
];

const ESTADO_STYLE: Record<Caso["estado"], string> = {
	COBRADO: "bg-green-50 text-green-700 ring-green-200",
	PENDIENTE: "bg-amber-50 text-amber-700 ring-amber-200",
};

const th = "px-3 py-3 font-medium";
const montoCls = "whitespace-nowrap px-3 py-2 text-right tabular-nums";

export default function LiquidacionRepresentantes() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const anioActual = new Date().getFullYear();
	const [year, setYear] = useState(anioActual);
	/** 1-12; 0 = the whole year. */
	const [month, setMonth] = useState(0);
	const [data, setData] = useState<Respuesta | null>(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [abierto, setAbierto] = useState<number | null>(null);
	const [search, setSearch] = useState("");
	const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);

	const cargar = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		setError(null);
		try {
			const res = await fetch(
				`${CLOSINGS_ENDPOINT}/liquidacion-representantes?year=${year}${month ? `&month=${month}` : ""}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
			const r = body as Respuesta;
			setData(r);
			// A representative sees only herself: open her cases straight away.
			setAbierto(r.representantes.length === 1 ? r.representantes[0].id : null);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setCargando(false);
		}
	}, [token, year, month]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const periodo = month ? `${MESES[month - 1]} ${year}` : `Año ${year}`;

	// By hand for now: the table changes right away and goes back if saving fails.
	const clasificar = async (r: Representante, valor: Clasificacion | null) => {
		const cambiar = (c: Clasificacion | null) =>
			setData((d) =>
				d && {
					...d,
					representantes: d.representantes.map((x) => (x.id === r.id ? { ...x, clasificacion: c } : x)),
				},
			);
		cambiar(valor);
		try {
			const res = await fetch(`${CLOSINGS_ENDPOINT}/liquidacion-representantes/${r.id}/clasificacion`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ clasificacion: valor }),
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
		} catch (e) {
			cambiar(r.clasificacion);
			toast.error((e as Error).message);
		}
	};

	const q = search.trim().toLowerCase();
	const representantes = (data?.representantes ?? []).filter(
		(r) => !q || `${r.name} ${r.provincia ?? ""}`.toLowerCase().includes(q),
	);
	const totales = data?.totales;

	const tablas = (): TablaInforme[] =>
		representantes.map((r) => ({
			titulo: r.name,
			columnas: COLUMNAS,
			filas: r.casos.map(valoresCaso),
			totales: valoresTotales(r.totales),
			montos: MONTOS,
		}));

	const exportar = async (formato: "excel" | "pdf") => {
		setExportando(formato);
		try {
			const archivo = `Liquidacion representantes ${month ? `${MESES[month - 1]} ` : ""}${year}`;
			if (formato === "excel") await exportarExcel(archivo, tablas());
			else
				await exportarPdf(archivo, {
					titulo: "Liquidación de representantes",
					subtitulo: `${periodo} · desde el Gestor de Cierres`,
					tablas: tablas(),
					horizontal: true,
					resumen: totales
						? [
								{ etiqueta: "Honorarios", valor: formatARS(totales.facturado) },
								{ etiqueta: "Cuota Litis", valor: formatARS(totales.ingresos) },
								{ etiqueta: "Pendiente de cobro", valor: formatARS(totales.pendiente) },
								{ etiqueta: "Aportes + Cuota Litis", valor: formatARS(totales.total) },
							]
						: [],
				});
		} catch {
			toast.error("No se pudo exportar");
		} finally {
			setExportando(null);
		}
	};

	return (
		<div className="space-y-5">
			{/* ── Encabezado ─────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Liquidación de representantes</h1>
					<p className="text-sm text-muted-foreground">
						Sale del Gestor de Cierres: un cierre por fila, con sus honorarios y cuota litis
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						onClick={() => exportar("excel")}
						disabled={!!exportando || representantes.length === 0}
					>
						{exportando === "excel" ? (
							<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
						) : (
							<FileSpreadsheet className="mr-1.5 h-4 w-4" />
						)}
						Excel
					</Button>
					<Button
						variant="outline"
						onClick={() => exportar("pdf")}
						disabled={!!exportando || representantes.length === 0}
					>
						{exportando === "pdf" ? (
							<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
						) : (
							<FileDown className="mr-1.5 h-4 w-4" />
						)}
						PDF
					</Button>
				</div>
			</div>

			{/* ── Filtros ────────────────────────────────────────────────── */}
			<div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
				<Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
					<SelectTrigger className="h-10 w-40" aria-label="Año">
						<CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{[anioActual, anioActual - 1, anioActual - 2].map((y) => (
							<SelectItem key={y} value={String(y)}>
								Año {y}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
					<SelectTrigger className="h-10 w-44" aria-label="Mes">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="0">Todo el año</SelectItem>
						{MESES.map((m, i) => (
							<SelectItem key={m} value={String(i + 1)}>
								{m}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{(data?.representantes.length ?? 0) > 1 && (
					<div className="relative min-w-64 flex-1">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Buscar representante o provincia..."
							aria-label="Buscar representante o provincia"
							className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
					</div>
				)}
			</div>

			{/* ── Tarjetas (solo dirección: el backend no las manda al representante) ── */}
			{totales && (
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
					<KpiCard
						label="Honorarios representantes"
						amount={totales.facturado}
						hint={`${totales.casos} cierres`}
						tone="teal"
						icon={<Receipt className="h-5 w-5" />}
					/>
					<KpiCard
						label="Cuota Litis representantes"
						amount={totales.ingresos}
						hint="Su parte de HP + cuota litis"
						tone="emerald"
						icon={<Wallet className="h-5 w-5" />}
					/>
					<KpiCard
						label="Aportes Legalistas + representantes"
						amount={totales.legalistas + totales.abogado}
						hint={`Legalistas ${formatARS(totales.legalistas)} · Repr. ${formatARS(totales.abogado)}`}
						tone="teal"
						icon={<HandCoins className="h-5 w-5" />}
					/>
					<KpiCard
						label="Pendiente de cobro"
						amount={totales.pendiente}
						hint="Cuota Litis sin cobrar"
						tone="amber"
						icon={<CalendarClock className="h-5 w-5" />}
					/>
					<KpiCard
						label="Aportes + Cuota Litis"
						amount={totales.total}
						hint="Total de la liquidación"
						tone="emerald"
						icon={<Sigma className="h-5 w-5" />}
					/>
				</div>
			)}

			{/* ── Representantes → casos ─────────────────────────────────── */}
			<div className="rounded-xl border border-border bg-card">
				{error ? (
					<p className="py-16 text-center text-sm text-muted-foreground">{error}</p>
				) : cargando ? (
					<div className="flex justify-center py-16">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : representantes.length === 0 ? (
					<p className="py-16 text-center text-sm text-muted-foreground">
						No hay cierres de representantes en {month ? `${MESES[month - 1]} ${year}` : year}.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border text-xs text-muted-foreground">
									<th className={cn(th, "text-left")}>Representante</th>
									<th className={cn(th, "text-left")}>Provincia</th>
									{totales && <th className={cn(th, "text-left")}>Clasificación</th>}
									<th className={cn(th, "text-right")}>Cierres</th>
									<th className={cn(th, "text-right")}>Honorarios</th>
									<th className={cn(th, "text-right")}>Cuota Litis</th>
									<th className={cn(th, "text-right")}>Aportes</th>
									<th className={cn(th, "text-right")}>Total</th>
									<th className={cn(th, "text-right")}>Pendiente</th>
								</tr>
							</thead>
							<tbody>
								{representantes.map((r) => {
									const open = abierto === r.id;
									return (
										<Fragment key={r.id}>
											<tr
												className={cn(
													"cursor-pointer border-b border-border/60 hover:bg-muted/40",
													open && "bg-muted/40",
												)}
												onClick={() => setAbierto(open ? null : r.id)}
											>
												<td className="px-3 py-3 font-medium text-foreground">
													<button
														type="button"
														aria-expanded={open}
														className="inline-flex items-center gap-1.5 text-left"
													>
														{open ? (
															<ChevronDown className="h-4 w-4 text-muted-foreground" />
														) : (
															<ChevronRight className="h-4 w-4 text-muted-foreground" />
														)}
														{r.name}
													</button>
												</td>
												<td className="px-3 py-3 text-muted-foreground">{r.provincia ?? "–"}</td>
												{totales && (
													// Its own control: a click here does not open the row.
													<td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
														<Select
															value={r.clasificacion ?? "NINGUNA"}
															onValueChange={(v) =>
																clasificar(r, v === "NINGUNA" ? null : (v as Clasificacion))
															}
														>
															<SelectTrigger
																className={cn("h-8 w-32", r.clasificacion && CLASIFICACION[r.clasificacion].clase)}
																aria-label={`Clasificación de ${r.name}`}
															>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="NINGUNA">Sin clasificar</SelectItem>
																{(Object.keys(CLASIFICACION) as Clasificacion[]).map((k) => (
																	<SelectItem key={k} value={k}>
																		{CLASIFICACION[k].texto}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
													</td>
												)}
												<td className={montoCls}>{r.totales.casos}</td>
												<td className={montoCls}>{formatARS(r.totales.facturado)}</td>
												<td className={montoCls}>{formatARS(r.totales.ingresos)}</td>
												<td className={montoCls}>{formatARS(r.totales.aportes)}</td>
												<td className={cn(montoCls, "font-medium")}>{formatARS(r.totales.total)}</td>
												<td className={cn(montoCls, r.totales.pendiente > 0 && "text-amber-700")}>
													{r.totales.pendiente ? formatARS(r.totales.pendiente) : "–"}
												</td>
											</tr>
											{open && (
												<tr className="border-b border-border/60">
													<td colSpan={totales ? 9 : 8} className="bg-muted/20 p-3">
														<DetalleCasos casos={r.casos} totales={r.totales} />
													</td>
												</tr>
											)}
										</Fragment>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}

function DetalleCasos({ casos, totales }: { casos: Caso[]; totales: Totales }) {
	return (
		<div className="overflow-x-auto rounded-lg border border-border bg-card">
			<table className="w-full text-xs">
				<thead>
					<tr className="border-b border-border text-muted-foreground">
						{COLUMNAS.map((c, i) => (
							<th
								key={c}
								className={cn("px-3 py-2 font-medium", MONTOS.includes(i) ? "text-right" : "text-left")}
							>
								{c}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{casos.map((c) => (
						<tr key={c.closingId} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
							<td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatFecha(c.fecha)}</td>
							<td className="max-w-64 px-3 py-2">
								<Link
									href={`/admin/closing-manager?openId=${c.closingId}`}
									className="font-medium text-foreground hover:text-primary hover:underline"
									title="Ver el cierre"
								>
									{c.causa}
								</Link>
							</td>
							<td className="px-3 py-2">{c.tipo}</td>
							{valoresCaso(c)
								.slice(3, 11)
								.map((v, i) => (
									<td key={COLUMNAS[i + 3]} className={montoCls}>
										{formatARS(Number(v))}
									</td>
								))}
							<td className="px-3 py-2">
								<span
									className={cn(
										"rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
										ESTADO_STYLE[c.estado],
									)}
								>
									{c.estado === "COBRADO" ? "Cobrado" : "Pendiente"}
								</span>
							</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr className="border-t border-border font-semibold">
						<td colSpan={3} className="px-3 py-2">
							Subtotales
						</td>
						{valoresTotales(totales)
							.slice(3, 11)
							.map((v, i) => (
								<td key={COLUMNAS[i + 3]} className={montoCls}>
									{formatARS(Number(v))}
								</td>
							))}
						<td />
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
