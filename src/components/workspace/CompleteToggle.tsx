"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Circle that completes (or reopens) the task, like Asana's. */
export function CompleteToggle({
	done,
	onClick,
	label,
}: {
	done: boolean;
	onClick: (e: React.MouseEvent) => void;
	label: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className={cn(
				"grid size-4.5 shrink-0 place-items-center rounded-full border transition-colors",
				done
					? "border-emerald-600 bg-emerald-600 text-white"
					: "border-muted-foreground/50 text-transparent hover:border-emerald-600 hover:text-emerald-600",
			)}
		>
			<Check className="size-3" strokeWidth={3} />
		</button>
	);
}
