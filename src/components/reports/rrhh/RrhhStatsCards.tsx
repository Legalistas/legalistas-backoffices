"use client";

import {
	Calendar,
	DollarSign,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { RrhhStatsCard } from "./types";

interface RrhhStatsCardsProps {
	data: RrhhStatsCard;
}

function formatCurrency(v: number): string {
	return new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		maximumFractionDigits: 0,
	}).format(v);
}

export function RrhhStatsCards({ data }: RrhhStatsCardsProps) {
	const cards = [
		{
			key: "activos",
			label: "Empleados activos",
			value: data.activos,
			icon: Users,
			color: "border-l-blue-500",
			iconColor: "text-blue-600",
		},
		{
			key: "altas",
			label: "Altas (período)",
			value: data.altas,
			icon: TrendingUp,
			color: "border-l-emerald-500",
			iconColor: "text-emerald-600",
		},
		{
			key: "bajas",
			label: "Bajas (período)",
			value: data.bajas,
			icon: TrendingDown,
			color: "border-l-red-500",
			iconColor: "text-red-600",
		},
		{
			key: "antiguedad",
			label: "Antigüedad promedio",
			value: `${data.antiguedadPromedio.toFixed(1)} años`,
			icon: Calendar,
			color: "border-l-violet-500",
			iconColor: "text-violet-600",
		},
		{
			key: "costo",
			label: "Costo mensual total",
			value: formatCurrency(data.costoMensualTotal),
			icon: DollarSign,
			color: "border-l-amber-500",
			iconColor: "text-amber-600",
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
			{cards.map((card) => {
				const Icon = card.icon;
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
								{card.value}
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}
