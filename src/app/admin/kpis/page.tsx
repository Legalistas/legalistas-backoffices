"use client";

import {
	Download,
	FileSpreadsheet,
	FileText,
	LayoutDashboard,
	PencilLine,
	RefreshCw,
	Table2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import {
	exportMatrixToExcel,
	exportMatrixToPdf,
} from "@/components/kpis/exportKpiMatrix";
import ActiveOpportunitiesPanel from "@/components/kpis/ActiveOpportunitiesPanel";
import CityBreakdownTable from "@/components/kpis/CityBreakdownTable";
import KpiMatrix from "@/components/kpis/KpiMatrix";
import KpiSummary from "@/components/kpis/KpiSummary";
import ManualKpiPanel from "@/components/kpis/ManualKpiPanel";
import ProvinceConsultsGrid from "@/components/kpis/ProvinceConsultsGrid";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountingKpiMatrix } from "@/components/kpis/useAccountingKpiMatrix";
import { useKpiMatrixData } from "@/components/kpis/useKpiMatrixData";
import { useMarketingKpiMatrix } from "@/components/kpis/useMarketingKpiMatrix";
import { useSalesKpiMatrix } from "@/components/kpis/useSalesKpiMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// ── Helpers de semana ISO ─────────────────────────────────────────────────
// Devuelve el número de semana ISO 8601 (1..53) para una fecha dada. La
// semana ISO empieza el lunes y la semana 1 es la que contiene el jueves 1.
function isoWeekOf(date: Date): { week: number; year: number } {
	const d = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	// Ajustar al jueves de esa semana ISO (lunes=1 … domingo=7).
	const dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const week = Math.ceil(
		((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
	);
	return { week, year: d.getUTCFullYear() };
}

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

function toISODateString(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Rango lunes-domingo (mismo criterio que ManualKpiPanel). */
function weekRangeLabel(date: Date): string {
	const d = new Date(date);
	const day = (d.getDay() + 6) % 7;
	const monday = new Date(d);
	monday.setDate(d.getDate() - day);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	return `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} — ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${sunday.getFullYear()}`;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

type Department = "legal" | "sales" | "marketing" | "accounting";

// Roles con acceso a la tab Contable (debe coincidir con el middleware
// backend en src/middlewares/accounting-role.middleware.ts).
const ACCOUNTING_ALLOWED_ROLES = [
	"administrator",
	"director_general_ceo",
	"director_area_it",
	"directora_area_contable",
];

export default function KpisPage() {
	const { data: session } = useSession();
	const [year, setYear] = useState(currentYear);
	const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
	const [view, setView] = useState<"summary" | "matrix" | "entry">("matrix");
	const [department, setDepartment] = useState<Department>("legal");
	// Granularidad del resumen: mes (default) o semana ISO.
	const [summaryGranularity, setSummaryGranularity] = useState<
		"month" | "week"
	>("month");
	const [weekRefDate, setWeekRefDate] = useState<string>(
		toISODateString(new Date()),
	);
	const isoWeek = useMemo(() => isoWeekOf(new Date(weekRefDate)), [weekRefDate]);

	// Granularidad de la Planilla: año (12 meses, default) o semanas del mes elegido.
	const [matrixGranularity, setMatrixGranularity] = useState<"year" | "week">(
		"year",
	);
	// Modo estable memoizado — sin esto los hooks disparan refetch en cada render.
	const matrixMode = useMemo<
		import("@/components/kpis/periodMode").PeriodMode
	>(
		() =>
			matrixGranularity === "week"
				? { type: "month-weeks", month }
				: { type: "year" },
		[matrixGranularity, month],
	);
	const matrixReadOnly = matrixGranularity === "week";

	// Gate por rol para la tab Contable.
	const canSeeAccounting = useMemo(() => {
		const role = session?.user?.role;
		return role ? ACCOUNTING_ALLOWED_ROLES.includes(role) : false;
	}, [session?.user?.role]);

	const departments = useMemo<
		Array<{ id: Department; label: string; enabled: boolean }>
	>(
		() => [
			{ id: "legal", label: "DPTO. LEGALES", enabled: true },
			{ id: "sales", label: "DPTO. VENTAS", enabled: true },
			{ id: "marketing", label: "DPTO. MARKETING", enabled: true },
			{
				id: "accounting",
				label: "DPTO. CONTABLE",
				enabled: canSeeAccounting,
			},
		],
		[canSeeAccounting],
	);

	// Todos los hooks se llaman siempre (React rule) — el que no está activo
	// no consume porque su output no se renderiza. El backend igual recibe
	// las requests, pero es aceptable para el MVP.
	const legalData = useKpiMatrixData(year, matrixMode);
	const salesData = useSalesKpiMatrix(year, matrixMode);
	const marketingData = useMarketingKpiMatrix(year, matrixMode);
	const accountingData = useAccountingKpiMatrix(year, matrixMode);

	const active =
		department === "legal"
			? legalData
			: department === "sales"
				? salesData
				: department === "marketing"
					? marketingData
					: accountingData;

	const departmentLabel =
		departments.find((d) => d.id === department)?.label ?? "";

	return (
		<div className="p-6 space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">KPIs</h1>
					<p className="text-sm text-muted-foreground">
						Dashboard de indicadores por área — vista planilla anual.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={String(year)}
						onValueChange={(v) => setYear(Number(v))}
					>
						<SelectTrigger className="h-9 w-28">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{yearOptions.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						variant="outline"
						size="sm"
						onClick={active.refresh}
						disabled={active.loading}
					>
						<RefreshCw
							className={`h-4 w-4 mr-2 ${active.loading ? "animate-spin" : ""}`}
						/>
						Actualizar
					</Button>
					{view === "matrix" && matrixGranularity === "year" && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									disabled={active.loading || active.sections.length === 0}
								>
									<Download className="h-4 w-4 mr-2" />
									Exportar
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() =>
										exportMatrixToExcel(active.sections, year, departmentLabel)
									}
								>
									<FileSpreadsheet className="h-4 w-4 mr-2" />
									Excel (.xlsx)
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() =>
										exportMatrixToPdf(active.sections, year, departmentLabel)
									}
								>
									<FileText className="h-4 w-4 mr-2" />
									PDF
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					<div className="inline-flex rounded-md border border-border bg-muted p-0.5">
						<button
							type="button"
							onClick={() => setView("summary")}
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
								view === "summary"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<LayoutDashboard className="h-3.5 w-3.5" />
							Resumen
						</button>
						<button
							type="button"
							onClick={() => setView("matrix")}
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
								view === "matrix"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Table2 className="h-3.5 w-3.5" />
							Planilla
						</button>
						<button
							type="button"
							onClick={() => setView("entry")}
							className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
								view === "entry"
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<PencilLine className="h-3.5 w-3.5" />
							Cargar valores
						</button>
					</div>
				</div>
			</div>

			{view === "summary" && (
				<>
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<span className="text-muted-foreground">Período:</span>
						{/* Toggle mes / semana */}
						<div className="inline-flex rounded-md border border-border bg-muted p-0.5">
							<button
								type="button"
								onClick={() => setSummaryGranularity("month")}
								className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
									summaryGranularity === "month"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Mes
							</button>
							<button
								type="button"
								onClick={() => setSummaryGranularity("week")}
								className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
									summaryGranularity === "week"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Semana
							</button>
						</div>
						{summaryGranularity === "month" ? (
							<>
								<Select
									value={String(month)}
									onValueChange={(v) => setMonth(Number(v))}
								>
									<SelectTrigger className="h-9 w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[
											"Enero",
											"Febrero",
											"Marzo",
											"Abril",
											"Mayo",
											"Junio",
											"Julio",
											"Agosto",
											"Septiembre",
											"Octubre",
											"Noviembre",
											"Diciembre",
										].map((label, i) => (
											<SelectItem key={label} value={String(i + 1)}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<span className="text-xs text-muted-foreground">
									Comparado vs mes anterior (VMA)
								</span>
							</>
						) : (
							<>
								<Label className="text-xs text-muted-foreground">
									Fecha de referencia:
								</Label>
								<Input
									type="date"
									className="h-9 max-w-45"
									value={weekRefDate}
									onChange={(e) => setWeekRefDate(e.target.value)}
								/>
								<span className="text-xs text-muted-foreground">
									Semana {isoWeek.week} ({weekRangeLabel(new Date(weekRefDate))})
									· vs semana anterior
								</span>
							</>
						)}
					</div>
					<KpiSummary
						year={summaryGranularity === "week" ? isoWeek.year : year}
						month={month}
						week={summaryGranularity === "week" ? isoWeek.week : undefined}
					/>
				</>
			)}

			{view === "matrix" && (
				<>
					{/* Selector de departamento */}
					<div className="flex flex-wrap gap-2 border-b border-border pb-2">
						{departments
							.filter((d) => d.enabled || d.id !== "accounting")
							.map((d) => (
								<button
									key={d.id}
									type="button"
									onClick={() => d.enabled && setDepartment(d.id)}
									disabled={!d.enabled}
									className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
										department === d.id
											? "bg-primary text-primary-foreground"
											: d.enabled
												? "text-muted-foreground hover:text-foreground hover:bg-muted"
												: "text-muted-foreground/40 cursor-not-allowed"
									}`}
									title={!d.enabled ? "Próximamente" : undefined}
								>
									{d.label}
									{!d.enabled && (
										<span className="ml-1 text-xs opacity-60">(pronto)</span>
									)}
								</button>
							))}
					</div>

					{/* Toggle mes/semana + selector de mes (solo relevante en modo semana) */}
					<div className="flex flex-wrap items-center gap-3 text-sm">
						<span className="text-muted-foreground">Vista:</span>
						<div className="inline-flex rounded-md border border-border bg-muted p-0.5">
							<button
								type="button"
								onClick={() => setMatrixGranularity("year")}
								className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
									matrixGranularity === "year"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Anual (12 meses)
							</button>
							<button
								type="button"
								onClick={() => setMatrixGranularity("week")}
								className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
									matrixGranularity === "week"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								Semanal (mes elegido)
							</button>
						</div>
						{matrixGranularity === "week" && (
							<>
								<Label className="text-xs text-muted-foreground">Mes:</Label>
								<Select
									value={String(month)}
									onValueChange={(v) => setMonth(Number(v))}
								>
									<SelectTrigger className="h-9 w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[
											"Enero",
											"Febrero",
											"Marzo",
											"Abril",
											"Mayo",
											"Junio",
											"Julio",
											"Agosto",
											"Septiembre",
											"Octubre",
											"Noviembre",
											"Diciembre",
										].map((label, i) => (
											<SelectItem key={label} value={String(i + 1)}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<span className="text-xs text-muted-foreground">
									Solo lectura — para cargar valores usá "Cargar valores".
								</span>
							</>
						)}
					</div>

					<KpiMatrix
						year={year}
						sections={active.sections}
						loading={active.loading}
						departmentLabel={departmentLabel}
						onValueChanged={active.refresh}
						periodLabels={active.periodLabels}
						readOnly={matrixReadOnly}
						accumulatedLabel={
							matrixGranularity === "week" ? "TOTAL MES" : undefined
						}
					/>

					{/* Detalle por ciudad (punto 7.3 del doc): fuera de la planilla
					    principal, buscable. Solo aplica a Ventas. */}
					{department === "sales" && (
						<>
							{/* Oportunidades activas en vivo + histórico mensual
							    (doc "KPIs y Reportes de Ventas", puntos 1-3). */}
							<ActiveOpportunitiesPanel />
							<CityBreakdownTable year={year} mode={matrixMode} />
							{/* Consultas orgánicas/pagas por provincia (punto 7.4).
							    Acá en modo lectura; la carga vive en "Cargar valores". */}
							<ProvinceConsultsGrid year={year} month={month} readOnly />
						</>
					)}
				</>
			)}

			{view === "entry" && (
				<div className="max-w-6xl">
					<ManualKpiPanel />
				</div>
			)}
		</div>
	);
}
