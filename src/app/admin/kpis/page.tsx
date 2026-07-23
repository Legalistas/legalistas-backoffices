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
import KpiMatrix from "@/components/kpis/KpiMatrix";
import KpiSummary from "@/components/kpis/KpiSummary";
import ManualKpiPanel from "@/components/kpis/ManualKpiPanel";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

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
	const legalData = useKpiMatrixData(year);
	const salesData = useSalesKpiMatrix(year);
	const marketingData = useMarketingKpiMatrix(year);
	const accountingData = useAccountingKpiMatrix(year);

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
					{view === "matrix" && (
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
					<div className="flex items-center gap-2 text-sm">
						<span className="text-muted-foreground">Período:</span>
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
					</div>
					<KpiSummary year={year} month={month} />
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

					<KpiMatrix
						year={year}
						sections={active.sections}
						loading={active.loading}
						departmentLabel={departmentLabel}
						onValueChanged={active.refresh}
					/>
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
