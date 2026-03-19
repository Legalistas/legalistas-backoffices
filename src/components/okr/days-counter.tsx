"use client";

import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface DaysCounterProps {
	targetDate: Date | null;
}

export function DaysCounter({ targetDate }: DaysCounterProps) {
	if (!targetDate) {
		return <span className="text-xs text-muted-foreground">-</span>;
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const target = new Date(targetDate);
	target.setHours(0, 0, 0, 0);

	const daysRemaining = differenceInDays(target, today);

	const getColor = () => {
		if (daysRemaining < 0) return "text-red-400 bg-red-500/10";
		if (daysRemaining <= 3) return "text-red-400 bg-red-500/10";
		if (daysRemaining <= 7) return "text-amber-400 bg-amber-500/10";
		if (daysRemaining <= 14) return "text-yellow-400 bg-yellow-500/10";
		return "text-emerald-400 bg-emerald-500/10";
	};

	const getText = () => {
		if (daysRemaining < 0) return `${Math.abs(daysRemaining)}d atrasado`;
		if (daysRemaining === 0) return "Hoy";
		return `${daysRemaining}d`;
	};

	return (
		<span
			className={cn("text-xs font-medium px-2 py-1 rounded-md", getColor())}
		>
			{getText()}
		</span>
	);
}
