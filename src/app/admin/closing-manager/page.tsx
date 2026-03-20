"use client";

import {
	ArrowRightLeft,
	Briefcase,
	Building,
	DollarSign,
	Download,
	Loader2,
	PlusCircle,
	Terminal,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ClosingFilters, {
	type ClosingFiltersState,
} from "@/components/closing-manager/ClosingFilters";
import ClosingManagerTable, {
	ALL_CLOSING_COLUMNS,
} from "@/components/closing-manager/closing-manager-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	CLOSINGS_ENDPOINT,
	CLOSINGS_EXPORT_ENDPOINT,
	CLOSINGS_KPIS_ENDPOINT,
} from "@/constant/api-endpoints";
import { Role } from "@/constant/user";
import {
	buildFilteredUrl,
	useRolePermissions,
} from "@/hooks/useRolePermissions";
import type {
	ClosingKpis,
	ClosingManagerApiResponse,
	ClosingManagerEntry,
	Pagination,
} from "@/types/closing-manager";

const formatARS = (amount: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 0,
	}).format(amount);

export default function ClosingManagerPage() {
	const { data: session } = useSession();
	const searchParams = useSearchParams();
	const permissions = useRolePermissions();
	const [openClosingId, setOpenClosingId] = useState<number | null>(() => {
		const id = searchParams.get("openId");
		return id ? parseInt(id, 10) : null;
	});

	// Data
	const [closings, setClosings] = useState<ClosingManagerEntry[]>([]);
	const [pagination, setPagination] = useState<Pagination>({
		total: 0,
		page: 1,
		limit: 10,
		totalPages: 1,
	});
	const [kpis, setKpis] = useState<ClosingKpis | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [exporting, setExporting] = useState(false);

	// Filtro temporal (obligatorio)
	const now = new Date();
	const [month, setMonth] = useState(now.getMonth() + 1);
	const [year, setYear] = useState(now.getFullYear());
	const [viewAll, setViewAll] = useState(false);

	// Filtros avanzados
	const [filters, setFilters] = useState<ClosingFiltersState>({
		search: "",
		type: "",
		capitalState: "",
		feeStatus: "",
		pclStatus: "",
		responsibleLawyerId: "",
	});
	const [visibleColumns, setVisibleColumns] = useState<string[]>([
		...ALL_CLOSING_COLUMNS,
	]);

	// =========================================================================
	// Fetch closings
	// =========================================================================
	const fetchClosings = useCallback(
		async (page: number) => {
			if (!session?.user?.accessToken) return;
			setLoading(true);
			setError(null);
			try {
				const params: Record<string, string> = {
					page: page.toString(),
					limit: pagination.limit.toString(),
					month: month.toString(),
					year: year.toString(),
				};
				if (viewAll) params.viewAll = "true";
				if (filters.search) params.search = filters.search;
				if (filters.type) params.type = filters.type;
				if (filters.capitalState) params.capitalState = filters.capitalState;
				if (filters.feeStatus) params.feeStatus = filters.feeStatus;
				if (filters.pclStatus) params.pclStatus = filters.pclStatus;
				if (filters.responsibleLawyerId)
					params.responsibleLawyerId = filters.responsibleLawyerId;

				const url = buildFilteredUrl(CLOSINGS_ENDPOINT, permissions, params);
				const response = await fetch(url, {
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				});

				if (!response.ok)
					throw new Error(`Error al cargar los datos: ${response.statusText}`);

				const data: ClosingManagerApiResponse = await response.json();
				setClosings(data.data);
				setPagination(data.meta);
			} catch (err) {
				console.error("Error fetching closings:", err);
				setError("No se pudieron cargar los datos de cierres.");
			} finally {
				setLoading(false);
			}
		},
		[
			pagination.limit,
			month,
			year,
			viewAll,
			filters,
			session?.user?.accessToken,
			permissions,
		],
	);

	// =========================================================================
	// Fetch KPIs
	// =========================================================================
	const fetchKpis = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		try {
			const params: Record<string, string> = {
				month: month.toString(),
				year: year.toString(),
				view: viewAll ? "annual" : "monthly",
			};
			const url = buildFilteredUrl(CLOSINGS_KPIS_ENDPOINT, permissions, params);
			const response = await fetch(url, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});
			if (response.ok) {
				const json = await response.json();
				setKpis(json.data);
			}
		} catch {
			// Silent fail for KPIs
		}
	}, [month, year, viewAll, session?.user?.accessToken, permissions]);

	// =========================================================================
	// Export
	// =========================================================================
	const handleExport = async (format: "xlsx" | "csv") => {
		if (!session?.user?.accessToken) return;
		setExporting(true);
		try {
			const params: Record<string, string> = {
				format,
				month: month.toString(),
				year: year.toString(),
			};
			if (viewAll) params.viewAll = "true";
			if (filters.type) params.type = filters.type;

			const url = buildFilteredUrl(
				CLOSINGS_EXPORT_ENDPOINT,
				permissions,
				params,
			);
			const response = await fetch(url, {
				headers: {
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});

			if (!response.ok) throw new Error("Error al exportar");

			const blob = await response.blob();
			const link = document.createElement("a");
			link.href = URL.createObjectURL(blob);
			const period = viewAll
				? `año_${year}`
				: `${String(month).padStart(2, "0")}_${year}`;
			link.download = `cierres_${period}.${format}`;
			link.click();
			URL.revokeObjectURL(link.href);
		} catch (err) {
			console.error("Error exporting:", err);
			toast.error("Error al exportar los cierres");
		} finally {
			setExporting(false);
		}
	};

	// =========================================================================
	// Effects
	// =========================================================================
	useEffect(() => {
		fetchClosings(1);
		setPagination((prev) => ({ ...prev, page: 1 }));
	}, [fetchClosings]);

	useEffect(() => {
		fetchKpis();
	}, [fetchKpis]);

	const handlePageChange = (newPage: number) => {
		if (newPage >= 1 && newPage <= pagination.totalPages) {
			setPagination((prev) => ({ ...prev, page: newPage }));
			fetchClosings(newPage);
		}
	};

	const handleFiltersChange = (newFilters: ClosingFiltersState) => {
		setFilters(newFilters);
		setPagination((prev) => ({ ...prev, page: 1 }));
	};

	// =========================================================================
	// KPI cards config
	// =========================================================================
	const FINANCIAL_KPI_ROLES = [
		Role.ADMINISTRATOR,
		Role.DIRECTOR_GENERAL_CEO,
		Role.GERENTE_GENERAL_COO,
		Role.DIRECTOR_AREA_IT,
		Role.DIRECTORA_AREA_CONTABLE,
	];

	const HONORARIOS_KPI_ROLES = [
		...FINANCIAL_KPI_ROLES,
		Role.ABOGADO_REPRESENTANTE,
	];

	const canSeeFinancialKpis = FINANCIAL_KPI_ROLES.includes(
		session?.user?.role as Role,
	);

	const canSeeHonorarios = HONORARIOS_KPI_ROLES.includes(
		session?.user?.role as Role,
	);

	// Configuración de las tarjetas KPI, con lógica para mostrar u ocultar KPIs financieros según el rol del usuario


	const kpiCards = [
		{
			label: "Cierres del mes",
			value: kpis?.count ?? 0,
			format: "number" as const,
			icon: TrendingUp,
			iconBg: "bg-primary/10 dark:bg-primary/20",
			iconColor: "text-primary",
			valueColor: "text-gray-900 dark:text-white",
		},
		{
			label: "Capital cerrado",
			value: kpis?.totalCapital ?? 0,
			format: "currency" as const,
			icon: DollarSign,
			iconBg: "bg-green-100 dark:bg-green-900/30",
			iconColor: "text-green-600",
			valueColor: "text-green-600",
		},
		...(canSeeHonorarios
			? [
				{
					label: "Honorarios generados",
					value: kpis?.totalHonorarios ?? 0,
					format: "currency" as const,
					icon: Briefcase,
					iconBg: "bg-blue-100 dark:bg-blue-900/30",
					iconColor: "text-blue-600",
					valueColor: "text-blue-600",
				},
			]
			: []),
		...(canSeeFinancialKpis
			? [
				{
					label: "Neto Legalistas",
					value: kpis?.totalNetoLegalistas ?? 0,
					format: "currency" as const,
					icon: Building,
					iconBg: "bg-purple-100 dark:bg-purple-900/30",
					iconColor: "text-purple-600",
					valueColor: "text-purple-600",
				},
				{
					label: "Total a transferir",
					value: kpis?.totalTransferir ?? 0,
					format: "currency" as const,
					icon: ArrowRightLeft,
					iconBg: "bg-primary/10 dark:bg-primary/20",
					iconColor: "text-primary",
					valueColor: "text-primary",
				},
			]
			: []),
	];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
						Gestor de Cierres
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
						Administra y gestiona los cierres de causas
					</p>
				</div>
				<div className="flex items-center gap-3">
					{/* Exportar */}
					<div className="relative group">
						<Button
							variant="outline"
							className="flex items-center gap-2"
							disabled={exporting}
						>
							{exporting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							Exportar
						</Button>
						<div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 hidden group-hover:block">
							<button
								onClick={() => handleExport("xlsx")}
								disabled={exporting}
								className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
							>
								Excel (.xlsx)
							</button>
							<button
								onClick={() => handleExport("csv")}
								disabled={exporting}
								className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
							>
								CSV (.csv)
							</button>
						</div>
					</div>

					{/* Nuevo Cierre */}
					<Link href="/admin/closing-manager/create">
						<Button
							variant="default"
							className="flex items-center gap-2 bg-primary text-white hover:bg-primary/85 px-4 py-2.5 rounded-lg shadow-sm"
						>
							<PlusCircle className="h-4 w-4" />
							Nuevo Cierre
						</Button>
					</Link>
				</div>
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				{kpiCards.map((kpi) => (
					<div
						key={kpi.label}
						className="bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm"
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
									{kpi.label}
								</p>
								<p className={`text-xl font-bold mt-1 ${kpi.valueColor}`}>
									{kpi.format === "currency" ? formatARS(kpi.value) : kpi.value}
								</p>
							</div>
							<div
								className={`h-10 w-10 rounded-lg ${kpi.iconBg} flex items-center justify-center`}
							>
								<kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Filters */}
			<ClosingFilters
				filters={filters}
				onFiltersChange={handleFiltersChange}
				visibleColumns={visibleColumns}
				onColumnsChange={setVisibleColumns}
				month={month}
				year={year}
				viewAll={viewAll}
				onMonthChange={setMonth}
				onYearChange={setYear}
				onToggleViewAll={() => setViewAll(!viewAll)}
			/>

			{/* Content */}
			<div className="relative">
				{error && (
					<Alert variant="destructive" className="mb-4">
						<Terminal className="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				{loading && closings.length === 0 ? (
					<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
						<div className="bg-gray-50 dark:bg-white/5 px-4 py-3 flex gap-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-4 w-24" />
							))}
						</div>
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-gray-100 dark:border-gray-800">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-4 w-16" />
								<Skeleton className="h-6 w-20 rounded-full" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-4 w-28" />
								<div className="flex gap-1 ml-auto">
									<Skeleton className="h-7 w-7 rounded-md" />
									<Skeleton className="h-7 w-7 rounded-md" />
									<Skeleton className="h-7 w-7 rounded-md" />
								</div>
							</div>
						))}
					</div>
				) : loading && closings.length > 0 ? (
					<div className="relative">
						<div className="absolute inset-0 bg-background/60 z-10 rounded-xl backdrop-blur-[1px]" />
						<ClosingManagerTable
							closings={closings}
							pagination={pagination}
							onPageChange={handlePageChange}
							onRefresh={() => {
								fetchClosings(pagination.page);
								fetchKpis();
							}}
							visibleColumns={visibleColumns}
							openClosingId={openClosingId}
							onOpenClosingHandled={() => setOpenClosingId(null)}
						/>
					</div>
				) : !error ? (
					<ClosingManagerTable
						closings={closings}
						pagination={pagination}
						onPageChange={handlePageChange}
						onRefresh={() => {
							fetchClosings(pagination.page);
							fetchKpis();
						}}
						visibleColumns={visibleColumns}
						openClosingId={openClosingId}
						onOpenClosingHandled={() => setOpenClosingId(null)}
					/>
				) : null}
			</div>
		</div>
	);
}
