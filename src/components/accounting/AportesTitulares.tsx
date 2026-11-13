"use client";

import {
	CalendarClock,
	ChevronDown,
	ChevronRight,
	FileDown,
	FileSpreadsheet,
	Landmark,
	Loader2,
	Scale,
	Sigma,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { KpiCard } from "@/components/accounting/CollectionsManager";
import { formatARS, formatFecha } from "@/components/caja/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLOSINGS_ENDPOINT } from "@/constant/api-endpoints";
import { type Celda, exportarExcel, exportarPdf, type TablaInforme } from "@/lib/exportar";
import { cn } from "@/lib/utils";

// Finanzas → Aportes: the aportes of the closings of Agustín and Julieta, like
// the representatives' liquidation, split by Caja Forense / Caja de Abogados
// (picked per card in the Gestor de Cierres). Backend: modules/closings/aportes.ts.

type Destino = "FORENSE" | "ABOGADOS";
type Estado = "PAGADO" | "PENDIENTE" | "ASEGURADORA";

interface Tarjeta {
	tarjeta: string;
	etiqueta: string;
	destino: Destino;
	monto: number;
	estado: Estado;
}

interface Caso {
	closingId: number;
	fecha: string;
	causa: string;
	tipo: string;
	capital: number;
	tarjetas: Tarjeta[];
	forense: number;
	abogados: number;
	total: number;
	pendiente: number;
}

interface Totales {
	casos: number;
	forense: number;
	abogados: number;
	total: number;
	pendiente: number;
}

interface Titular {
	id: number;
	name: string;
	casos: Caso[];
	totales: Totales;
}

interface Respuesta {
	year: number;
	titulares: Titular[];
	totales: Totales;
}

const CAJA: Record<Destino, string> = { FORENSE: "Caja Forense", ABOGADOS: "Caja de Abogados" };

const ESTADO: Record<Estado, { texto: string; clase: string }> = {
	PAGADO: { texto: "Pagado", clase: "bg-green-50 text-green-700 ring-green-200" },
	PENDIENTE: { texto: "Pendiente", clase: "bg-amber-50 text-amber-700 ring-amber-200" },
	ASEGURADORA: { texto: "Aseguradora", clase: "bg-gray-100 text-gray-600 ring-gray-200" },
};

const th = "px-3 py-3 font-medium";
const montoCls = "whitespace-nowrap px-3 py-2 text-right tabular-nums";

/** The cards of one caja in a cell: "13 % capital $130.000 · Aseguradora". */
function CeldaCaja({ tarjetas }: { tarjetas: Tarjeta[] }) {
	if (!tarjetas.length) return <span className="text-muted-foreground">–</span>;
	return (
		<div className="space-y-1">
			{tarjetas.map((t) => (
				<div key={t.tarjeta} className="flex items-center justify-end gap-2 whitespace-nowrap">
					<span className="text-muted-foreground">{t.etiqueta}</span>
					<span className="tabular-nums">{formatARS(t.monto)}</span>
					<span className={cn("rounded px-1.5 py-px text-[10px] font-medium ring-1 ring-inset", ESTADO[t.estado].clase)}>
						{ESTADO[t.estado].texto}
					</span>
				</div>
			))}
		</div>
	);
}

export default function AportesTitulares() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const anioActual = new Date().getFullYear();
	const [year, setYear] = useState(anioActual);
	const [data, setData] = useState<Respuesta | null>(null);
	const [cargando, setCargando] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [abierto, setAbierto] = useState<number | null>(null);
	const [exportando, setExportando] = useState<"excel" | "pdf" | null>(null);

	const cargar = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		setError(null);
		try {
			const res = await fetch(`${CLOSINGS_ENDPOINT}/aportes?year=${year}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
			setData(body as Respuesta);
		} catch (e) {
			setError((e as Error).message);
		} finally {
			setCargando(false);
		}
	}, [token, year]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const titulares = data?.titulares ?? [];
	const totales = data?.totales;

	// One row per card: what accounting pays, to which caja.
	const filas = (t: Titular): Celda[][] =>
		t.casos.flatMap((c) =>
			c.tarjetas.map((x) => [
				formatFecha(c.fecha),
				c.causa,
				c.tipo,
				x.etiqueta,
				CAJA[x.destino],
				x.monto,
				ESTADO[x.estado].texto,
			]),
		);
	const tablas = (): TablaInforme[] =>
		titulares.map((t) => ({
			titulo: t.name,
			columnas: ["Fecha", "Causa", "Tipo", "Aporte", "Caja", "Monto", "Estado"],
			filas: filas(t),
			totales: ["Total", "", "", "", "", t.totales.total, ""],
			montos: [5],
		}));

	const exportar = async (formato: "excel" | "pdf") => {
		setExportando(formato);
		try {
			const archivo = `Aportes ${year}`;
			if (formato === "excel") await exportarExcel(archivo, tablas());
			else
				await exportarPdf(archivo, {
					titulo: "Aportes",
					subtitulo: `Año ${year} · Agustín y Julieta · desde el Gestor de Cierres`,
					tablas: tablas(),
					horizontal: true,
					resumen: totales
						? [
								{ etiqueta: "Caja Forense", valor: formatARS(totales.forense) },
								{ etiqueta: "Caja de Abogados", valor: formatARS(totales.abogados) },
								{ etiqueta: "Total", valor: formatARS(totales.total) },
								{ etiqueta: "Pendiente de pago", valor: formatARS(totales.pendiente) },
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
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Aportes</h1>
					<p className="text-sm text-muted-foreground">
						Aportes de los cierres de Agustín y Julieta, por Caja Forense y Caja de Abogados
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="outline" onClick={() => exportar("excel")} disabled={!!exportando || !titulares.length}>
						{exportando === "excel" ? (
							<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
						) : (
							<FileSpreadsheet className="mr-1.5 h-4 w-4" />
						)}
						Excel
					</Button>
					<Button variant="outline" onClick={() => exportar("pdf")} disabled={!!exportando || !titulares.length}>
						{exportando === "pdf" ? (
							<Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
						) : (
							<FileDown className="mr-1.5 h-4 w-4" />
						)}
						PDF
					</Button>
				</div>
			</div>

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
				<span className="text-xs text-muted-foreground">Por fecha del cierre</span>
			</div>

			{totales && (
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<KpiCard
						label="Caja Forense"
						amount={totales.forense}
						hint="Aportes a la Caja Forense"
						tone="teal"
						icon={<Landmark className="h-5 w-5" />}
					/>
					<KpiCard
						label="Caja de Abogados"
						amount={totales.abogados}
						hint="Aportes a la Caja de Abogados"
						tone="emerald"
						icon={<Scale className="h-5 w-5" />}
					/>
					<KpiCard
						label="Total aportes"
						amount={totales.total}
						hint={`${totales.casos} cierres`}
						tone="teal"
						icon={<Sigma className="h-5 w-5" />}
					/>
					<KpiCard
						label="Pendiente de pago"
						amount={totales.pendiente}
						hint="Sin pagar en Gastos e Ingresos"
						tone="amber"
						icon={<CalendarClock className="h-5 w-5" />}
					/>
				</div>
			)}

			<div className="rounded-xl border border-border bg-card">
				{error ? (
					<p className="py-16 text-center text-sm text-muted-foreground">{error}</p>
				) : cargando ? (
					<div className="flex justify-center py-16">
						<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				) : titulares.length === 0 ? (
					<p className="py-16 text-center text-sm text-muted-foreground">No hay aportes en {year}.</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border text-xs text-muted-foreground">
									<th className={cn(th, "text-left")}>Titular</th>
									<th className={cn(th, "text-right")}>Cierres</th>
									<th className={cn(th, "text-right")}>Caja Forense</th>
									<th className={cn(th, "text-right")}>Caja de Abogados</th>
									<th className={cn(th, "text-right")}>Total</th>
									<th className={cn(th, "text-right")}>Pendiente</th>
								</tr>
							</thead>
							<tbody>
								{titulares.map((t) => {
									const open = abierto === t.id;
									return (
										<Fragment key={t.id}>
											<tr
												className={cn(
													"cursor-pointer border-b border-border/60 hover:bg-muted/40",
													open && "bg-muted/40",
												)}
												onClick={() => setAbierto(open ? null : t.id)}
											>
												<td className="px-3 py-3 font-medium text-foreground">
													<button type="button" aria-expanded={open} className="inline-flex items-center gap-1.5 text-left">
														{open ? (
															<ChevronDown className="h-4 w-4 text-muted-foreground" />
														) : (
															<ChevronRight className="h-4 w-4 text-muted-foreground" />
														)}
														{t.name}
													</button>
												</td>
												<td className={montoCls}>{t.totales.casos}</td>
												<td className={montoCls}>{formatARS(t.totales.forense)}</td>
												<td className={montoCls}>{formatARS(t.totales.abogados)}</td>
												<td className={cn(montoCls, "font-medium")}>{formatARS(t.totales.total)}</td>
												<td className={cn(montoCls, t.totales.pendiente > 0 && "text-amber-700")}>
													{t.totales.pendiente ? formatARS(t.totales.pendiente) : "–"}
												</td>
											</tr>
											{open && (
												<tr className="border-b border-border/60">
													<td colSpan={6} className="bg-muted/20 p-3">
														<DetalleCasos casos={t.casos} totales={t.totales} />
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
						<th className="px-3 py-2 text-left font-medium">Fecha</th>
						<th className="px-3 py-2 text-left font-medium">Causa</th>
						<th className="px-3 py-2 text-left font-medium">Tipo</th>
						<th className="px-3 py-2 text-right font-medium">Capital</th>
						<th className="px-3 py-2 text-right font-medium">Caja Forense</th>
						<th className="px-3 py-2 text-right font-medium">Caja de Abogados</th>
						<th className="px-3 py-2 text-right font-medium">Total</th>
					</tr>
				</thead>
				<tbody>
					{casos.map((c) => (
						<tr key={c.closingId} className="border-b border-border/60 align-top last:border-0 hover:bg-muted/40">
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
							<td className={montoCls}>{formatARS(c.capital)}</td>
							<td className="px-3 py-2 text-right">
								<CeldaCaja tarjetas={c.tarjetas.filter((t) => t.destino === "FORENSE")} />
							</td>
							<td className="px-3 py-2 text-right">
								<CeldaCaja tarjetas={c.tarjetas.filter((t) => t.destino === "ABOGADOS")} />
							</td>
							<td className={cn(montoCls, "font-medium")}>{formatARS(c.total)}</td>
						</tr>
					))}
				</tbody>
				<tfoot>
					<tr className="border-t border-border font-semibold">
						<td colSpan={4} className="px-3 py-2">
							Subtotales
						</td>
						<td className={montoCls}>{formatARS(totales.forense)}</td>
						<td className={montoCls}>{formatARS(totales.abogados)}</td>
						<td className={montoCls}>{formatARS(totales.total)}</td>
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
