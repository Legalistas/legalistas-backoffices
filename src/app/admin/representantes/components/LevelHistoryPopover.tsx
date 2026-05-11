"use client";

import { History, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { REPRESENTATIVE_LEVELS_HISTORY_ENDPOINT } from "@/constant/api-endpoints";
import { monthOptions } from "@/constant/closing-manager";
import type {
	RepresentativeLevelHistoryEntry,
	RepresentativeLevelsHistoryResponse,
} from "@/types/representatives";
import LevelBadge from "./LevelBadge";

interface LevelHistoryPopoverProps {
	userId: number;
	fullName: string;
}

const monthLabel = (m: number) =>
	monthOptions.find((opt) => opt.value === m)?.label ?? String(m);

export default function LevelHistoryPopover({
	userId,
	fullName,
}: LevelHistoryPopoverProps) {
	const { data: session } = useSession();
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [entries, setEntries] = useState<RepresentativeLevelHistoryEntry[]>([]);

	const handleOpenChange = async (next: boolean) => {
		setOpen(next);
		if (!next) return;
		if (!session?.user?.accessToken) return;

		setLoading(true);
		setError(null);
		try {
			const response = await fetch(
				REPRESENTATIVE_LEVELS_HISTORY_ENDPOINT(userId),
				{
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
					cache: "no-store",
				},
			);
			if (!response.ok) {
				throw new Error(`Error ${response.status}`);
			}
			const json: RepresentativeLevelsHistoryResponse = await response.json();
			setEntries(json.data);
		} catch (err) {
			console.error("Error fetching level history:", err);
			setError("No se pudo cargar el historial");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
					title="Ver historial de medallas"
				>
					<History className="h-4 w-4" />
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
					<div className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
						Historial de medallas
					</div>
					<div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
						{fullName}
					</div>
				</div>

				<div className="max-h-72 overflow-y-auto">
					{loading && (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-4 w-4 animate-spin text-gray-400" />
						</div>
					)}

					{error && !loading && (
						<div className="px-3 py-4 text-sm text-red-600">{error}</div>
					)}

					{!loading && !error && entries.length === 0 && (
						<div className="px-3 py-6 text-sm text-gray-400 text-center">
							Sin asignaciones previas
						</div>
					)}

					{!loading && !error && entries.length > 0 && (
						<ul className="divide-y divide-gray-100 dark:divide-gray-800">
							{entries.map((entry) => (
								<li
									key={`${entry.year}-${entry.month}`}
									className="px-3 py-2 flex items-center justify-between gap-2"
								>
									<span className="text-sm text-gray-700 dark:text-gray-200 tabular-nums">
										{monthLabel(entry.month)} {entry.year}
									</span>
									<LevelBadge level={entry.level} size="sm" />
								</li>
							))}
						</ul>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
