"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Filter, RotateCcw } from "lucide-react";
import { useCallback, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { RrhhFiltersState } from "./types";

interface RrhhFiltersProps {
	filters: RrhhFiltersState;
	onChange: (filters: RrhhFiltersState) => void;
	areas: string[];
}

export function getInitialRrhhFilters(): RrhhFiltersState {
	const now = new Date();
	const start = new Date(now.getFullYear(), 0, 1);
	const end = new Date(now.getFullYear(), 11, 31);
	return {
		startDate: start.toISOString().slice(0, 10),
		endDate: end.toISOString().slice(0, 10),
		area: "",
	};
}

export function RrhhFilters({ filters, onChange, areas }: RrhhFiltersProps) {
	const dateRange = useMemo<DateRange | undefined>(() => {
		if (!filters.startDate || !filters.endDate) return undefined;
		return {
			from: new Date(`${filters.startDate}T00:00:00`),
			to: new Date(`${filters.endDate}T00:00:00`),
		};
	}, [filters.startDate, filters.endDate]);

	const handleDateChange = useCallback(
		(range: DateRange | undefined) => {
			if (!range?.from) return;
			const startDate = range.from.toISOString().slice(0, 10);
			const endDate = range.to
				? range.to.toISOString().slice(0, 10)
				: startDate;
			onChange({ ...filters, startDate, endDate });
		},
		[filters, onChange],
	);

	const handleReset = useCallback(() => {
		onChange(getInitialRrhhFilters());
	}, [onChange]);

	const dateLabel = useMemo(() => {
		if (!filters.startDate) return "Seleccionar período";
		const from = new Date(`${filters.startDate}T00:00:00`);
		const to = filters.endDate
			? new Date(`${filters.endDate}T00:00:00`)
			: from;
		if (filters.startDate === filters.endDate) {
			return format(from, "dd MMM yyyy", { locale: es });
		}
		return `${format(from, "dd MMM", { locale: es })} - ${format(to, "dd MMM yyyy", { locale: es })}`;
	}, [filters.startDate, filters.endDate]);

	const hasActiveFilters = !!filters.area;

	return (
		<div className="space-y-3 rounded-lg border bg-card p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<Filter className="h-4 w-4" />
					Filtros
				</div>
				<div className="flex items-center gap-2">
					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleReset}
							className="h-8 gap-1.5 text-xs"
						>
							<RotateCcw className="h-3 w-3" />
							Limpiar
						</Button>
					)}
					<Popover>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="h-9 gap-2 px-3 text-sm font-normal"
							>
								<CalendarIcon className="h-4 w-4 text-muted-foreground" />
								{dateLabel}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="end">
							<Calendar
								mode="range"
								defaultMonth={dateRange?.from}
								selected={dateRange}
								onSelect={handleDateChange}
								numberOfMonths={2}
								locale={es}
							/>
						</PopoverContent>
					</Popover>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-3">
				<Select
					value={filters.area || "all"}
					onValueChange={(v) =>
						onChange({ ...filters, area: v === "all" ? "" : v })
					}
				>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue placeholder="Área" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todas las áreas</SelectItem>
						{areas.map((a) => (
							<SelectItem key={a} value={a}>
								{a}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
