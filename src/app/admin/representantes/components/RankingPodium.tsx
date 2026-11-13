"use client";

import { Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Podium of a closings ranking ("Propuesta - Ranking de abogados"): the top
// three by score, annual or monthly. It does not touch the representative's
// level, which stays manual.

export interface PuestoRanking {
	userId: number;
	fullName: string;
	score: number;
	cierres: number;
	honorarios: number;
}

const PUESTOS = [
	{ label: "Oro", caja: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20", icono: "text-amber-500" },
	{ label: "Plata", caja: "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/5", icono: "text-gray-400" },
	{ label: "Bronce", caja: "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20", icono: "text-orange-600" },
];

const ars = (n: number) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/** `items` already in ranking order. */
export default function RankingPodium({
	titulo,
	items,
	loading,
}: {
	titulo: string;
	items: PuestoRanking[];
	loading: boolean;
}) {
	const podio = items.filter((r) => r.score > 0).slice(0, 3);
	return (
		<div className="space-y-2">
			<h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{titulo}</h3>
			{loading ? (
				<div className="grid gap-3 sm:grid-cols-3">
					{PUESTOS.map((p) => (
						<Skeleton key={p.label} className="h-32 rounded-xl" />
					))}
				</div>
			) : !podio.length ? (
				<p className="text-sm text-gray-500 dark:text-gray-400">Todavía no hay cierres en este período.</p>
			) : (
				<div className="grid gap-3 sm:grid-cols-3">
					{podio.map((r, i) => (
						<div key={r.userId} className={cn("rounded-xl border p-4", PUESTOS[i].caja)}>
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">
									{i + 1}° · {PUESTOS[i].label}
								</span>
								<Medal className={cn("h-5 w-5", PUESTOS[i].icono)} />
							</div>
							<p className="mt-2 truncate font-semibold text-gray-900 dark:text-white">{r.fullName}</p>
							<p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
								{r.score.toLocaleString("es-AR")} <span className="text-sm font-normal text-gray-500">pts</span>
							</p>
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{r.cierres} cierres · {ars(r.honorarios)} en honorarios
							</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
