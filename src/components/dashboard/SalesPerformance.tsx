"use client";

import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import { STATISTICS_CRM_DASHBOARD_ENDPOINT } from "@/constant/api-endpoints";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
	ssr: false,
});

interface StatsCard {
	oportunidadesCreadas: number;
	oportunidadesGanadas: number;
	oportunidadesPerdidas: number;
	tasaConversion: number;
	tendenciaCreadas: number;
	tendenciaGanadas: number;
	tendenciaPerdidas: number;
	tendenciaConversion: number;
}

export default function SalesPerformance() {
	const { data: session } = useSession();
	const [activeTab, setActiveTab] = useState("month");
	const [stats, setStats] = useState<StatsCard | null>(null);

	useEffect(() => {
		async function fetchStats() {
			if (!session?.user?.id || !session?.user?.accessToken) return;

			try {
				const res = await fetch(
					`${STATISTICS_CRM_DASHBOARD_ENDPOINT}/${session.user.id}?timeframe=${activeTab}`,
					{
						headers: {
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					},
				);

				if (!res.ok) {
					throw new Error("Error al cargar estadísticas");
				}

				const data = await res.json();
				setStats(data.statsCard);
			} catch (error) {
				console.error(error);
			}
		}

		fetchStats();
	}, [activeTab, session?.user?.accessToken, session?.user?.id]);

	const getChartData = (): {
		series: { name: string; data: number[] }[];
		options: ApexCharts.ApexOptions;
	} => {
		if (!stats) {
			return {
				series: [],
				options: {},
			};
		}

		const categoryLabel = activeTab === "month" ? "Mes Actual" : "Año Actual";

		return {
			series: [
				{
					name: "Leads Ganados",
					data: [stats.oportunidadesGanadas],
				},
				{
					name: "Leads Perdidos",
					data: [stats.oportunidadesPerdidas],
				},
			],
			options: {
				chart: {
					type: "bar",
					height: 300,
					stacked: true,
					zoom: {
						enabled: true,
						type: "x", // zoom solo en eje X
						autoScaleYaxis: true,
					},
					toolbar: {
						autoSelected: "zoom",
						show: true,
					},
					fontFamily: "inherit",
				},
				plotOptions: {
					bar: {
						borderRadius: 0,
						columnWidth: "60%",
					},
				},
				dataLabels: {
					enabled: true,
				},
				stroke: {
					width: 0,
				},
				xaxis: {
					categories: [categoryLabel],
					axisBorder: { show: false },
					axisTicks: { show: false },
				},
				yaxis: {
					title: {
						text: "Cantidad de Leads",
						style: { fontFamily: "inherit" },
					},
					labels: {
						formatter: (value) => value.toString(),
					},
				},
				fill: {
					opacity: 1,
				},
				tooltip: {
					y: {
						formatter: (value) => value + " leads",
					},
				},
				colors: ["#10b981", "#ef4444"],
				grid: {
					borderColor: "#f1f1f1",
					strokeDashArray: 4,
				},
				legend: {
					position: "top",
					fontFamily: "inherit",
				},
			},
		};
	};

	const chartData = getChartData();

	return (
		<Card className="col-span-1">
			<CardHeader>
				<CardTitle>Rendimiento de Leads</CardTitle>
				<CardDescription>
					Comparación de leads ganados y perdidos
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Tabs
					defaultValue="month"
					className="w-full"
					onValueChange={setActiveTab}
				>
					<TabsList className="w-full">
						<TabsTrigger value="month">Mensual</TabsTrigger>
						<TabsTrigger value="year">Anual</TabsTrigger>
					</TabsList>
					<TabsContent value={activeTab} className="space-y-4">
						<div className="h-[300px] w-full">
							{typeof window !== "undefined" && stats && (
								<ReactApexChart
									options={chartData.options as ApexCharts.ApexOptions}
									series={chartData.series}
									type="bar"
									height={300}
								/>
							)}
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
