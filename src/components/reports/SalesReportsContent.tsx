"use client";

import {
	BarChart3,
	Calendar,
	Download,
	FileText,
	MapPin,
	TrendingUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import CrmMonthlyFilters from "@/components/crm/CrmMonthlyFilters";
import CrmStatisticsWidget from "@/components/crm/CrmStatisticsWidget";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { STATISTICS_CRM_ALL_ENDPOINT } from "@/constant/api-endpoints";

interface SalesReportsContentProps {
	className?: string;
}

const LOCATION_COLORS = [
	{ bg: "bg-green-100 dark:bg-green-900/30", border: "border-green-200 dark:border-green-800", badge: "bg-green-500 text-white", text: "text-green-600 dark:text-green-400" },
	{ bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-500 text-white", text: "text-blue-600 dark:text-blue-400" },
	{ bg: "bg-purple-100 dark:bg-purple-900/30", border: "border-purple-200 dark:border-purple-800", badge: "bg-purple-500 text-white", text: "text-purple-600 dark:text-purple-400" },
	{ bg: "bg-muted/50", border: "border-border", badge: "bg-muted-foreground/20 text-muted-foreground", text: "text-muted-foreground" },
	{ bg: "bg-muted/50", border: "border-border", badge: "bg-muted-foreground/20 text-muted-foreground", text: "text-muted-foreground" },
];

export const SalesReportsContent: React.FC<SalesReportsContentProps> = ({
	className = "",
}) => {
	const { data: session } = useSession();
	const [monthFilter, setMonthFilter] = useState(
		String(new Date().getMonth() + 1).padStart(2, "0"),
	);
	const [yearFilter, setYearFilter] = useState(
		String(new Date().getFullYear()),
	);

	const [salesByLocationData, setSalesByLocationData] = useState<
		{ name: string; value: number }[]
	>([]);
	const [isLoadingLocation, setIsLoadingLocation] = useState(false);

	useEffect(() => {
		const fetchLocationData = async () => {
			if (!session?.user?.accessToken) return;

			setIsLoadingLocation(true);
			try {
				const res = await fetch(
					`${STATISTICS_CRM_ALL_ENDPOINT}?year=${yearFilter}&month=${monthFilter}`,
					{
						headers: {
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
					},
				);

				if (!res.ok) {
					console.error("Error fetching location statistics");
					return;
				}

				const response = await res.json();
				const locationData = [...(response.salesByLocationData || [])];

				const existingLocations = locationData.map((item: any) =>
					item.name.toLowerCase(),
				);

				if (
					!existingLocations.includes("caba") &&
					!existingLocations.includes("ciudad autónoma de buenos aires")
				) {
					locationData.push({ name: "CABA", value: 0 });
				}

				if (!existingLocations.includes("rafaela")) {
					locationData.push({ name: "Rafaela", value: 0 });
				}

				locationData.sort((a: any, b: any) => b.value - a.value);
				setSalesByLocationData(locationData.slice(0, 5));
			} catch (error) {
				console.error("Error fetching location statistics:", error);
			} finally {
				setIsLoadingLocation(false);
			}
		};

		fetchLocationData();
	}, [session?.user?.accessToken, monthFilter, yearFilter]);

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
						<FileText className="h-6 w-6" />
						Reportes de Ventas
					</h1>
					<p className="text-muted-foreground mt-1">
						Análisis detallado del rendimiento de ventas y estadísticas del CRM
					</p>
				</div>
				<Button>
					<Download className="h-4 w-4" />
					Exportar Reporte
				</Button>
			</div>

			{/* Filtros */}
			<div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
				<span className="text-sm font-medium text-muted-foreground">Período:</span>
				<CrmMonthlyFilters
					monthFilter={monthFilter}
					setMonthFilter={setMonthFilter}
					yearFilter={yearFilter}
					setYearFilter={setYearFilter}
					className="flex-wrap"
				/>
			</div>

			{/* Widget de Estadísticas */}
			<CrmStatisticsWidget
				monthFilter={monthFilter}
				yearFilter={yearFilter}
				defaultCollapsed={false}
			/>

			{/* Ventas por Localidad */}
			<div>
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
							<MapPin className="h-5 w-5" />
							Ventas por Localidad
						</h2>
						<p className="text-sm text-muted-foreground">
							Top ubicaciones para {getMonthLabel(monthFilter)} {yearFilter}
						</p>
					</div>
				</div>

				{isLoadingLocation ? (
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="rounded-xl border p-4 space-y-3">
								<div className="flex items-center justify-between">
									<Skeleton className="h-6 w-8 rounded-full" />
									<Skeleton className="h-4 w-4" />
								</div>
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-7 w-12" />
								<Skeleton className="h-3 w-16" />
							</div>
						))}
					</div>
				) : salesByLocationData.length > 0 ? (
					<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
						{salesByLocationData.map((location, index) => {
							const colors = LOCATION_COLORS[index] || LOCATION_COLORS[3];
							return (
								<div
									key={location.name}
									className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}
								>
									<div className="flex items-center justify-between mb-2">
										<span
											className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge}`}
										>
											#{index + 1}
										</span>
										<TrendingUp
											className={`h-4 w-4 ${
												location.value > 0 ? "text-green-500 dark:text-green-400" : "text-muted-foreground"
											}`}
										/>
									</div>
									<h3 className="font-semibold text-foreground text-sm mb-1">
										{location.name}
									</h3>
									<p className={`text-2xl font-bold ${colors.text}`}>
										{location.value}
									</p>
									<p className="text-xs text-muted-foreground">
										{location.value === 1 ? "venta" : "ventas"}
									</p>
								</div>
							);
						})}
					</div>
				) : (
					<div className="flex items-center justify-center py-12 rounded-xl border border-dashed">
						<div className="text-center">
							<BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
							<p className="font-medium text-foreground">No hay datos de ventas por localidad</p>
							<p className="text-sm text-muted-foreground mt-1">para el período seleccionado</p>
						</div>
					</div>
				)}
			</div>

			{/* Nota informativa */}
			<div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
				<div className="flex items-start gap-3">
					<Calendar className="h-5 w-5 text-primary mt-0.5" />
					<div>
						<h4 className="font-medium text-foreground mb-1">Datos Filtrados</h4>
						<p className="text-sm text-muted-foreground">
							Los reportes mostrados corresponden al período seleccionado:{" "}
							<strong className="text-foreground">
								{getMonthLabel(monthFilter)} {yearFilter}
							</strong>
							. Cambie los filtros arriba para ver diferentes períodos.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
};

function getMonthLabel(month: string): string {
	const months: Record<string, string> = {
		"01": "Enero",
		"02": "Febrero",
		"03": "Marzo",
		"04": "Abril",
		"05": "Mayo",
		"06": "Junio",
		"07": "Julio",
		"08": "Agosto",
		"09": "Septiembre",
		"10": "Octubre",
		"11": "Noviembre",
		"12": "Diciembre",
	};
	return months[month] || month;
}

export default SalesReportsContent;
