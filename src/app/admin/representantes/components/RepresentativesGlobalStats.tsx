"use client";

import {
	DollarSign,
	FileText,
	Handshake,
	Percent,
	Scale,
	TrendingUp,
	Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepresentativesGlobalStats } from "@/types/representatives";

const formatARS = (amount: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 0,
	}).format(amount);

const formatPercent = (value: number) =>
	`${(value * 100).toFixed(1)}%`;

interface RepresentativesGlobalStatsProps {
	data: RepresentativesGlobalStats | null;
	loading: boolean;
}

export default function RepresentativesGlobalStats({
	data,
	loading,
}: RepresentativesGlobalStatsProps) {
	const cards = [
		{
			label: "Representantes activos",
			value: data?.representativesCount ?? 0,
			format: "number" as const,
			icon: Users,
			iconBg: "bg-primary/10 dark:bg-primary/20",
			iconColor: "text-primary",
			valueColor: "text-gray-900 dark:text-white",
		},
		{
			label: "Capital cerrado (total)",
			value: data?.totalCapitalClosed ?? 0,
			format: "currency" as const,
			icon: DollarSign,
			iconBg: "bg-green-100 dark:bg-green-900/30",
			iconColor: "text-green-600",
			valueColor: "text-green-600",
		},
		{
			label: "Cierres (total)",
			value: data?.totalClosingsCount ?? 0,
			format: "number" as const,
			icon: Handshake,
			iconBg: "bg-blue-100 dark:bg-blue-900/30",
			iconColor: "text-blue-600",
			valueColor: "text-blue-600",
		},
		{
			label: "Promedio capital / rep.",
			value: data?.avgCapitalClosed ?? 0,
			format: "currency" as const,
			icon: TrendingUp,
			iconBg: "bg-purple-100 dark:bg-purple-900/30",
			iconColor: "text-purple-600",
			valueColor: "text-purple-600",
		},
		{
			label: "Leads creados",
			value: data?.totalLeadsCreated ?? 0,
			format: "number" as const,
			icon: FileText,
			iconBg: "bg-gray-100 dark:bg-gray-800",
			iconColor: "text-gray-600 dark:text-gray-300",
			valueColor: "text-gray-900 dark:text-white",
		},
		{
			label: "Poderes firmados",
			value: data?.totalPowersSigned ?? 0,
			format: "number" as const,
			icon: FileText,
			iconBg: "bg-gray-100 dark:bg-gray-800",
			iconColor: "text-gray-600 dark:text-gray-300",
			valueColor: "text-gray-900 dark:text-white",
		},
		{
			label: "Conversión promedio",
			value: data?.avgConversionRate ?? 0,
			format: "percent" as const,
			icon: Percent,
			iconBg: "bg-amber-100 dark:bg-amber-900/30",
			iconColor: "text-amber-600",
			valueColor: "text-amber-600",
		},
		{
			label: "Causas iniciadas",
			value: data?.totalCasesStarted ?? 0,
			format: "number" as const,
			icon: Scale,
			iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
			iconColor: "text-indigo-600",
			valueColor: "text-indigo-600",
		},
	];

	const formatValue = (value: number, format: "number" | "currency" | "percent") => {
		if (format === "currency") return formatARS(value);
		if (format === "percent") return formatPercent(value);
		return value.toLocaleString("es-AR");
	};

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
			{cards.map((card) => (
				<div
					key={card.label}
					className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4"
				>
					<div className="flex items-center justify-between">
						<div className="space-y-1 min-w-0">
							<p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
								{card.label}
							</p>
							{loading ? (
								<Skeleton className="h-7 w-24" />
							) : (
								<p className={`text-xl font-bold ${card.valueColor} truncate`}>
									{formatValue(card.value, card.format)}
								</p>
							)}
						</div>
						<div
							className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center shrink-0`}
						>
							<card.icon className={`h-5 w-5 ${card.iconColor}`} />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
