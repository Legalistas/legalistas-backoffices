"use client";

import { CalendarDays, Search, X } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { monthOptions } from "@/constant/closing-manager";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface RepresentativesFiltersProps {
	month: number;
	year: number;
	search: string;
	onMonthChange: (month: number) => void;
	onYearChange: (year: number) => void;
	onSearchChange: (search: string) => void;
}

export default function RepresentativesFilters({
	month,
	year,
	search,
	onMonthChange,
	onYearChange,
	onSearchChange,
}: RepresentativesFiltersProps) {
	return (
		<div className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
			<div className="flex items-center gap-3 p-3">
				{/* Período */}
				<div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800 p-1">
					<div className="flex items-center gap-1.5 pl-2">
						<CalendarDays className="h-4 w-4 text-gray-400" />
					</div>
					<Select
						value={String(month)}
						onValueChange={(v) => onMonthChange(Number(v))}
					>
						<SelectTrigger className="border-0 bg-transparent shadow-none h-8 min-w-28 text-sm font-medium focus:ring-0">
							<SelectValue placeholder="Mes" />
						</SelectTrigger>
						<SelectContent>
							{monthOptions.map((m) => (
								<SelectItem key={m.value} value={String(m.value)}>
									{m.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<div className="h-5 w-px bg-gray-300" />

					<Select
						value={String(year)}
						onValueChange={(v) => onYearChange(Number(v))}
					>
						<SelectTrigger className="border-0 bg-transparent shadow-none h-8 w-18 text-sm font-medium focus:ring-0">
							<SelectValue placeholder="Año" />
						</SelectTrigger>
						<SelectContent>
							{yearOptions.map((y) => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Búsqueda por nombre */}
				<div className="flex-1 relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						placeholder="Buscar representante por nombre o email..."
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						className="w-full h-9 pl-9 pr-9 rounded-lg border border-gray-200 bg-gray-50 dark:bg-white/5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-white/5 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
					/>
					{search && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
