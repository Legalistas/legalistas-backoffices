"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	BarChartCard,
	ChannelDonut,
	SalesFilters,
	StatsCards,
	WonLeadsTable,
	WonLostChart,
} from "@/components/reports/sales";
import type {
	ChartDataItem,
	MonthlyChartItem,
	SalesFiltersState,
	SalesStatsCard,
	WonLeadPerson,
} from "@/components/reports/sales";
import { getInitialFilters } from "@/components/reports/sales/SalesFilters";
import { STATISTICS_CRM_ALL_ENDPOINT } from "@/constant/api-endpoints";

const INITIAL_STATS: SalesStatsCard = {
	oportunidadesCreadas: 0,
	oportunidadesGanadas: 0,
	oportunidadesPerdidas: 0,
	tasaConversion: 0,
	tendenciaCreadas: 0,
	tendenciaGanadas: 0,
	tendenciaPerdidas: 0,
	tendenciaConversion: 0,
};

function buildQueryString(filters: SalesFiltersState): string {
	const params = new URLSearchParams();
	params.set("startDate", filters.startDate);
	params.set("endDate", filters.endDate);
	if (filters.sellerId) params.set("sellerId", filters.sellerId);
	if (filters.internalLawyerId)
		params.set("internalLawyerId", filters.internalLawyerId);
	if (filters.responsibleLawyerId)
		params.set("responsibleLawyerId", filters.responsibleLawyerId);
	if (filters.sourceChannelId)
		params.set("sourceChannelId", filters.sourceChannelId);
	if (filters.servicesId) params.set("servicesId", filters.servicesId);
	if (filters.stateId) params.set("stateId", filters.stateId);
	if (filters.city) params.set("city", filters.city);
	return params.toString();
}

export default function ReportSalesPage() {
	const { data: session } = useSession();

	const [filters, setFilters] = useState<SalesFiltersState>(getInitialFilters);

	const [statsCard, setStatsCard] = useState<SalesStatsCard>(INITIAL_STATS);
	const [monthlyLeadsData, setMonthlyLeadsData] = useState<MonthlyChartItem[]>(
		[],
	);
	const [channelLeadsData, setChannelLeadsData] = useState<ChartDataItem[]>(
		[],
	);
	const [salesBySellerData, setSalesBySellerData] = useState<ChartDataItem[]>(
		[],
	);
	const [salesByLocationData, setSalesByLocationData] = useState<
		ChartDataItem[]
	>([]);
	const [leadsGanadas, setLeadsGanadas] = useState<WonLeadPerson[]>([]);
	const [loading, setLoading] = useState(false);

	// Debounce city filter (typed input)
	const [debouncedFilters, setDebouncedFilters] =
		useState<SalesFiltersState>(filters);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedFilters(filters), 400);
		return () => clearTimeout(timer);
	}, [filters]);

	const queryString = useMemo(
		() => buildQueryString(debouncedFilters),
		[debouncedFilters],
	);

	const fetchStats = useCallback(async () => {
		if (!session?.user?.accessToken) return;
		setLoading(true);
		try {
			const res = await fetch(
				`${STATISTICS_CRM_ALL_ENDPOINT}?${queryString}`,
				{
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);
			if (!res.ok) return;
			const json = await res.json();

			setStatsCard(json.statsCard ?? INITIAL_STATS);
			setMonthlyLeadsData(json.monthlyLeadsData ?? []);
			setChannelLeadsData(json.channelLeadsData ?? []);
			setSalesBySellerData(json.salesBySellerData ?? []);
			setSalesByLocationData(json.salesByLocationData ?? []);
			setLeadsGanadas(json.leadsGanadasPersonas ?? []);
		} catch (err) {
			console.error("Error fetching sales stats:", err);
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, queryString]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-foreground">
					Análisis de Ventas
				</h1>
				<p className="text-muted-foreground">
					Dashboard de oportunidades y conversiones
				</p>
			</div>

			{/* Filters */}
			<SalesFilters filters={filters} onChange={setFilters} />

			{/* Loading indicator */}
			{loading && (
				<div className="py-2 text-center">
					<div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent" />
				</div>
			)}

			{/* Stats Cards */}
			<StatsCards data={statsCard} />

			{/* Charts Row 1 */}
			<div className="grid gap-6 lg:grid-cols-2">
				<WonLostChart data={monthlyLeadsData} />
				<ChannelDonut data={channelLeadsData} />
			</div>

			{/* Charts Row 2 */}
			<div className="grid gap-6 lg:grid-cols-2">
				<BarChartCard
					title="Ventas por Vendedor"
					description="Oportunidades ganadas por vendedor"
					data={salesBySellerData}
					color="#3b82f6"
				/>
				<BarChartCard
					title="Ventas por Localidad"
					description="Oportunidades ganadas por provincia"
					data={salesByLocationData}
					color="#06b6d4"
				/>
			</div>

			{/* Table */}
			<WonLeadsTable data={leadsGanadas} />
		</div>
	);
}
