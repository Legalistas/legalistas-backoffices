"use client";

import { Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RepresentativeKpi } from "@/types/representatives";

// Podium of the closings ranking ("Propuesta - Ranking de abogados"): the top
// three by score. It does not touch the representative's level, which stays manual.

const PUESTOS = [
	{ label: "Oro", caja: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20", icono: "text-amber-500" },
	{ label: "Plata", caja: "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/5", icono: "text-gray-400" },
	{ label: "Bronce", caja: "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20", icono: "text-orange-600" },
];

const ars = (n: number) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function RankingPodium({ rows, loading }: { rows: RepresentativeKpi[]; loading: boolean }) {
	if (loading)
		return (
			<div className="grid gap-3 sm:grid-cols-3">
				{PUESTOS.map((p) => (
					<Skeleton key={p.label} className="h-32 rounded-xl" />
				))}
			</div>
		);
	const podio = rows.filter((r) => r.score > 0).slice(0, 3);
	if (!podio.length) return null;
	return (
		<div className="space-y-2">
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
							{r.closingsCount} cierres · {ars(r.feesClosed)} en honorarios
						</p>
					</div>
				))}
			</div>
			<p className="text-xs text-gray-500 dark:text-gray-400">
				Puntaje = 50 × (cierres ÷ máximo de cierres) + 50 × (honorarios ÷ máximo de honorarios). Honorarios = HP +
				PCL. Desempate: más cierres, después más capital.
			</p>
		</div>
	);
}
