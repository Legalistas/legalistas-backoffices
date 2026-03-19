"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
	value: number;
	onChange: (value: number) => void;
}

export function ProgressBar({ value, onChange }: ProgressBarProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [inputValue, setInputValue] = useState(value.toString());

	const getProgressColor = (val: number) => {
		if (val >= 80) return "bg-emerald-500";
		if (val >= 50) return "bg-amber-500";
		if (val >= 25) return "bg-orange-500";
		return "bg-red-500";
	};

	const handleBlur = () => {
		setIsEditing(false);
		const num = Math.min(100, Math.max(0, Number.parseInt(inputValue) || 0));
		onChange(num);
		setInputValue(num.toString());
	};

	return (
		<div className="flex items-center gap-2 w-full">
			<div
				className="flex-1 h-2 bg-secondary rounded-full overflow-hidden cursor-pointer"
				onClick={() => setIsEditing(true)}
			>
				<div
					className={cn(
						"h-full transition-all duration-300",
						getProgressColor(value),
					)}
					style={{ width: `${value}%` }}
				/>
			</div>
			{isEditing ? (
				<input
					type="number"
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onBlur={handleBlur}
					onKeyDown={(e) => e.key === "Enter" && handleBlur()}
					autoFocus
					className="w-12 h-6 text-xs text-center bg-input border border-border rounded px-1 focus:outline-none focus:ring-1 focus:ring-primary"
					min={0}
					max={100}
				/>
			) : (
				<span
					className="text-xs text-muted-foreground w-10 text-right cursor-pointer hover:text-foreground"
					onClick={() => setIsEditing(true)}
				>
					{value}%
				</span>
			)}
		</div>
	);
}
