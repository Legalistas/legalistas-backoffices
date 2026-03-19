"use client";

import { CalendarIcon, X } from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface CrmMonthlyFiltersProps {
	monthFilter: string;
	setMonthFilter: (month: string) => void;
	yearFilter: string;
	setYearFilter: (year: string) => void;
	onFiltersChange?: (filters: { month: string; year: string }) => void;
	className?: string;
}

export const CrmMonthlyFilters: React.FC<CrmMonthlyFiltersProps> = ({
	monthFilter,
	setMonthFilter,
	yearFilter,
	setYearFilter,
	onFiltersChange,
	className = "",
}) => {
	const [open, setOpen] = useState(false);

	const selectedDate = useMemo(() => {
		const m = parseInt(monthFilter) - 1;
		const y = parseInt(yearFilter);
		if (isNaN(m) || isNaN(y)) return new Date();
		return new Date(y, m, 15);
	}, [monthFilter, yearFilter]);

	const handleSelect = useCallback(
		(day: Date | undefined) => {
			if (!day) return;
			const m = String(day.getMonth() + 1).padStart(2, "0");
			const y = String(day.getFullYear());
			setMonthFilter(m);
			setYearFilter(y);
			onFiltersChange?.({ month: m, year: y });
			setOpen(false);
		},
		[setMonthFilter, setYearFilter, onFiltersChange],
	);

	const label = useMemo(() => {
		return format(selectedDate, "MMMM yyyy", { locale: es });
	}, [selectedDate]);

	const handleClear = useCallback(() => {
		const now = new Date();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const y = String(now.getFullYear());
		setMonthFilter(m);
		setYearFilter(y);
		onFiltersChange?.({ month: m, year: y });
	}, [setMonthFilter, setYearFilter, onFiltersChange]);

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="h-10 gap-2 px-3 text-sm font-normal capitalize"
					>
						<CalendarIcon className="h-4 w-4 text-muted-foreground" />
						{label}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						defaultMonth={selectedDate}
						selected={selectedDate}
						onSelect={handleSelect}
						numberOfMonths={1}
						locale={es}
					/>
				</PopoverContent>
			</Popover>

			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 text-muted-foreground hover:text-foreground"
				onClick={handleClear}
				title="Restablecer a mes actual"
			>
				<X className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
};

export default CrmMonthlyFilters;
