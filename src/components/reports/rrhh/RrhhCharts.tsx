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
import type {
	CostByAreaItem,
	MonthlyAbsenteeismItem,
	MonthlyTurnoverItem,
	TenureBucketItem,
} from "./types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const CHART_COLORS = {
	green: "#10b981",
	red: "#ef4444",
	blue: "#3b82f6",
	violet: "#8b5cf6",
	amber: "#f59e0b",
	palette: [
		"#3b82f6",
		"#ef4444",
		"#f59e0b",
		"#8b5cf6",
		"#10b981",
		"#ec4899",
		"#14b8a6",
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

function formatCurrencyShort(v: number): string {
	if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
	if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
	return `$${v.toFixed(0)}`;
}

// ─── Turnover (Altas vs Bajas) ────────────────────

interface TurnoverChartProps {
	data: MonthlyTurnoverItem[];
}

export function TurnoverChart({ data }: TurnoverChartProps) {
	const options = useMemo(
		() => ({
			chart: {
				type: "bar" as const,
				height: 300,
				toolbar: { show: false },
				background: "transparent",
			},
			plotOptions: {
				bar: { horizontal: false, columnWidth: "55%", borderRadius: 5 },
			},
			dataLabels: { enabled: false },
			stroke: { show: true, width: 2, colors: ["transparent"] },
			xaxis: {
				categories: data.map((d) => d.month),
				labels: { style: AXIS_LABEL },
			},
			yaxis: {
				labels: { style: AXIS_LABEL },
			},
			fill: { opacity: 1 },
			tooltip: {
				theme: "dark",
				y: { formatter: (v: number) => `${v} empleados` },
			},
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
			{ name: "Altas", data: data.map((d) => d.altas) },
			{ name: "Bajas", data: data.map((d) => d.bajas) },
		],
		[data],
	);

	const hasData = data.some((d) => d.altas > 0 || d.bajas > 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Rotación de personal</CardTitle>
				<CardDescription>Altas vs Bajas por mes</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[300px]">
					{hasData ? (
						<Chart options={options} series={series} type="bar" height={300} />
					) : (
						<EmptyChart />
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Absenteeism (Días por tipo de licencia) ──────

interface AbsenteeismChartProps {
	data: MonthlyAbsenteeismItem[];
}

const LEAVE_LABELS: Record<string, string> = {
	VACATION: "Vacaciones",
	SICK: "Enfermedad",
	STUDY: "Estudio",
	MATERNITY: "Maternidad",
	PATERNITY: "Paternidad",
	UNPAID: "Sin goce",
	OTHER: "Otra",
};

export function AbsenteeismChart({ data }: AbsenteeismChartProps) {
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
					borderRadius: 6,
					borderRadiusApplication: "end" as const,
					borderRadiusWhenStacked: "last" as const,
				},
			},
			dataLabels: { enabled: false },
			stroke: { show: true, width: 1, colors: ["transparent"] },
			xaxis: {
				categories: data.map((d) => d.month),
				labels: { style: AXIS_LABEL },
			},
			yaxis: {
				title: { text: "Días", style: { color: "#94a3b8" } },
				labels: { style: AXIS_LABEL },
			},
			fill: { opacity: 1 },
			tooltip: { theme: "dark", y: { formatter: (v: number) => `${v} días` } },
			legend: {
				position: "bottom" as const,
				horizontalAlign: "center" as const,
				fontSize: "12px",
				labels: { colors: "#cbd5e1" },
				markers: { size: 4 },
			},
			colors: CHART_COLORS.palette,
			grid: GRID_STYLE,
		}),
		[data],
	);

	const series = useMemo(() => {
		const types: Array<keyof MonthlyAbsenteeismItem> = [
			"VACATION",
			"SICK",
			"STUDY",
			"MATERNITY",
			"PATERNITY",
			"UNPAID",
			"OTHER",
		];
		return types.map((t) => ({
			name: LEAVE_LABELS[t],
			data: data.map((d) => Number(d[t]) || 0),
		}));
	}, [data]);

	const hasData = series.some((s) => s.data.some((v) => v > 0));

	return (
		<Card>
			<CardHeader>
				<CardTitle>Ausentismo</CardTitle>
				<CardDescription>Días de licencia aprobada por tipo</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[300px]">
					{hasData ? (
						<Chart options={options} series={series} type="bar" height={300} />
					) : (
						<EmptyChart />
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ─── Labor Costs (por área) ───────────────────────

interface LaborCostsChartProps {
	data: CostByAreaItem[];
}

export function LaborCostsChart({ data }: LaborCostsChartProps) {
	const options = useMemo(
		() => ({
			chart: {
				type: "bar" as const,
				height: 300,
				toolbar: { show: false },
				background: "transparent",
			},
			plotOptions: {
				bar: { horizontal: true, borderRadius: 5, barHeight: "60%" },
			},
			dataLabels: {
				enabled: true,
				formatter: (v: number) => formatCurrencyShort(v),
				style: { fontSize: "11px", colors: ["#fff"] },
			},
			xaxis: {
				categories: data.map((d) => d.area),
				labels: {
					style: AXIS_LABEL,
					formatter: (v: string) => formatCurrencyShort(Number(v)),
				},
			},
			yaxis: {
				labels: { style: AXIS_LABEL },
			},
			tooltip: {
				theme: "dark",
				y: {
					formatter: (v: number) =>
						new Intl.NumberFormat("es-AR", {
							style: "currency",
							currency: "ARS",
							maximumFractionDigits: 0,
						}).format(v),
				},
			},
			legend: { show: false },
			colors: [CHART_COLORS.amber],
			grid: GRID_STYLE,
		}),
		[data],
	);

	const series = useMemo(
		() => [{ name: "Costo mensual", data: data.map((d) => d.total) }],
		[data],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Costos laborales por área</CardTitle>
				<CardDescription>
					Suma de salarios base mensuales (solo activos)
				</CardDescription>
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

// ─── Tenure (Antigüedad) ──────────────────────────

interface TenureChartProps {
	data: TenureBucketItem[];
}

export function TenureChart({ data }: TenureChartProps) {
	const options = useMemo(
		() => ({
			chart: {
				type: "bar" as const,
				height: 300,
				toolbar: { show: false },
				background: "transparent",
			},
			plotOptions: {
				bar: { horizontal: true, borderRadius: 5, barHeight: "55%" },
			},
			dataLabels: {
				enabled: true,
				style: { fontSize: "12px", colors: ["#fff"] },
			},
			xaxis: {
				categories: data.map((d) => d.range),
				labels: { style: AXIS_LABEL },
			},
			yaxis: {
				labels: { style: AXIS_LABEL },
			},
			tooltip: {
				theme: "dark",
				y: { formatter: (v: number) => `${v} empleados` },
			},
			legend: { show: false },
			colors: [CHART_COLORS.violet],
			grid: GRID_STYLE,
		}),
		[data],
	);

	const series = useMemo(
		() => [{ name: "Empleados", data: data.map((d) => d.count) }],
		[data],
	);

	const hasData = data.some((d) => d.count > 0);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Antigüedad</CardTitle>
				<CardDescription>
					Distribución de empleados activos por tramo
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="h-[300px]">
					{hasData ? (
						<Chart options={options} series={series} type="bar" height={300} />
					) : (
						<EmptyChart />
					)}
				</div>
			</CardContent>
		</Card>
	);
}
