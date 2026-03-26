"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ChartDataItem, MonthlyChartItem } from "./types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

// ─── Shared helpers ──────────────────────────────

const CHART_COLORS = {
	green: "#10b981",
	red: "#ef4444",
	blue: "#3b82f6",
	cyan: "#06b6d4",
	palette: [
		"#10b981",
		"#f59e0b",
		"#8b5cf6",
		"#ef4444",
		"#6b7280",
		"#3b82f6",
		"#ec4899",
		"#14b8a6",
		"#f97316",
		"#06b6d4",
	],
};

const GRID_STYLE = { borderColor: "#334155", strokeDashArray: 3 };
const AXIS_LABEL = { colors: "#94a3b8", fontSize: "12px" };

function EmptyChart({ message = "No hay datos disponibles" }) {
	return (
		<div className="flex h-full items-center justify-center text-muted-foreground">
			<p>{message}</p>
		</div>
	);
}

// ─── Won vs Lost Bar Chart ──────────────────────

interface WonLostChartProps {
	data: MonthlyChartItem[];
}

export function WonLostChart({ data }: WonLostChartProps) {
	const options = useMemo(
		() => ({
			chart: {
				type: "bar" as const,
				height: 300,
				stacked: true,
				toolbar: { show: false },
				background: "transparent",
			},
			plotOptions: {
				bar: {
					horizontal: false,
					borderRadius: 8,
					borderRadiusApplication: "end" as const,
					borderRadiusWhenStacked: "last" as const,
					dataLabels: {
						total: { enabled: true, style: { fontSize: "12px", fontWeight: 700 } },
					},
				},
			},
			dataLabels: { enabled: false },
			stroke: { show: true, width: 2, colors: ["transparent"] },
			xaxis: {
				categories: data.map((d) => d.month),
				axisBorder: { show: false },
				axisTicks: { show: false },
				labels: { style: AXIS_LABEL },
			},
			yaxis: {
				axisBorder: { show: false },
				axisTicks: { show: false },
				labels: { style: AXIS_LABEL },
			},
			fill: { opacity: 1 },
			tooltip: { theme: "dark", y: { formatter: (v: number) => `${v} oportunidades` } },
			legend: {
				position: "bottom" as const,
				horizontalAlign: "center" as const,
				fontSize: "12px",
				labels: { colors: "#cbd5e1" },
				markers: { size: 4 },
			},
			colors: [CHART_COLORS.green, CHART_COLORS.red],
			grid: GRID_STYLE,
		}),
		[data],
	);

	const series = useMemo(
		() => [
			{ name: "Ganadas", data: data.map((d) => d.ganadas) },
			{ name: "Perdidas", data: data.map((d) => d.perdidas) },
		],
		[data],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Ganadas vs Perdidas</CardTitle>
				<CardDescription>Comparación mensual de resultados</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[300px]">
					{data.length > 0 ? (
						<Chart options={options} series={series} type="bar" height={300} />
					) : (
						<EmptyChart />
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Channel Donut Chart ────────────────────────

interface ChannelDonutProps {
	data: ChartDataItem[];
}

export function ChannelDonut({ data }: ChannelDonutProps) {
	const options = useMemo(
		() => ({
			chart: { type: "donut" as const, height: 300 },
			labels: data.map((d) => d.name),
			colors: CHART_COLORS.palette,
			plotOptions: { pie: { donut: { size: "60%" } } },
			dataLabels: { enabled: false },
			tooltip: { theme: "dark", y: { formatter: (v: number) => `${v} leads` } },
			legend: {
				position: "bottom" as const,
				horizontalAlign: "center" as const,
				fontSize: "12px",
				labels: { colors: "#cbd5e1" },
				markers: { size: 4 },
			},
		}),
		[data],
	);

	const series = useMemo(() => data.map((d) => d.value), [data]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Oportunidades por Canal</CardTitle>
				<CardDescription>Distribución de leads por fuente</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[300px]">
					{data.length > 0 ? (
						<Chart options={options} series={series} type="donut" height={300} />
					) : (
						<EmptyChart />
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Generic Horizontal Bar Chart ───────────────

interface BarChartCardProps {
	title: string;
	description: string;
	data: ChartDataItem[];
	color?: string;
	yAxisTitle?: string;
}

export function BarChartCard({
	title,
	description,
	data,
	color = CHART_COLORS.blue,
	yAxisTitle = "Oportunidades",
}: BarChartCardProps) {
	const options = useMemo(
		() => ({
			chart: {
				type: "bar" as const,
				height: 300,
				toolbar: { show: false },
				background: "transparent",
			},
			plotOptions: { bar: { horizontal: false, columnWidth: "50%", borderRadius: 5 } },
			dataLabels: { enabled: false },
			xaxis: {
				categories: data.map((d) => d.name),
				labels: { style: AXIS_LABEL },
			},
			yaxis: {
				title: { text: yAxisTitle, style: { color: "#94a3b8" } },
				labels: { style: AXIS_LABEL },
			},
			fill: { opacity: 1 },
			tooltip: { theme: "dark", y: { formatter: (v: number) => `${v} oportunidades` } },
			legend: { show: false },
			colors: [color],
			grid: GRID_STYLE,
		}),
		[data, color, yAxisTitle],
	);

	const series = useMemo(
		() => [{ name: yAxisTitle, data: data.map((d) => d.value) }],
		[data, yAxisTitle],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[300px]">
					{data.length > 0 ? (
						<Chart options={options} series={series} type="bar" height={300} />
					) : (
						<EmptyChart />
					)}
				</div>
			</CardContent>
		</Card>
	);
}
