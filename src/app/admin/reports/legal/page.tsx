"use client";

import type { ApexOptions } from "apexcharts";
import {
	Archive,
	Award,
	Briefcase,
	FileText,
	Medal,
	Scale,
	TrendingUp,
	Trophy,
	UserX,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { STATISTICS_LEGAL_OVERVIEW_ENDPOINT } from "@/constant/api-endpoints";
import { FILES_TYPE } from "@/constant/causes";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface StatsCards {
	totalCases: number;
	activeCases: number;
	closingCases: number;
	archivedCases: number;
	totalFiles: number;
	unassignedCases: number;
}

interface FileByProcessType { typeProcessId: number; label: string; count: number; }
interface LawyerStat { id: number; name: string; email: string; count: number; }
interface CaseByStatus { status: string; count: number; }
interface MonthlyItem { month: string; label: string; count: number; }
interface FileByType { filetype: string; count: number; }
interface JurisdictionStat { jurisdictionId: number; name: string; count: number; }
interface CourtStat { courtId: number; name: string; charter: string; count: number; }

interface LegalData {
	statsCards: StatsCards;
	filesByProcessType: FileByProcessType[];
	casesByLawyer: LawyerStat[];
	casesByLawyerChart: LawyerStat[];
	casesByStatus: CaseByStatus[];
	monthlyTrend: MonthlyItem[];
	filesByType: FileByType[];
	filesByJurisdiction: JurisdictionStat[];
	filesByCourt: CourtStat[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
	IN_PROGRESS: "En Curso", CLOSED: "Cerrada", ARCHIVED: "Archivada",
	PENDING: "Pendiente", ACTIVE: "Activa", SUSPENDED: "Suspendida", FINISHED: "Finalizada",
};

const STATUS_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

// Colores para ApexCharts (no soporta CSS vars)
const AXIS_COLOR = "#94a3b8";
const GRID_COLOR = "#334155";
const LABEL_COLOR = "#cbd5e1";

// ── Chart base configs ─────────────────────────────────────────────────────────

const baseGrid = { strokeDashArray: 4, borderColor: GRID_COLOR };
const baseAxisLabel = { style: { fontSize: "11px", colors: AXIS_COLOR } };

// ── Componente ─────────────────────────────────────────────────────────────────

export default function LegalReportsPage() {
	const { data: session } = useSession();
	const [data, setData] = useState<LegalData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lawyerMonth, setLawyerMonth] = useState("");
	const [trendFilter, setTrendFilter] = useState("all");
	const [processFilter, setProcessFilter] = useState("all");
	const [lawyerChartMonth, setLawyerChartMonth] = useState("");

	useEffect(() => {
		if (!session?.user?.accessToken) return;
		setLoading(true);
		fetch(STATISTICS_LEGAL_OVERVIEW_ENDPOINT, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.user.accessToken}` },
			cache: "no-store",
		})
			.then((r) => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json(); })
			.then(setData)
			.catch((e) => setError(e.message))
			.finally(() => setLoading(false));
	}, [session?.user?.accessToken]);

	useEffect(() => {
		if (!session?.user?.accessToken || !data) return;
		const params = new URLSearchParams();
		if (trendFilter !== "all") params.append("trendFilter", trendFilter);
		fetch(`${STATISTICS_LEGAL_OVERVIEW_ENDPOINT}?${params.toString()}`, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.user.accessToken}` },
			cache: "no-store",
		}).then((r) => r.json()).then((d) => setData((prev) => prev ? { ...prev, monthlyTrend: d.monthlyTrend } : null)).catch(console.error);
	}, [trendFilter]);

	useEffect(() => {
		if (!session?.user?.accessToken || !data) return;
		const params = new URLSearchParams();
		if (processFilter !== "all") params.append("processFilter", processFilter);
		fetch(`${STATISTICS_LEGAL_OVERVIEW_ENDPOINT}?${params.toString()}`, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.user.accessToken}` },
			cache: "no-store",
		}).then((r) => r.json()).then((d) => setData((prev) => prev ? { ...prev, filesByProcessType: d.filesByProcessType } : null)).catch(console.error);
	}, [processFilter]);

	useEffect(() => {
		if (!session?.user?.accessToken || !data) return;
		const params = new URLSearchParams();
		if (lawyerMonth) params.append("lawyerMonth", lawyerMonth);
		fetch(`${STATISTICS_LEGAL_OVERVIEW_ENDPOINT}?${params.toString()}`, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.user.accessToken}` },
			cache: "no-store",
		}).then((r) => r.json()).then((d) => setData((prev) => prev ? { ...prev, casesByLawyer: d.casesByLawyer } : null)).catch(console.error);
	}, [lawyerMonth]);

	useEffect(() => {
		if (!session?.user?.accessToken || !data) return;
		const params = new URLSearchParams();
		if (lawyerChartMonth) params.append("lawyerChartMonth", lawyerChartMonth);
		fetch(`${STATISTICS_LEGAL_OVERVIEW_ENDPOINT}?${params.toString()}`, {
			headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.user.accessToken}` },
			cache: "no-store",
		}).then((r) => r.json()).then((d) => setData((prev) => prev ? { ...prev, casesByLawyerChart: d.casesByLawyerChart } : null)).catch(console.error);
	}, [lawyerChartMonth]);

	if (loading) {
		return (
			<div className="flex flex-col gap-6">
				<div>
					<Skeleton className="h-7 w-64" />
					<Skeleton className="h-4 w-80 mt-2" />
				</div>
				<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Card key={i} className="border-l-4 border-l-muted">
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-4 rounded" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16" />
							</CardContent>
						</Card>
					))}
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
					<div className="xl:col-span-2 rounded-xl border bg-card p-5">
						<Skeleton className="h-5 w-48 mb-4" />
						<Skeleton className="h-55 w-full rounded" />
					</div>
					<div className="rounded-xl border bg-card p-5">
						<Skeleton className="h-5 w-40 mb-4" />
						<Skeleton className="h-55 w-full rounded" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="flex items-center justify-center h-64 text-red-500 dark:text-red-400 text-sm">
				Error al cargar estadísticas: {error}
			</div>
		);
	}

	const { statsCards, filesByProcessType, casesByLawyer, casesByLawyerChart, casesByStatus, monthlyTrend, filesByType, filesByJurisdiction, filesByCourt } = data;

	// ── Series de gráficos ──────────────────────────────────────────────────────

	const trendOptions: ApexOptions = {
		chart: { type: "area", toolbar: { show: false }, zoom: { enabled: false } },
		stroke: { curve: "smooth", width: 2 },
		fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
		colors: ["#3b82f6"],
		xaxis: { categories: monthlyTrend.map((m) => m.label), labels: baseAxisLabel },
		yaxis: { labels: { ...baseAxisLabel, formatter: (v) => String(Math.round(v)) } },
		tooltip: { theme: "dark", y: { formatter: (v) => `${v} causas` } },
		grid: baseGrid,
		dataLabels: { enabled: false },
	};
	const trendSeries = [{ name: "Causas creadas", data: monthlyTrend.map((m) => m.count) }];

	const fileTypeLabels = filesByType.map((f) => {
		const match = FILES_TYPE.find((t) => String(t.value) === String(f.filetype));
		return match ? match.label : `Tipo ${f.filetype}`;
	});
	const fileTypeOptions: ApexOptions = {
		chart: { type: "donut" },
		labels: fileTypeLabels,
		colors: ["#3b82f6", "#10b981", "#f59e0b"],
		legend: { position: "bottom", fontSize: "12px", labels: { colors: LABEL_COLOR } },
		dataLabels: { formatter: (v: number) => `${v.toFixed(1)}%` },
		plotOptions: { pie: { donut: { size: "65%" } } },
		tooltip: { theme: "dark", y: { formatter: (v) => `${v} expedientes` } },
	};
	const fileTypeSeries = filesByType.map((f) => f.count);

	const processTypeOptions: ApexOptions = {
		chart: { type: "bar", toolbar: { show: false } },
		plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "70%" } },
		colors: ["#3b82f6"],
		xaxis: { labels: baseAxisLabel },
		yaxis: { labels: { style: { fontSize: "10px", colors: AXIS_COLOR }, formatter: (v: any) => { const s = String(v); return s.length > 32 ? s.substring(0, 30) + "…" : s; } } },
		grid: baseGrid,
		dataLabels: { enabled: true, style: { fontSize: "11px", colors: ["#fff"] } },
		tooltip: { theme: "dark", y: { formatter: (v) => `${v} expedientes` } },
	};
	const processTypeSeries = [{ name: "Expedientes", data: filesByProcessType.map((f) => ({ x: f.label, y: f.count })) }];

	const lawyerOptions: ApexOptions = {
		chart: { type: "bar", toolbar: { show: false } },
		plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", distributed: true } },
		colors: CHART_COLORS,
		xaxis: { categories: casesByLawyerChart.map((l) => l.name.split(" ")[0]), labels: baseAxisLabel },
		yaxis: { labels: { ...baseAxisLabel, formatter: (v) => String(Math.round(v)) } },
		legend: { show: false },
		dataLabels: { enabled: true, style: { fontSize: "11px" } },
		grid: baseGrid,
		tooltip: { theme: "dark", custom: ({ dataPointIndex }: any) => {
			const l = casesByLawyerChart[dataPointIndex];
			return `<div class="px-3 py-2 text-sm"><b>${l.name}</b><br/>${l.count} causas</div>`;
		}},
	};
	const lawyerSeries = [{ name: "Causas", data: casesByLawyerChart.map((l) => l.count) }];

	const statusOptions: ApexOptions = {
		chart: { type: "donut" },
		labels: casesByStatus.map((s) => STATUS_LABELS[s.status] ?? s.status),
		colors: STATUS_COLORS,
		legend: { position: "bottom", fontSize: "12px", labels: { colors: LABEL_COLOR } },
		dataLabels: { formatter: (v: number) => `${v.toFixed(1)}%` },
		plotOptions: { pie: { donut: { size: "65%" } } },
		tooltip: { theme: "dark", y: { formatter: (v) => `${v} causas` } },
	};
	const statusSeries = casesByStatus.map((s) => s.count);

	const hBarBase: ApexOptions = {
		chart: { type: "bar", toolbar: { show: false } },
		plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: "65%" } },
		grid: baseGrid,
		dataLabels: { enabled: true, style: { fontSize: "11px", colors: ["#fff"] } },
		xaxis: { labels: baseAxisLabel },
		tooltip: { theme: "dark" },
	};

	const jurisdictionOptions: ApexOptions = { ...hBarBase, colors: ["#8b5cf6"], tooltip: { theme: "dark", y: { formatter: (v) => `${v} expedientes` } } };
	const jurisdictionSeries = [{ name: "Expedientes", data: filesByJurisdiction.map((j) => ({ x: j.name, y: j.count })) }];

	const courtOptions: ApexOptions = {
		...hBarBase, colors: ["#14b8a6"],
		yaxis: { labels: { style: { fontSize: "10px", colors: AXIS_COLOR }, formatter: (v: any) => { const s = String(v); return s.length > 35 ? s.substring(0, 33) + "…" : s; } } },
		tooltip: { theme: "dark", y: { formatter: (v) => `${v} expedientes` } },
	};
	const courtSeries = [{ name: "Expedientes", data: filesByCourt.map((c) => ({ x: c.name, y: c.count })) }];

	// ── Opciones de mes ────────────────────────────────────────────────────────
	const now = new Date();
	const monthOptions = Array.from({ length: 12 }, (_, i) => {
		const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
		return {
			value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
			label: d.toLocaleDateString("es-AR", { month: "short", year: "numeric" }),
		};
	});

	const lawyerTotal = casesByLawyer.reduce((acc, l) => acc + l.count, 0);

	// ── Podio top 3 ──────────────────────────────────────────────────────────────
	const top3 = casesByLawyer.slice(0, 3);
	const PODIUM_CONFIG = [
		{ rank: 1, icon: <Trophy key="t" className="h-7 w-7 text-yellow-400" />, height: "h-28", color: "bg-yellow-500/10 ring-2 ring-yellow-400/50" },
		{ rank: 2, icon: <Medal key="m" className="h-6 w-6 text-slate-400" />, height: "h-20", color: "bg-muted/50" },
		{ rank: 3, icon: <Award key="a" className="h-6 w-6 text-amber-500" />, height: "h-16", color: "bg-amber-500/10" },
	];
	const podiumSlots = top3.length >= 3
		? [top3[1], top3[0], top3[2]].map((lawyer, pos) => ({ lawyer, ...PODIUM_CONFIG[pos === 0 ? 1 : pos === 1 ? 0 : 2] }))
		: top3.map((lawyer, i) => ({ lawyer, ...PODIUM_CONFIG[i] }));

	return (
		<div className="flex flex-col gap-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold text-foreground">Reporte de Causas Legales</h2>
				<p className="text-sm text-muted-foreground mt-0.5">Estadísticas generales del área legal</p>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
				<StatCard icon={<Scale className="h-4 w-4 text-blue-500" />} borderColor="border-l-blue-500" label="Causas Totales" value={statsCards.totalCases} />
				<StatCard icon={<TrendingUp className="h-4 w-4 text-green-500" />} borderColor="border-l-green-500" label="Causas Activas" value={statsCards.activeCases} />
				<StatCard icon={<Briefcase className="h-4 w-4 text-amber-500" />} borderColor="border-l-amber-500" label="En Cierre" value={statsCards.closingCases} />
				<StatCard icon={<Archive className="h-4 w-4 text-muted-foreground" />} borderColor="border-l-slate-500" label="Archivadas" value={statsCards.archivedCases} />
				<StatCard icon={<FileText className="h-4 w-4 text-purple-500" />} borderColor="border-l-purple-500" label="Expedientes" value={statsCards.totalFiles} />
				<StatCard icon={<UserX className="h-4 w-4 text-red-500" />} borderColor="border-l-red-500" label="Sin Abogado" value={statsCards.unassignedCases} />
			</div>

			{/* Tendencia mensual + Tipo de expediente */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
				<ChartCard className="xl:col-span-2" title="Tendencia de Causas — Últimos 12 meses"
					filter={
						<Select value={trendFilter} onValueChange={setTrendFilter}>
							<SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Todos</SelectItem>
								<SelectItem value="active">Solo Activos</SelectItem>
								<SelectItem value="archived">Archivados</SelectItem>
							</SelectContent>
						</Select>
					}>
					<ApexChart type="area" options={trendOptions} series={trendSeries} height={220} />
				</ChartCard>

				<ChartCard title="Expedientes por Tipo">
					{filesByType.length > 0 ? (
						<ApexChart type="donut" options={fileTypeOptions} series={fileTypeSeries} height={220} />
					) : <EmptyState />}
				</ChartCard>
			</div>

			{/* Expedientes por Tipo de Proceso */}
			<ChartCard title="Expedientes por Tipo de Proceso"
				filter={
					<Select value={processFilter} onValueChange={setProcessFilter}>
						<SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Todos</SelectItem>
							<SelectItem value="7">Últimos 7 días</SelectItem>
							<SelectItem value="15">Últimos 15 días</SelectItem>
							<SelectItem value="30">Últimos 30 días</SelectItem>
							<SelectItem value="90">Últimos 90 días</SelectItem>
						</SelectContent>
					</Select>
				}>
				{filesByProcessType.length > 0 ? (
					<ApexChart type="bar" options={processTypeOptions} series={processTypeSeries} height={Math.max(280, filesByProcessType.length * 36)} />
				) : <EmptyState />}
			</ChartCard>

			{/* Ranking de Abogados + Estado de Causas */}
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				<ChartCard title="Ranking de Abogados — Causas Activas"
					filter={
						<Select value={lawyerMonth || "_all"} onValueChange={(v) => setLawyerMonth(v === "_all" ? "" : v)}>
							<SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="_all">Todos los meses</SelectItem>
								{monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
							</SelectContent>
						</Select>
					}>
					{/* Podio top 3 */}
					{top3.length >= 2 && (
						<div className="flex items-end justify-center gap-3 mb-6">
							{podiumSlots.map(({ lawyer, rank, icon, height, color }) => (
								<div key={lawyer.id} className="flex flex-col items-center gap-1 flex-1 max-w-30">
									{icon}
									<div className={`w-full rounded-t-lg ${height} ${color} flex items-center justify-center`}>
										<span className="text-lg font-bold text-foreground">{lawyer.count}</span>
									</div>
									<span className="text-xs text-center font-medium text-muted-foreground leading-tight">{lawyer.name}</span>
									<span className="text-[10px] text-muted-foreground/60">#{rank}</span>
								</div>
							))}
						</div>
					)}

					{casesByLawyer.length > 0 ? (
						<div className="overflow-hidden rounded-lg border">
							<Table className="w-full">
								<TableHeader className="bg-muted/50">
									<TableRow>
										<TableCell className="px-3 py-2 text-xs font-semibold w-8">#</TableCell>
										<TableCell className="px-3 py-2 text-xs font-semibold">Abogado</TableCell>
										<TableCell className="px-3 py-2 text-xs font-semibold text-right">Causas</TableCell>
										<TableCell className="px-3 py-2 text-xs font-semibold text-right">%</TableCell>
									</TableRow>
								</TableHeader>
								<TableBody>
									{casesByLawyer.map((lawyer, idx) => (
										<TableRow key={lawyer.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
											<TableCell className="px-3 py-2 text-xs text-muted-foreground">{idx + 1}</TableCell>
											<TableCell className="px-3 py-2">
												<span className="font-medium text-sm text-foreground">{lawyer.name}</span>
												{lawyer.email && <span className="block text-xs text-muted-foreground">{lawyer.email}</span>}
											</TableCell>
											<TableCell className="px-3 py-2 text-right font-semibold text-foreground">{lawyer.count}</TableCell>
											<TableCell className="px-3 py-2 text-right text-xs text-muted-foreground">
												{lawyerTotal > 0 ? ((lawyer.count / lawyerTotal) * 100).toFixed(1) : 0}%
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					) : <EmptyState />}
				</ChartCard>

				<ChartCard title="Distribución por Estado">
					{casesByStatus.length > 0 ? (
						<>
							<ApexChart type="donut" options={statusOptions} series={statusSeries} height={260} />
							<div className="mt-4 space-y-2">
								{casesByStatus.map((s, idx) => (
									<div key={s.status} className="flex items-center justify-between text-sm">
										<div className="flex items-center gap-2">
											<span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length] }} />
											<span className="text-muted-foreground">{STATUS_LABELS[s.status] ?? s.status}</span>
										</div>
										<div className="flex items-center gap-3">
											<span className="font-semibold text-foreground">{s.count}</span>
											<span className="text-xs text-muted-foreground w-12 text-right">
												{statsCards.totalCases > 0 ? ((s.count / statsCards.totalCases) * 100).toFixed(1) : 0}%
											</span>
										</div>
									</div>
								))}
							</div>
						</>
					) : <EmptyState />}
				</ChartCard>
			</div>

			{/* Gráfico de barras abogados */}
			{casesByLawyerChart.length > 0 && (
				<ChartCard title="Causas por Abogado"
					filter={
						<Select value={lawyerChartMonth || "_all"} onValueChange={(v) => setLawyerChartMonth(v === "_all" ? "" : v)}>
							<SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
							<SelectContent>
								<SelectItem value="_all">Todos los meses</SelectItem>
								{monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
							</SelectContent>
						</Select>
					}>
					<ApexChart type="bar" options={lawyerOptions} series={lawyerSeries} height={260} />
				</ChartCard>
			)}

			{/* Jurisdicción + Radicación */}
			<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
				<ChartCard title="Expedientes por Jurisdicción">
					{filesByJurisdiction.length > 0 ? (
						<ApexChart type="bar" options={jurisdictionOptions} series={jurisdictionSeries} height={Math.max(220, filesByJurisdiction.length * 42)} />
					) : <EmptyState />}
				</ChartCard>

				<ChartCard title="Expedientes por Radicación (Juzgado)">
					{filesByCourt.length > 0 ? (
						<ApexChart type="bar" options={courtOptions} series={courtSeries} height={Math.max(220, filesByCourt.length * 38)} />
					) : <EmptyState />}
				</ChartCard>
			</div>
		</div>
	);
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function ChartCard({ title, filter, children, className = "" }: { title: string; filter?: React.ReactNode; children: React.ReactNode; className?: string }) {
	return (
		<div className={`rounded-xl border bg-card p-5 ${className}`}>
			<div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
				<h3 className="text-sm font-semibold text-foreground">{title}</h3>
				{filter}
			</div>
			{children}
		</div>
	);
}

function StatCard({ icon, borderColor, label, value }: { icon: React.ReactNode; borderColor: string; label: string; value: number }) {
	return (
		<Card className={`border-l-4 ${borderColor}`}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
				{icon}
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold text-foreground">{value.toLocaleString("es-AR")}</div>
			</CardContent>
		</Card>
	);
}

function EmptyState() {
	return (
		<div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
			Sin datos disponibles
		</div>
	);
}
