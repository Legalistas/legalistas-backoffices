"use client";

import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	RepresentativeKpi,
	RepresentativeLevel,
} from "@/types/representatives";
import LevelEditPopover from "./LevelEditPopover";
import LevelHistoryPopover from "./LevelHistoryPopover";

const formatARS = (amount: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 0,
	}).format(amount);

const formatPercent = (value: number | null) =>
	value === null ? "—" : `${(value * 100).toFixed(1)}%`;

const formatRelativeDate = (iso: string | null) => {
	if (!iso) return "Nunca";
	const date = new Date(iso);
	return date.toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

interface RepresentativesTableProps {
	rows: RepresentativeKpi[];
	loading: boolean;
	canEditLevel: boolean;
	onLevelChange: (
		userId: number,
		level: RepresentativeLevel | null,
	) => Promise<void> | void;
}

export default function RepresentativesTable({
	rows,
	loading,
	canEditLevel,
	onLevelChange,
}: RepresentativesTableProps) {
	if (loading && rows.length === 0) {
		return (
			<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
				<div className="bg-gray-50 dark:bg-white/5 px-4 py-3 flex gap-4">
					{Array.from({ length: 11 }).map((_, i) => (
						<Skeleton key={i} className="h-4 w-20" />
					))}
				</div>
				{Array.from({ length: 8 }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 px-4 py-3.5 border-t border-gray-100 dark:border-gray-800"
					>
						<Skeleton className="h-4 w-8" />
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-6 w-20 rounded-full" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-7 w-7 rounded-md" />
					</div>
				))}
			</div>
		);
	}

	if (rows.length === 0) {
		return (
			<div className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
				<p className="text-sm text-gray-500 dark:text-gray-400">
					No hay representantes que coincidan con los filtros del período.
				</p>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={200}>
			<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/3 shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50 dark:bg-white/5 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
							<tr>
								<th className="px-3 py-3 text-left font-medium">#</th>
								<th className="px-3 py-3 text-left font-medium">Representante</th>
								<th className="px-3 py-3 text-left font-medium">Nivel</th>
								<th className="px-3 py-3 text-right font-medium">Capital cerrado</th>
								<th className="px-3 py-3 text-right font-medium">Cierres</th>
								<th className="px-3 py-3 text-right font-medium">Leads</th>
								<th className="px-3 py-3 text-right font-medium">Poderes</th>
								<th className="px-3 py-3 text-right font-medium">% Conv.</th>
								<th className="px-3 py-3 text-right font-medium">Causas iniciadas</th>
								<th className="px-3 py-3 text-center font-medium">Sin mov.</th>
								<th className="px-3 py-3 text-right font-medium">Logins</th>
								<th className="px-3 py-3 text-center font-medium">Hist.</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 dark:divide-gray-800">
							{rows.map((row, idx) => (
								<tr
									key={row.userId}
									className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
								>
									<td className="px-3 py-3 text-gray-500 dark:text-gray-400 font-medium">
										{idx + 1}
									</td>
									<td className="px-3 py-3">
										<div className="flex flex-col">
											<span className="font-medium text-gray-900 dark:text-white truncate max-w-[220px]">
												{row.fullName}
											</span>
											<span className="text-xs text-gray-400 truncate max-w-[220px]">
												{row.email}
											</span>
										</div>
									</td>
									<td className="px-3 py-3">
										<LevelEditPopover
											currentLevel={row.level}
											canEdit={canEditLevel}
											onChange={(level) => onLevelChange(row.userId, level)}
										/>
									</td>
									<td className="px-3 py-3 text-right font-semibold text-green-600 tabular-nums">
										{formatARS(row.capitalClosed)}
									</td>
									<td className="px-3 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
										{row.closingsCount}
									</td>
									<td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
										{row.leadsCreated}
									</td>
									<td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
										{row.powersSigned}
									</td>
									<td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
										{formatPercent(row.conversionRate)}
									</td>
									<td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
										{row.casesStarted}
									</td>
									<td className="px-3 py-3 text-center">
										{row.casesStalledCount > 0 ? (
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs font-semibold cursor-help">
														<AlertTriangle className="h-3 w-3" />
														{row.casesStalledCount}
													</span>
												</TooltipTrigger>
												<TooltipContent>
													Causas sin movimiento &gt; 30 días. No entran al
													ranking.
												</TooltipContent>
											</Tooltip>
										) : (
											<span className="text-gray-300 dark:text-gray-600">—</span>
										)}
									</td>
									<td className="px-3 py-3 text-right tabular-nums">
										<Tooltip>
											<TooltipTrigger asChild>
												<span className="text-gray-700 dark:text-gray-300 cursor-help">
													{row.loginsCount}
												</span>
											</TooltipTrigger>
											<TooltipContent>
												Último login: {formatRelativeDate(row.lastLoginAt)}
											</TooltipContent>
										</Tooltip>
									</td>
									<td className="px-3 py-3 text-center">
										<LevelHistoryPopover
											userId={row.userId}
											fullName={row.fullName}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</TooltipProvider>
	);
}
