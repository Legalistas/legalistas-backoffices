"use client";

import {
	ChevronLeft,
	ChevronRight,
	Target,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import CrmMonthlyFilters from "@/components/crm/CrmMonthlyFilters";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { STATISTICS_CRM_ALL_ENDPOINT } from "@/constant/api-endpoints";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ReportSalesPage() {
	const { data: session } = useSession();
	const [yearFilter, setYearFilter] = useState(
		String(new Date().getFullYear()),
	);
	const [monthFilter, setMonthFilter] = useState(
		String(new Date().getMonth() + 1).padStart(2, "0"),
	);
	const [data, setData] = useState({
		oportunidadesCreadas: 0,
		oportunidadesGanadas: 0,
		oportunidadesPerdidas: 0,
		tasaConversion: 0,
		tendenciaCreadas: 0,
		tendenciaGanadas: 0,
		tendenciaPerdidas: 0,
		tendenciaConversion: 0,
	});
	const [monthlyLeadsData, setMonthlyLeadsData] = useState<
		{ month: string; ganadas: number; perdidas: number }[]
	>([]);
	const [channelLeadsData, setChannelLeadsData] = useState<
		{ name: string; value: number }[]
	>([]);
	const [salesBySellerData, setSalesBySellerData] = useState<
		{ name: string; value: number }[]
	>([]);
	const [salesByStateData, setSalesByStateData] = useState<
		{ name: string; value: number }[]
	>([]);
	const [leadsGanadasPersonasTable, setLeadsGanadasPersonasTable] = useState<
		{ nombreCompleto: string; email: string }[]
	>([]);
	const [loading, setLoading] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 5;

	const months = useMemo(
		() => [
			{ value: "01", label: "Enero" },
			{ value: "02", label: "Febrero" },
			{ value: "03", label: "Marzo" },
			{ value: "04", label: "Abril" },
			{ value: "05", label: "Mayo" },
			{ value: "06", label: "Junio" },
			{ value: "07", label: "Julio" },
			{ value: "08", label: "Agosto" },
			{ value: "09", label: "Septiembre" },
			{ value: "10", label: "Octubre" },
			{ value: "11", label: "Noviembre" },
			{ value: "12", label: "Diciembre" },
		],
		[],
	);

	// Chart configs
	const barChartOptions = useMemo(
		() => ({
			chart: { type: "bar" as const, height: 300, stacked: true, toolbar: { show: false }, background: "transparent" },
			plotOptions: { bar: { horizontal: false, borderRadius: 10, borderRadiusApplication: "end" as const, borderRadiusWhenStacked: "last" as const, dataLabels: { total: { enabled: true, style: { fontSize: "13px", fontWeight: 900 } } } } },
			dataLabels: { enabled: false },
			stroke: { show: true, width: 2, colors: ["transparent"] },
			xaxis: { categories: monthlyLeadsData.map((item) => item.month), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#94a3b8", fontSize: "12px" } } },
			yaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: "#94a3b8", fontSize: "12px" } } },
			fill: { opacity: 1 },
			tooltip: { theme: "dark", y: { formatter: (val: number) => val + " oportunidades" } },
			legend: { position: "bottom" as const, horizontalAlign: "center" as const, fontSize: "12px", labels: { colors: "#cbd5e1" }, markers: { size: 4 } },
			colors: ["#10b981", "#ef4444"],
			grid: { borderColor: "#334155", strokeDashArray: 3 },
		}),
		[monthlyLeadsData],
	);

	const barChartSeries = useMemo(() => [
		{ name: "Ganadas", data: monthlyLeadsData.map((item) => item.ganadas) },
		{ name: "Perdidas", data: monthlyLeadsData.map((item) => item.perdidas) },
	], [monthlyLeadsData]);

	const donutChartOptions = useMemo(
		() => ({
			chart: { type: "donut" as const, height: 300 },
			labels: channelLeadsData.map((item) => item.name),
			colors: ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280", "#3b82f6", "#ec4899"],
			plotOptions: { pie: { donut: { size: "60%" } } },
			dataLabels: { enabled: false },
			tooltip: { theme: "dark", y: { formatter: (val: number) => val + " leads" } },
			legend: { position: "bottom" as const, horizontalAlign: "center" as const, fontSize: "12px", labels: { colors: "#cbd5e1" }, markers: { size: 4 } },
		}),
		[channelLeadsData],
	);

	const donutChartSeries = useMemo(() => channelLeadsData.map((item) => item.value), [channelLeadsData]);

	const salesBySellerChartOptions = useMemo(
		() => ({
			chart: { type: "bar" as const, height: 300, toolbar: { show: false }, background: "transparent" },
			plotOptions: { bar: { horizontal: false, columnWidth: "50%", borderRadius: 5 } },
			dataLabels: { enabled: false },
			xaxis: { categories: salesBySellerData.map((item) => item.name), labels: { style: { colors: "#94a3b8", fontSize: "12px" } } },
			yaxis: { title: { text: "Oportunidades Ganadas", style: { color: "#94a3b8" } }, labels: { style: { colors: "#94a3b8", fontSize: "12px" } } },
			fill: { opacity: 1 },
			tooltip: { theme: "dark", y: { formatter: (val: number) => val + " oportunidades" } },
			legend: { show: false },
			colors: ["#3b82f6"],
			grid: { borderColor: "#334155", strokeDashArray: 3 },
		}),
		[salesBySellerData],
	);

	const salesBySellerChartSeries = useMemo(() => [{ name: "Oportunidades Ganadas", data: salesBySellerData.map((item) => item.value) }], [salesBySellerData]);

	const salesByStateChartOptions = useMemo(
		() => ({
			chart: { type: "bar" as const, height: 300, toolbar: { show: false }, background: "transparent" },
			plotOptions: { bar: { horizontal: false, columnWidth: "50%", borderRadius: 5 } },
			dataLabels: { enabled: false },
			xaxis: { categories: salesByStateData.map((item) => item.name), labels: { style: { colors: "#94a3b8", fontSize: "12px" } } },
			yaxis: { title: { text: "Oportunidades Ganadas", style: { color: "#94a3b8" } }, labels: { style: { colors: "#94a3b8", fontSize: "12px" } } },
			fill: { opacity: 1 },
			tooltip: { theme: "dark", y: { formatter: (val: number) => val + " oportunidades" } },
			legend: { show: false },
			colors: ["#06b6d4"],
			grid: { borderColor: "#334155", strokeDashArray: 3 },
		}),
		[salesByStateData],
	);

	const salesByStateChartSeries = useMemo(() => [{ name: "Oportunidades Ganadas", data: salesByStateData.map((item) => item.value) }], [salesByStateData]);

	const fetchStatistics = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		setLoading(true);
		try {
			const res = await fetch(
				`${STATISTICS_CRM_ALL_ENDPOINT}?year=${yearFilter}&month=${monthFilter}`,
				{ headers: { Authorization: `Bearer ${session?.user?.accessToken}` } },
			);
			if (!res.ok) return;
			const response = await res.json();

			if (response.statsCard) {
				setData({
					oportunidadesCreadas: response.statsCard.oportunidadesCreadas || 0,
					oportunidadesGanadas: response.statsCard.oportunidadesGanadas || 0,
					oportunidadesPerdidas: response.statsCard.oportunidadesPerdidas || 0,
					tasaConversion: response.statsCard.tasaConversion || 0,
					tendenciaCreadas: response.statsCard.tendenciaCreadas || 0,
					tendenciaGanadas: response.statsCard.tendenciaGanadas || 0,
					tendenciaPerdidas: response.statsCard.tendenciaPerdidas || 0,
					tendenciaConversion: response.statsCard.tendenciaConversion || 0,
				});
			}

			setMonthlyLeadsData(response.monthlyLeadsData || []);
			setChannelLeadsData(response.channelLeadsData || []);
			setSalesBySellerData(response.salesBySellerData || []);

			const salesLocationData = [...(response.salesByLocationData || [])];
			const existingLocations = salesLocationData.map((item: any) => item.name.toLowerCase());
			if (!existingLocations.includes("caba") && !existingLocations.includes("ciudad autónoma de buenos aires")) {
				salesLocationData.push({ name: "CABA", value: 0 });
			}
			if (!existingLocations.includes("rafaela")) {
				salesLocationData.push({ name: "Rafaela", value: 0 });
			}
			salesLocationData.sort((a: any, b: any) => b.value - a.value);
			setSalesByStateData(salesLocationData);
			setLeadsGanadasPersonasTable(response.leadsGanadasPersonas || []);
			setCurrentPage(1);
		} catch (error) {
			console.error("Error fetching statistics:", error);
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, yearFilter, monthFilter]);

	useEffect(() => {
		fetchStatistics();
	}, [fetchStatistics]);

	// Pagination
	const totalPages = Math.ceil(leadsGanadasPersonasTable.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const currentTableData = leadsGanadasPersonasTable.slice(startIndex, startIndex + itemsPerPage);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground">Análisis de Ventas</h1>
					<p className="text-muted-foreground">Dashboard de oportunidades y conversiones</p>
				</div>
				<div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
					<span className="text-sm font-medium text-muted-foreground">Período:</span>
					<CrmMonthlyFilters
						monthFilter={monthFilter}
						setMonthFilter={setMonthFilter}
						yearFilter={yearFilter}
						setYearFilter={setYearFilter}
					/>
				</div>
			</div>

			{/* Loading */}
			{loading && (
				<div className="py-4 text-center">
					<div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
				</div>
			)}

			{/* Métricas principales */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card className="border-l-4 border-l-blue-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
						<Target className="h-4 w-4 text-blue-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">
							{data.oportunidadesCreadas + data.oportunidadesGanadas + data.oportunidadesPerdidas}
						</div>
						<p className="text-xs text-blue-600 dark:text-blue-400">Pendientes + Ganadas + Perdidas</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-emerald-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
						<Target className="h-4 w-4 text-emerald-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">{data.oportunidadesCreadas}</div>
						<p className="text-xs text-emerald-600 dark:text-emerald-400">
							<TrendingUp className="mr-1 inline h-3 w-3" />
							{data.tendenciaCreadas > 0 ? "+" : ""}{data.tendenciaCreadas}% vs anterior
						</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-green-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Ganadas</CardTitle>
						<TrendingUp className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">{data.oportunidadesGanadas}</div>
						<p className="text-xs text-green-600 dark:text-green-400">
							<TrendingUp className="mr-1 inline h-3 w-3" />
							{data.tendenciaGanadas > 0 ? "+" : ""}{data.tendenciaGanadas}% vs anterior
						</p>
					</CardContent>
				</Card>

				<Card className="border-l-4 border-l-red-500">
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium text-muted-foreground">Perdidas</CardTitle>
						<TrendingDown className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-foreground">{data.oportunidadesPerdidas}</div>
						<p className="text-xs text-red-600 dark:text-red-400">
							<TrendingDown className="mr-1 inline h-3 w-3" />
							{data.tendenciaPerdidas > 0 ? "+" : ""}{data.tendenciaPerdidas}% vs anterior
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Gráficos */}
			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Ganadas vs Perdidas</CardTitle>
						<CardDescription>Comparación mensual de resultados</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px]">
							{monthlyLeadsData.length > 0 ? (
								<Chart options={barChartOptions} series={barChartSeries} type="bar" height={300} />
							) : (
								<div className="flex h-full items-center justify-center text-muted-foreground">
									<p>No hay datos disponibles</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Oportunidades por Canal</CardTitle>
						<CardDescription>Distribución de leads por fuente</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px]">
							{channelLeadsData.length > 0 ? (
								<Chart options={donutChartOptions} series={donutChartSeries} type="donut" height={300} />
							) : (
								<div className="flex h-full items-center justify-center text-muted-foreground">
									<p>No hay datos disponibles</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Ventas por Vendedor</CardTitle>
						<CardDescription>Oportunidades ganadas por rol</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px]">
							{salesBySellerData.length > 0 ? (
								<Chart options={salesBySellerChartOptions} series={salesBySellerChartSeries} type="bar" height={300} />
							) : (
								<div className="flex h-full items-center justify-center text-muted-foreground">
									<p>No hay datos disponibles</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Ventas por Localidad</CardTitle>
						<CardDescription>
							{months.find((m) => m.value === monthFilter)?.label} {yearFilter}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[300px]">
							{salesByStateData.length > 0 ? (
								<Chart options={salesByStateChartOptions} series={salesByStateChartSeries} type="bar" height={300} />
							) : (
								<div className="flex h-full items-center justify-center text-muted-foreground">
									<p>No hay datos disponibles</p>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabla: Oportunidades Ganadas por Persona */}
			<div>
				<h2 className="text-lg font-semibold text-foreground mb-4">Oportunidades Ganadas por Persona</h2>
				{currentTableData.length > 0 ? (
					<>
						<div className="overflow-hidden rounded-xl border">
							<Table className="w-full">
								<TableHeader className="bg-muted/50">
									<TableRow>
										<TableCell className="px-4 py-3 text-left text-sm font-semibold">Nombre Completo</TableCell>
										<TableCell className="px-4 py-3 text-left text-sm font-semibold">Email</TableCell>
									</TableRow>
								</TableHeader>
								<TableBody>
									{currentTableData.map((item, index) => (
										<TableRow key={index} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
											<TableCell className="px-4 py-3 text-sm">{item.nombreCompleto}</TableCell>
											<TableCell className="px-4 py-3 text-sm text-muted-foreground">{item.email}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
						{totalPages > 1 && (
							<div className="flex items-center justify-end gap-2 py-4">
								<Button variant="outline" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
									<ChevronLeft className="h-4 w-4 mr-1" />
									Anterior
								</Button>
								<span className="text-sm text-muted-foreground">
									Página {currentPage} de {totalPages}
								</span>
								<Button variant="outline" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
									Siguiente
									<ChevronRight className="h-4 w-4 ml-1" />
								</Button>
							</div>
						)}
					</>
				) : (
					<div className="flex items-center justify-center py-12 rounded-xl border border-dashed">
						<div className="text-center">
							<Target className="mb-3 h-10 w-10 text-muted-foreground mx-auto" />
							<p className="font-medium text-foreground">No hay datos de oportunidades ganadas</p>
							<p className="text-sm text-muted-foreground mt-1">para este período</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
