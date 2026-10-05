"use client";

import {
	FileDown,
	FileSpreadsheet,
	Loader2,
	Palmtree,
	Stethoscope,
	UserMinus,
	UserPlus,
	Users,
	Wallet,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	AbsenteeismChart,
	computeTenure,
	computeTurnover,
	type EmployeeWithEmployment,
	type MonthlyAbsenteeismItem,
	TenureChart,
	TurnoverChart,
} from "@/components/reports/rrhh";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RRHH_REPORTE_ENDPOINT } from "@/constant/api-endpoints";
import { LICENCIA_LABEL, SEGMENTO_LABEL, type Segmento } from "@/constant/rrhh";
import { type Celda, exportarExcel, exportarPdf, type TablaInforme } from "@/lib/exportar";
import { CostosPorMesChart } from "./CostosPorMesChart";
import { armarTablas, nombreMesCorto, type SeccionKey } from "./tablas";
import type { ReporteRrhhData, TipoLicencia } from "./types";

// Centro de información de RR.HH.: equipo interno y representantes, altas y
// bajas, vacaciones, licencias y costo laboral (este último solo para quienes
// administran RR.HH.). Todo sale de GET /rrhh/reporte.
// Asistencia y legajo quedaron fuera de la pantalla el 05/10/2026 (las tablas
// se siguen armando en tablas.ts; alcanza con volver a listarlas en SECCIONES).

const TODAS = "todas";
const hoy = new Date();
const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PRESETS: Record<string, { label: string; desde: string; hasta: string }> = {
	anio: {
		label: `Año ${hoy.getFullYear()}`,
		desde: `${hoy.getFullYear()}-01-01`,
		hasta: `${hoy.getFullYear()}-12-31`,
	},
	mes: {
		label: "Este mes",
		desde: iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
		hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
	},
	doce: {
		label: "Últimos 12 meses",
		desde: iso(new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)),
		hasta: iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)),
	},
	anterior: {
		label: `Año ${hoy.getFullYear() - 1}`,
		desde: `${hoy.getFullYear() - 1}-01-01`,
		hasta: `${hoy.getFullYear() - 1}-12-31`,
	},
};

const pesos = (n: number) =>
	n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

const SECCIONES: { key: SeccionKey; label: string }[] = [
	{ key: "personas", label: "Personas" },
	{ key: "vacaciones", label: "Vacaciones" },
	{ key: "licencias", label: "Licencias" },
	{ key: "costos", label: "Costos" },
];

function Tarjeta({
	icon: Icon,
	titulo,
	valor,
	detalle,
	color,
}: {
	icon: typeof Users;
	titulo: string;
	valor: string | number;
	detalle?: string;
	color: string;
}) {
	return (
		<Card className={`border-l-2 py-0 ${color}`}>
			<div className="flex items-start justify-between px-3 py-2.5">
				<div className="min-w-0">
					<p className="text-[11px] font-medium text-muted-foreground">{titulo}</p>
					<p className="mt-1 text-lg font-bold leading-none text-foreground">{valor}</p>
					{detalle && <p className="mt-1 truncate text-[10px] text-muted-foreground">{detalle}</p>}
				</div>
				<Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
			</div>
		</Card>
	);
}

function TablaVista({ tabla }: { tabla: TablaInforme }) {
	const montos = new Set(tabla.montos ?? []);
	const celda = (v: Celda, i: number) =>
		montos.has(i) && typeof v === "number"
			? pesos(v)
			: v === null || v === undefined
				? "—"
				: String(v);
	const numerica = (i: number) => i > 1 && tabla.filas.some((f) => typeof f[i] === "number");
	if (tabla.filas.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-muted-foreground">No hay datos para mostrar</p>
		);
	}
	return (
		<div className="overflow-x-auto rounded-lg border border-border">
			<Table>
				<TableHeader>
					<TableRow>
						{tabla.columnas.map((c, i) => (
							<TableHead
								key={c}
								className={`whitespace-nowrap text-xs ${numerica(i) ? "text-right" : ""}`}
							>
								{c}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{tabla.filas.map((f, j) => (
						<TableRow key={`${f[0]}-${j}`}>
							{f.map((v, i) => (
								<TableCell
									key={tabla.columnas[i]}
									className={`whitespace-nowrap text-xs ${numerica(i) ? "text-right tabular-nums" : ""} ${i === 0 ? "font-medium" : ""}`}
								>
									{celda(v, i)}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
				{tabla.totales && (
					<TableFooter>
						<TableRow>
							{tabla.totales.map((v, i) => (
								<TableCell
									key={tabla.columnas[i]}
									className={`whitespace-nowrap text-xs font-semibold ${numerica(i) ? "text-right tabular-nums" : ""}`}
								>
									{v === "" ? "" : celda(v, i)}
								</TableCell>
							))}
						</TableRow>
					</TableFooter>
				)}
			</Table>
		</div>
	);
}

export default function ReporteRrhh() {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [desde, setDesde] = useState(PRESETS.anio.desde);
	const [hasta, setHasta] = useState(PRESETS.anio.hasta);
	const [segmento, setSegmento] = useState<"todos" | Segmento>("todos");
	const [area, setArea] = useState(TODAS);
	const [soloActivos, setSoloActivos] = useState(true);
	const [seccion, setSeccion] = useState<SeccionKey>("personas");
	const [data, setData] = useState<ReporteRrhhData | null>(null);
	const [cargando, setCargando] = useState(false);
	const [exportando, setExportando] = useState(false);

	const cargar = useCallback(async () => {
		if (!token || !desde || !hasta) return;
		setCargando(true);
		try {
			const res = await fetch(`${RRHH_REPORTE_ENDPOINT}?desde=${desde}&hasta=${hasta}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.error || body.message || "No se pudo cargar el reporte");
			setData(body as ReporteRrhhData);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo cargar el reporte");
		} finally {
			setCargando(false);
		}
	}, [token, desde, hasta]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const areas = useMemo(
		() =>
			Array.from(
				new Set((data?.personas ?? []).map((p) => p.area).filter(Boolean) as string[]),
			).sort(),
		[data],
	);

	// Filtro de segmento y área. "Solo activos" saca las bajas de las tablas,
	// pero altas/bajas del gráfico usan a todos.
	const delSegmento = useMemo(
		() =>
			(data?.personas ?? []).filter(
				(p) =>
					(segmento === "todos" || p.segmento === segmento) && (area === TODAS || p.area === area),
			),
		[data, segmento, area],
	);
	const personas = useMemo(
		() => (soloActivos ? delSegmento.filter((p) => p.status !== "TERMINATED") : delSegmento),
		[delSegmento, soloActivos],
	);

	const anioVacaciones = Number(hasta.slice(0, 4)) || hoy.getFullYear();
	const verCostos = !!data?.verCostos;
	const tablas = useMemo(
		() => armarTablas(personas, verCostos, anioVacaciones),
		[personas, verCostos, anioVacaciones],
	);

	const resumen = useMemo(() => {
		const activos = personas.filter((p) => p.status !== "TERMINATED");
		const dentro = (f: string | null) => !!f && f.slice(0, 10) >= desde && f.slice(0, 10) <= hasta;
		const diasTipo = (t: TipoLicencia) =>
			personas.reduce((s, p) => s + (p.licencias.dias[t] ?? 0), 0);
		const diasLicencia = (Object.keys(LICENCIA_LABEL) as TipoLicencia[]).reduce(
			(s, t) => s + diasTipo(t),
			0,
		);
		return {
			activos: activos.length,
			internos: activos.filter((p) => p.segmento === "INTERNO").length,
			representantes: activos.filter((p) => p.segmento === "REPRESENTANTE").length,
			altas: delSegmento.filter((p) => dentro(p.hireDate)).length,
			bajas: delSegmento.filter((p) => dentro(p.terminationDate)).length,
			diasLicencia,
			diasEnfermedad: diasTipo("SICK"),
			vacDisponibles: activos.reduce((s, p) => s + Math.max(0, p.vacaciones.disponibles ?? 0), 0),
			vacPedidas: activos.reduce((s, p) => s + p.vacaciones.pedidos, 0),
			costo: personas.reduce((s, p) => s + (p.costos?.total ?? 0), 0),
			pagado: personas.reduce((s, p) => s + (p.costos?.pagado ?? 0), 0),
			pendiente: personas.reduce((s, p) => s + (p.costos?.pendiente ?? 0), 0),
		};
	}, [personas, delSegmento, desde, hasta]);

	// Los gráficos de rotación y antigüedad existentes esperan la forma de /users.
	const comoEmpleados = useMemo(
		() =>
			delSegmento.map(
				(p) =>
					({
						id: p.id,
						name: p.name,
						email: p.email ?? "",
						employment: p.tieneFicha
							? {
									hireDate: p.hireDate,
									terminationDate: p.terminationDate,
									area: p.area,
									status: p.status,
								}
							: null,
					}) as unknown as EmployeeWithEmployment,
			),
		[delSegmento],
	);
	const rotacion = useMemo(
		() => computeTurnover(comoEmpleados, desde, hasta),
		[comoEmpleados, desde, hasta],
	);
	const antiguedad = useMemo(
		() => computeTenure(comoEmpleados.filter((e) => e.employment?.status !== "TERMINATED")),
		[comoEmpleados],
	);
	const ausentismo = useMemo<MonthlyAbsenteeismItem[]>(
		() =>
			(data?.periodos ?? []).map((mes) => {
				const fila = { month: nombreMesCorto(mes) } as MonthlyAbsenteeismItem;
				for (const t of Object.keys(LICENCIA_LABEL) as TipoLicencia[]) {
					fila[t] = personas.reduce((s, p) => s + (p.licencias.porMes[mes]?.[t] ?? 0), 0);
				}
				return fila;
			}),
		[data, personas],
	);

	const subtitulo = [
		`Del ${desde.split("-").reverse().join("/")} al ${hasta.split("-").reverse().join("/")}`,
		segmento === "todos" ? "Todos" : SEGMENTO_LABEL[segmento],
		area === TODAS ? null : `Área ${area}`,
		soloActivos ? "Solo activos" : "Incluye bajas",
	]
		.filter(Boolean)
		.join(" · ");

	const listas = SECCIONES.map((s) => tablas[s.key]).filter((t): t is TablaInforme => !!t);

	const exportar = async (formato: "excel" | "pdf", todas: boolean) => {
		setExportando(true);
		try {
			const elegidas = todas ? listas : [tablas[seccion]].filter((t): t is TablaInforme => !!t);
			const nombre = `Reporte RRHH ${desde} a ${hasta}`;
			if (formato === "excel") {
				const resumenT: TablaInforme = {
					titulo: "Resumen",
					columnas: ["Indicador", "Valor"],
					filas: [
						["Filtro", subtitulo],
						["Personas activas", resumen.activos],
						[SEGMENTO_LABEL.INTERNO, resumen.internos],
						[SEGMENTO_LABEL.REPRESENTANTE, resumen.representantes],
						["Altas en el período", resumen.altas],
						["Bajas en el período", resumen.bajas],
						["Días de licencia", resumen.diasLicencia],
						["Días por enfermedad", resumen.diasEnfermedad],
						["Vacaciones disponibles (días)", resumen.vacDisponibles],
						...(verCostos
							? ([
									["Costo laboral", resumen.costo],
									["Pagado", resumen.pagado],
									["Pendiente de pago", resumen.pendiente],
								] as Celda[][])
							: []),
					],
				};
				await exportarExcel(nombre, todas ? [resumenT, ...elegidas] : elegidas);
			} else {
				await exportarPdf(nombre, {
					titulo: "Reporte de RR.HH.",
					subtitulo,
					tablas: elegidas,
					horizontal: true,
				});
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "No se pudo exportar");
		} finally {
			setExportando(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Reporte de RR.HH.</h1>
					<p className="text-muted-foreground">
						Equipo interno y representantes: vacaciones
						{verCostos ? ", licencias y costo laboral" : " y licencias"}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={!data || exportando}
						onClick={() => exportar("excel", true)}
					>
						<FileSpreadsheet className="mr-1 h-4 w-4" />
						Excel completo
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={!data || exportando}
						onClick={() => exportar("pdf", false)}
					>
						<FileDown className="mr-1 h-4 w-4" />
						PDF de la pestaña
					</Button>
				</div>
			</div>

			{/* Filtros */}
			<Card className="p-4">
				<div className="flex flex-wrap items-end gap-3">
					<div className="space-y-1">
						<Label className="text-xs">Período</Label>
						<Select
							value={
								Object.keys(PRESETS).find(
									(k) => PRESETS[k].desde === desde && PRESETS[k].hasta === hasta,
								) ?? "custom"
							}
							onValueChange={(k) => {
								if (!PRESETS[k]) return;
								setDesde(PRESETS[k].desde);
								setHasta(PRESETS[k].hasta);
							}}
						>
							<SelectTrigger className="h-9 w-[170px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(PRESETS).map(([k, p]) => (
									<SelectItem key={k} value={k}>
										{p.label}
									</SelectItem>
								))}
								<SelectItem value="custom" disabled>
									Personalizado
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Desde</Label>
						<Input
							type="date"
							className="h-9 w-[150px]"
							value={desde}
							onChange={(e) => setDesde(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Hasta</Label>
						<Input
							type="date"
							className="h-9 w-[150px]"
							value={hasta}
							onChange={(e) => setHasta(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Área</Label>
						<Select value={area} onValueChange={setArea}>
							<SelectTrigger className="h-9 w-[170px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={TODAS}>Todas las áreas</SelectItem>
								{areas.map((a) => (
									<SelectItem key={a} value={a}>
										{a}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={soloActivos}
							onChange={(e) => setSoloActivos(e.target.checked)}
							className="h-4 w-4 accent-primary"
						/>
						Solo activos
					</label>
					{cargando && <Loader2 className="mb-2 h-4 w-4 animate-spin text-muted-foreground" />}
				</div>
				<Tabs
					value={segmento}
					onValueChange={(v) => setSegmento(v as typeof segmento)}
					className="mt-3"
				>
					<TabsList>
						<TabsTrigger value="todos">Todos</TabsTrigger>
						<TabsTrigger value="INTERNO">{SEGMENTO_LABEL.INTERNO}</TabsTrigger>
						<TabsTrigger value="REPRESENTANTE">{SEGMENTO_LABEL.REPRESENTANTE}</TabsTrigger>
					</TabsList>
				</Tabs>
			</Card>

			{/* Indicadores */}
			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
				<Tarjeta
					icon={Users}
					titulo="Personas activas"
					valor={resumen.activos}
					detalle={`${resumen.internos} internos · ${resumen.representantes} representantes`}
					color="border-l-blue-500"
				/>
				<Tarjeta
					icon={UserPlus}
					titulo="Altas / bajas"
					valor={`${resumen.altas} / ${resumen.bajas}`}
					detalle="En el período"
					color="border-l-emerald-500"
				/>
				<Tarjeta
					icon={Stethoscope}
					titulo="Días de licencia"
					valor={resumen.diasLicencia}
					detalle={`${resumen.diasEnfermedad} por enfermedad`}
					color="border-l-rose-500"
				/>
				<Tarjeta
					icon={Palmtree}
					titulo={`Vacaciones ${anioVacaciones} disponibles`}
					valor={`${resumen.vacDisponibles} días`}
					detalle={
						resumen.vacPedidas
							? `${resumen.vacPedidas} días pedidos sin aprobar`
							: "Sin pedidos pendientes"
					}
					color="border-l-sky-500"
				/>
				{verCostos ? (
					<Tarjeta
						icon={Wallet}
						titulo="Costo laboral"
						valor={pesos(resumen.costo)}
						detalle={`Pagado ${pesos(resumen.pagado)} · pendiente ${pesos(resumen.pendiente)}`}
						color="border-l-amber-500"
					/>
				) : (
					<Tarjeta
						icon={UserMinus}
						titulo="Licencias pendientes"
						valor={personas.reduce((s, p) => s + p.licencias.pendientes, 0)}
						detalle="Solicitudes sin resolver"
						color="border-l-amber-500"
					/>
				)}
			</div>

			{/* Gráficos */}
			<div className="grid gap-6 lg:grid-cols-2">
				<TurnoverChart data={rotacion} />
				<AbsenteeismChart data={ausentismo} />
			</div>
			<div className="grid gap-6 lg:grid-cols-2">
				{verCostos && <CostosPorMesChart personas={personas} periodos={data?.periodos ?? []} />}
				<TenureChart data={antiguedad} />
			</div>

			{/* Tablas */}
			<Tabs value={seccion} onValueChange={(v) => setSeccion(v as SeccionKey)}>
				<TabsList className="flex-wrap">
					{SECCIONES.filter((s) => tablas[s.key]).map((s) => (
						<TabsTrigger key={s.key} value={s.key}>
							{s.label}
						</TabsTrigger>
					))}
				</TabsList>
				{SECCIONES.map((s) => {
					const t = tablas[s.key];
					return t ? (
						<TabsContent key={s.key} value={s.key} className="mt-3 space-y-2">
							<div className="flex items-center justify-between gap-2">
								<p className="text-sm font-medium">{t.titulo}</p>
								<Button
									variant="ghost"
									size="sm"
									disabled={exportando}
									onClick={() => exportar("excel", false)}
								>
									<FileSpreadsheet className="mr-1 h-4 w-4" />
									Excel de esta tabla
								</Button>
							</div>
							<TablaVista tabla={t} />
						</TabsContent>
					) : null;
				})}
			</Tabs>
		</div>
	);
}
