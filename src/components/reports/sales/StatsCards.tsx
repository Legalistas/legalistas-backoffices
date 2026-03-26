"use client";

import {
	Percent,
	Target,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { SalesStatsCard } from "./types";

interface StatsCardsProps {
	data: SalesStatsCard;
}

function TrendBadge({ value }: { value: number }) {
	const isPositive = value >= 0;
	const Icon = isPositive ? TrendingUp : TrendingDown;
	return (
		<span
			className={`inline-flex items-center gap-0.5 text-xs font-medium ${
				isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
			}`}
		>
			<Icon className="h-3 w-3" />
			{value > 0 ? "+" : ""}
			{value}%
		</span>
	);
}

const cards = [
	{
		key: "total" as const,
		label: "Total Leads",
		color: "border-l-blue-500",
		icon: Target,
		iconColor: "text-blue-600",
		getValue: (d: SalesStatsCard) =>
			d.oportunidadesCreadas + d.oportunidadesGanadas + d.oportunidadesPerdidas,
		getTrend: null,
		subtitle: "Pendientes + Ganadas + Perdidas",
		subtitleColor: "text-blue-600 dark:text-blue-400",
	},
	{
		key: "pending" as const,
		label: "Pendientes",
		color: "border-l-amber-500",
		icon: Target,
		iconColor: "text-amber-600",
		getValue: (d: SalesStatsCard) => d.oportunidadesCreadas,
		getTrend: (d: SalesStatsCard) => d.tendenciaCreadas,
		subtitle: null,
		subtitleColor: "",
	},
	{
		key: "won" as const,
		label: "Ganadas",
		color: "border-l-emerald-500",
		icon: TrendingUp,
		iconColor: "text-emerald-600",
		getValue: (d: SalesStatsCard) => d.oportunidadesGanadas,
		getTrend: (d: SalesStatsCard) => d.tendenciaGanadas,
		subtitle: null,
		subtitleColor: "",
	},
	{
		key: "lost" as const,
		label: "Perdidas",
		color: "border-l-red-500",
		icon: TrendingDown,
		iconColor: "text-red-600",
		getValue: (d: SalesStatsCard) => d.oportunidadesPerdidas,
		getTrend: (d: SalesStatsCard) => d.tendenciaPerdidas,
		subtitle: null,
		subtitleColor: "",
	},
	{
		key: "conversion" as const,
		label: "Tasa de Conversión",
		color: "border-l-violet-500",
		icon: Percent,
		iconColor: "text-violet-600",
		getValue: (d: SalesStatsCard) => d.tasaConversion,
		getTrend: (d: SalesStatsCard) => d.tendenciaConversion,
		subtitle: null,
		subtitleColor: "",
		suffix: "%",
	},
] as const;

export function StatsCards({ data }: StatsCardsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
			{cards.map((card) => {
				const Icon = card.icon;
				const value = card.getValue(data);
				return (
					<Card key={card.key} className={`border-l-4 ${card.color}`}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{card.label}
							</CardTitle>
							<Icon className={`h-4 w-4 ${card.iconColor}`} />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold text-foreground">
								{typeof value === "number" && !Number.isInteger(value)
									? value.toFixed(1)
									: value}
								{"suffix" in card ? card.suffix : ""}
							</div>
							{card.subtitle ? (
								<p className={`text-xs ${card.subtitleColor}`}>
									{card.subtitle}
								</p>
							) : card.getTrend ? (
								<p className="text-xs text-muted-foreground">
									<TrendBadge value={card.getTrend(data)} /> vs anterior
								</p>
							) : null}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
