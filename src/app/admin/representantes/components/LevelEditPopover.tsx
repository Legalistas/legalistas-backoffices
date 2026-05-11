"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { RepresentativeLevel } from "@/types/representatives";
import LevelBadge from "./LevelBadge";

interface LevelEditPopoverProps {
	currentLevel: RepresentativeLevel | null;
	canEdit: boolean;
	onChange: (level: RepresentativeLevel | null) => Promise<void> | void;
}

const LEVELS: RepresentativeLevel[] = ["GOLD", "SILVER", "BRONZE"];

export default function LevelEditPopover({
	currentLevel,
	canEdit,
	onChange,
}: LevelEditPopoverProps) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);

	if (!canEdit) {
		return <LevelBadge level={currentLevel} />;
	}

	const handleSelect = async (level: RepresentativeLevel | null) => {
		setSaving(true);
		try {
			await onChange(level);
			setOpen(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={saving}
					className="inline-flex items-center rounded-full hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
				>
					<LevelBadge level={currentLevel} />
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-56 p-2">
				<div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 pt-1 pb-2">
					Asignar nivel
				</div>
				<div className="space-y-0.5">
					{LEVELS.map((level) => {
						const isSelected = level === currentLevel;
						return (
							<button
								key={level}
								type="button"
								onClick={() => handleSelect(level)}
								disabled={saving}
								className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
									isSelected
										? "bg-primary/5"
										: "hover:bg-gray-50 dark:hover:bg-white/5"
								} disabled:opacity-50`}
							>
								<LevelBadge level={level} size="sm" />
								{isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
							</button>
						);
					})}
					<div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
					<button
						type="button"
						onClick={() => handleSelect(null)}
						disabled={saving}
						className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
							currentLevel === null
								? "bg-primary/5"
								: "hover:bg-gray-50 dark:hover:bg-white/5"
						} disabled:opacity-50`}
					>
						<span className="text-xs text-gray-500 flex items-center gap-1.5">
							<X className="h-3 w-3" />
							Quitar nivel
						</span>
						{currentLevel === null && (
							<Check className="h-3.5 w-3.5 text-primary" />
						)}
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
