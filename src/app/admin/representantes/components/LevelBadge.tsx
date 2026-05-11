"use client";

import { Award, Medal, Trophy } from "lucide-react";
import type { RepresentativeLevel } from "@/types/representatives";

interface LevelBadgeProps {
	level: RepresentativeLevel | null;
	size?: "sm" | "md";
}

const LEVEL_STYLES: Record<
	RepresentativeLevel,
	{ label: string; classes: string; icon: typeof Trophy }
> = {
	GOLD: {
		label: "Gold",
		classes:
			"bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700/50",
		icon: Trophy,
	},
	SILVER: {
		label: "Silver",
		classes:
			"bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/40 dark:text-gray-200 dark:border-gray-600",
		icon: Medal,
	},
	BRONZE: {
		label: "Bronce",
		classes:
			"bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/50",
		icon: Award,
	},
};

export default function LevelBadge({ level, size = "md" }: LevelBadgeProps) {
	const sizeClasses =
		size === "sm" ? "h-6 px-2 text-[11px] gap-1" : "h-7 px-2.5 text-xs gap-1.5";
	const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

	if (!level) {
		return (
			<span
				className={`inline-flex items-center rounded-full border border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-gray-400 dark:text-gray-500 font-medium ${sizeClasses}`}
			>
				Sin asignar
			</span>
		);
	}

	const style = LEVEL_STYLES[level];
	const Icon = style.icon;

	return (
		<span
			className={`inline-flex items-center rounded-full border font-semibold ${style.classes} ${sizeClasses}`}
		>
			<Icon className={iconSize} />
			{style.label}
		</span>
	);
}
