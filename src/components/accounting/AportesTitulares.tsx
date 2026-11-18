"use client";

import {
	CalendarClock,
	ChevronDown,
	ChevronRight,
	FileDown,
	FileSpreadsheet,
	Landmark,
	Loader2,
	Pencil,
	Plus,
	Scale,
	Sigma,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import AporteManualDialog, { type AporteManualForm } from "@/components/accounting/AporteManualDialog";
import { KpiCard } from "@/components/accounting/CollectionsManager";
import { formatARS, formatFecha } from "@/components/caja/api";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLOSINGS_ENDPOINT } from "@/constant/api-endpoints";
import { type Celda, exportarExcel, exportarPdf, type TablaInforme } from "@/lib/exportar";
import { cn } from "@/lib/utils";

// Finanzas → Aportes: the aportes of the closings of Agustín (responsible) and
// Julieta (internal lawyer, in other lawyers' cases), like
// the representatives' liquidation, split by Caja Forense / Caja de Abogados
// (picked per card in the Gestor de Cierres), plus the ones loaded by hand,
// which can be edited and deleted here. Backend: modules/closings/aportes.ts.

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
	/** One of the two: the closing it comes from, or the aporte loaded by hand. */
	closingId: number | null;
	manualId: number | null;
	fecha: string;
	causa: string;
	/** The case's responsible lawyer (a representative, in Julieta's closings). */
	responsable: string | null;
	tipo: string;
	/** Null for the ones loaded by hand. */
	capital: number | null;
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
	/** Who an aporte can be loaded for. */
	personas: { id: number; name: string }[];
}

/** A hand-loaded row, as the dialog edits it. */
const formDe = (c: Caso, titularId: number): AporteManualForm => ({
	id: c.manualId ?? undefined,
	titularId,
	fecha: c.fecha,
	causa: c.causa,
	responsable: c.responsable ?? "",
	// "Aporte" is what the backend saves when the detail is left empty.
	concepto: c.tarjetas[0]?.etiqueta === "Aporte" ? "" : (c.tarjetas[0]?.etiqueta ?? ""),
	destino: c.tarjetas[0]?.destino ?? "FORENSE",
	monto: String(c.tarjetas[0]?.monto ?? "").replace(".", ","),
});

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
	const [editando, setEditando] = useState<AporteManualForm | null>(null);
	const [borrando, setBorrando] = useState<Caso | null>(null);
	const [borrandoEnCurso, setBorrandoEnCurso] = useState(false);

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
	const personas = data?.personas ?? [];

	const nuevo = () =>
		setEditando({
			titularId: personas.length === 1 ? personas[0].id : null,
			fecha: new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
			causa: "",
			responsable: "",
			concepto: "",
			destino: "FORENSE",
			monto: "",
		});

	const borrar = async () => {
		if (!borrando?.manualId) return;
		setBorrandoEnCurso(true);
		try {
			const res = await fetch(`${CLOSINGS_ENDPOINT}/aportes/manuales/${borrando.manualId}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
			toast.success("Aporte borrado");
			setBorrando(null);
			cargar();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setBorrandoEnCurso(false);
		}
	};

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
					subtitulo: `Año ${year} · Agustín y Julieta · Gestor de Cierres y carga manual`,
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
						Aportes de Agustín y Julieta, de los cierres y cargados a mano, por Caja Forense y Caja de Abogados
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button onClick={nuevo} disabled={!personas.length}>
						<Plus className="mr-1.5 h-4 w-4" />
						Cargar aporte
					</Button>
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
						hint={`${totales.casos} casos`}
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
									<th className={cn(th, "text-left")}>Abogado</th>
									<th className={cn(th, "text-right")}>Casos</th>
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
														<DetalleCasos
															casos={t.casos}
															totales={t.totales}
															titular={t.name}
															onEditar={(c) => setEditando(formDe(c, t.id))}
															onBorrar={setBorrando}
														/>
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

			<AporteManualDialog
				aporte={editando}
				personas={personas}
				token={token}
				onClose={() => setEditando(null)}
				onSaved={cargar}
			/>

			<AlertDialog open={!!borrando} onOpenChange={(o) => !o && !borrandoEnCurso && setBorrando(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>¿Borrar el aporte?</AlertDialogTitle>
						<AlertDialogDescription>
							{borrando?.causa} · {borrando?.tarjetas[0]?.etiqueta} · {formatARS(borrando?.total ?? 0)}. Se borra
							también su pago pendiente en Gastos e Ingresos. Si ya se pagó, el pago queda registrado allá.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={borrandoEnCurso}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								borrar();
							}}
							disabled={borrandoEnCurso}
							className="bg-destructive text-white hover:bg-destructive/90"
						>
							{borrandoEnCurso && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Borrar
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function DetalleCasos({
	casos,
	totales,
	titular,
	onEditar,
	onBorrar,
}: {
	casos: Caso[];
	totales: Totales;
	titular: string;
	onEditar: (c: Caso) => void;
	onBorrar: (c: Caso) => void;
}) {
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
						<th className="px-3 py-2">
							<span className="sr-only">Acciones</span>
						</th>
					</tr>
				</thead>
				<tbody>
					{casos.map((c) => (
						<tr
							key={c.manualId ? `m${c.manualId}` : `c${c.closingId}`}
							className="border-b border-border/60 align-top last:border-0 hover:bg-muted/40"
						>
							<td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatFecha(c.fecha)}</td>
							<td className="max-w-64 px-3 py-2">
								{c.closingId ? (
									<Link
										href={`/admin/closing-manager?openId=${c.closingId}`}
										className="font-medium text-foreground hover:text-primary hover:underline"
										title="Ver el cierre"
									>
										{c.causa}
									</Link>
								) : (
									<span className="font-medium text-foreground">{c.causa}</span>
								)}
								{c.responsable && c.responsable !== titular && (
									<span className="block text-[11px] text-muted-foreground">{c.responsable}</span>
								)}
							</td>
							<td className="px-3 py-2">{c.tipo}</td>
							<td className={montoCls}>{c.capital === null ? "–" : formatARS(c.capital)}</td>
							<td className="px-3 py-2 text-right">
								<CeldaCaja tarjetas={c.tarjetas.filter((t) => t.destino === "FORENSE")} />
							</td>
							<td className="px-3 py-2 text-right">
								<CeldaCaja tarjetas={c.tarjetas.filter((t) => t.destino === "ABOGADOS")} />
							</td>
							<td className={cn(montoCls, "font-medium")}>{formatARS(c.total)}</td>
							<td className="whitespace-nowrap px-2 py-1 text-right">
								{c.manualId && (
									<>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7"
											aria-label={`Editar el aporte de ${c.causa}`}
											title="Editar"
											onClick={() => onEditar(c)}
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="h-7 w-7 text-destructive hover:text-destructive"
											aria-label={`Borrar el aporte de ${c.causa}`}
											title="Borrar"
											onClick={() => onBorrar(c)}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									</>
								)}
							</td>
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
						<td />
					</tr>
				</tfoot>
			</table>
		</div>
	);
}
