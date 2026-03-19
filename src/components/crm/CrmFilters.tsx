"use client";

import {
	CalendarIcon,
	Check,
	ChevronDown,
	Filter,
	ListFilterIcon as ListFilterPlus,
	Search,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { SERVICES_TYPE } from "@/constant/crm";

interface LawyerOption {
	id: string;
	value: string;
	label: string;
}

interface CrmFiltersProps {
	searchTerm: string;
	setSearchTerm: (term: string) => void;
	selectedService: number | undefined;
	setSelectedService: (service: number | undefined) => void;
	selectedResponsibleLawyer: string[];
	setSelectedResponsibleLawyer: React.Dispatch<React.SetStateAction<string[]>>;
	selectedInternalLawyer: string[];
	setSelectedInternalLawyer: React.Dispatch<React.SetStateAction<string[]>>;
	dateFrom: string;
	setDateFrom: (date: string) => void;
	dateTo: string;
	setDateTo: (date: string) => void;
	monthFilter: string;
	setMonthFilter: (month: string) => void;
	yearFilter: string;
	setYearFilter: (year: string) => void;
	hasActiveFilters: boolean;
	handleClearFilters: () => void;
	responsibleLawyerTypes?: LawyerOption[];
	lawyerInternalTypes?: LawyerOption[];
}

export const CrmFilters = ({
	searchTerm,
	setSearchTerm,
	selectedService,
	setSelectedService,
	selectedResponsibleLawyer,
	setSelectedResponsibleLawyer,
	selectedInternalLawyer,
	setSelectedInternalLawyer,
	dateFrom,
	setDateFrom,
	dateTo,
	setDateTo,
	monthFilter,
	setMonthFilter,
	yearFilter,
	setYearFilter,
	hasActiveFilters,
	handleClearFilters,
	responsibleLawyerTypes,
	lawyerInternalTypes,
}: CrmFiltersProps) => {
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);
	const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
	const [isRepresentativeLawyerDropdownOpen, setIsRepresentativeLawyerDropdownOpen] = useState(false);
	const [isInternalLawyerDropdownOpen, setIsInternalLawyerDropdownOpen] = useState(false);
	const [repLawyerSearch, setRepLawyerSearch] = useState("");
	const [intLawyerSearch, setIntLawyerSearch] = useState("");

	const searchInputRef = useRef<HTMLInputElement>(null);
	const filtersContainerRef = useRef<HTMLDivElement>(null);
	const serviceDropdownRef = useRef<HTMLDivElement>(null);
	const representativeLawyerDropdownRef = useRef<HTMLDivElement>(null);
	const internalLawyerDropdownRef = useRef<HTMLDivElement>(null);

	// Date mode: "month" for month/year selector, "range" for from-to date range
	const [dateMode, setDateMode] = useState<"month" | "range">(
		dateFrom || dateTo ? "range" : "month",
	);
	const [monthPickerOpen, setMonthPickerOpen] = useState(false);
	const [monthPickerYear, setMonthPickerYear] = useState(
		yearFilter ? parseInt(yearFilter) : new Date().getFullYear(),
	);
	const [rangePickerOpen, setRangePickerOpen] = useState(false);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchTerm(e.target.value);
		},
		[setSearchTerm],
	);

	const handleServiceSelect = useCallback(
		(serviceId: number | undefined) => {
			setSelectedService(serviceId);
			setIsServiceDropdownOpen(false);
		},
		[setSelectedService],
	);

	const handleRepresentativeLawyerSelect = useCallback(
		(lawyerId: string) => {
			setSelectedResponsibleLawyer((prev) => {
				if (prev.includes(lawyerId)) {
					return prev.filter((id) => id !== lawyerId);
				}
				return [...prev, lawyerId];
			});
		},
		[setSelectedResponsibleLawyer],
	);

	const handleInternalLawyerSelect = useCallback(
		(lawyerId: string) => {
			setSelectedInternalLawyer((prev) => {
				if (prev.includes(lawyerId)) {
					return prev.filter((id) => id !== lawyerId);
				}
				return [...prev, lawyerId];
			});
		},
		[setSelectedInternalLawyer],
	);

	const getServiceName = useCallback((serviceId: number) => {
		const service = SERVICES_TYPE.find((s) => s.value === serviceId);
		return service ? service.label : "Servicio desconocido";
	}, []);

	const getRepresentativeLawyerName = useCallback(
		(lawyerIds: string[]) => {
			if (!lawyerIds || lawyerIds.length === 0) return "Abogado Responsable";
			if (lawyerIds.length === 1) {
				const lawyer = responsibleLawyerTypes?.find((l) => l.value === lawyerIds[0]);
				return lawyer ? lawyer.label : "Abogado Responsable";
			}
			return `${lawyerIds.length} abogados seleccionados`;
		},
		[responsibleLawyerTypes],
	);

	const getInternalLawyerName = useCallback(
		(lawyerIds: string[]) => {
			if (!lawyerIds || lawyerIds.length === 0) return "Abogado Interno";
			if (lawyerIds.length === 1) {
				const lawyer = lawyerInternalTypes?.find((l) => l.value === lawyerIds[0]);
				return lawyer ? lawyer.label : "Abogado Interno";
			}
			return `${lawyerIds.length} abogados seleccionados`;
		},
		[lawyerInternalTypes],
	);

	// Filter lawyers by search term
	const filteredResponsibleLawyers = (responsibleLawyerTypes || []).filter((l) =>
		l.label.toLowerCase().includes(repLawyerSearch.toLowerCase()),
	);
	const filteredInternalLawyers = (lawyerInternalTypes || []).filter((l) =>
		l.label.toLowerCase().includes(intLawyerSearch.toLowerCase()),
	);

	// Count active filters
	const getActiveFiltersCount = useCallback(() => {
		let count = 0;
		if (selectedService !== undefined) count++;
		if (selectedResponsibleLawyer && selectedResponsibleLawyer.length > 0) count++;
		if (selectedInternalLawyer && selectedInternalLawyer.length > 0) count++;
		if (dateFrom || dateTo) count++;
		if (monthFilter && yearFilter) count++;
		return count;
	}, [selectedService, selectedResponsibleLawyer, selectedInternalLawyer, dateFrom, dateTo, monthFilter, yearFilter]);

	// Handle month/year selection
	const handleMonthSelect = useCallback(
		(day: Date | undefined) => {
			if (!day) return;
			const m = String(day.getMonth() + 1).padStart(2, "0");
			const y = String(day.getFullYear());
			setMonthFilter(m);
			setYearFilter(y);
			// Clear date range when using month selector
			setDateFrom("");
			setDateTo("");
		},
		[setMonthFilter, setYearFilter, setDateFrom, setDateTo],
	);

	const selectedMonthDate = (() => {
		const m = parseInt(monthFilter) - 1;
		const y = parseInt(yearFilter);
		if (isNaN(m) || isNaN(y)) return new Date();
		return new Date(y, m, 15);
	})();

	const monthLabel = (() => {
		try {
			return format(selectedMonthDate, "MMMM yyyy", { locale: es });
		} catch {
			return "Seleccionar mes";
		}
	})();

	// Check if a click target is inside a Radix popover portal (Calendar, etc.)
	const isInsidePopoverPortal = useCallback((target: Node) => {
		let el = target as HTMLElement | null;
		while (el) {
			if (
				el.hasAttribute?.("data-radix-popper-content-wrapper") ||
				el.getAttribute?.("role") === "dialog" ||
				el.hasAttribute?.("data-radix-portal")
			) {
				return true;
			}
			el = el.parentElement;
		}
		return false;
	}, []);

	// Handle clicks outside of dropdowns
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;

			// Never close if clicking inside a popover portal (Calendar, etc.)
			if (isInsidePopoverPortal(target)) return;

			if (
				filtersContainerRef.current &&
				!filtersContainerRef.current.contains(target) &&
				isFiltersOpen
			) {
				setIsFiltersOpen(false);
			}
			if (
				serviceDropdownRef.current &&
				!serviceDropdownRef.current.contains(target) &&
				isServiceDropdownOpen
			) {
				setIsServiceDropdownOpen(false);
			}
			if (
				representativeLawyerDropdownRef.current &&
				!representativeLawyerDropdownRef.current.contains(target) &&
				isRepresentativeLawyerDropdownOpen
			) {
				setIsRepresentativeLawyerDropdownOpen(false);
			}
			if (
				internalLawyerDropdownRef.current &&
				!internalLawyerDropdownRef.current.contains(target) &&
				isInternalLawyerDropdownOpen
			) {
				setIsInternalLawyerDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isFiltersOpen, isServiceDropdownOpen, isRepresentativeLawyerDropdownOpen, isInternalLawyerDropdownOpen, isInsidePopoverPortal]);

	const activeFiltersCount = getActiveFiltersCount();

	return (
		<div className="space-y-4">
			{/* Search and main controls */}
			<div className="flex flex-wrap items-center gap-3">
				{/* Search Input */}
				<div className="relative flex-1 min-w-[200px]">
					<div className="relative">
						<div className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none z-1">
							<Search className="w-5 h-5 text-gray-500 dark:text-gray-300" />
						</div>
						<Input
							type="search"
							placeholder="Buscar por nombre o email..."
							className="dark:bg-dark-900 h-11 w-full rounded-lg border bg-white border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-600 focus:border-primary/30 focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-primary/40 xl:w-[430px]"
							defaultValue={searchTerm}
							onChange={handleSearchChange}
							ref={searchInputRef}
						/>
						{searchTerm && (
							<button
								type="button"
								onClick={() => setSearchTerm("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
							>
								<X className="w-4 h-4 text-gray-600" />
							</button>
						)}
					</div>
				</div>

				{/* Filters Toggle Button */}
				<div className="relative" ref={filtersContainerRef}>
					<button
						onClick={() => setIsFiltersOpen(!isFiltersOpen)}
						className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${
							activeFiltersCount > 0 || isFiltersOpen
								? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-950 dark:text-blue-300"
								: "border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10"
						}`}
					>
						<Filter className="h-4 w-4" />
						<span>Filtros</span>
						{activeFiltersCount > 0 && (
							<span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
								{activeFiltersCount}
							</span>
						)}
						<ChevronDown
							className={`h-4 w-4 transition-transform ${isFiltersOpen ? "rotate-180" : ""}`}
						/>
					</button>

					{/* Filters Dropdown */}
					{isFiltersOpen && (
						<div className="absolute right-0 z-20 mt-2 w-[700px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-lg">
							<div className="mb-4 flex items-center justify-between">
								<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
									Filtros de búsqueda
								</h3>
								<button
									onClick={() => setIsFiltersOpen(false)}
									className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
								>
									<X className="h-5 w-5" />
								</button>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{/* Service Type Filter */}
								<div className="relative" ref={serviceDropdownRef}>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Tipo de servicio
									</label>
									<button
										onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
										className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 px-3 text-sm"
									>
										<span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
											<ListFilterPlus className="h-4 w-4 text-gray-500" />
											{selectedService !== undefined
												? getServiceName(selectedService)
												: "Seleccionar servicio"}
										</span>
										<ChevronDown
											className={`h-4 w-4 text-gray-500 transition-transform ${isServiceDropdownOpen ? "rotate-180" : ""}`}
										/>
									</button>

									{isServiceDropdownOpen && (
										<div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg max-h-60 overflow-y-auto">
											<div
												className="cursor-pointer px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
												onClick={() => handleServiceSelect(undefined)}
											>
												Todos los servicios
											</div>
											{SERVICES_TYPE.map((service) => (
												<div
													key={service.id}
													className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 ${
														selectedService === service.value
															? "bg-gray-100 dark:bg-white/5 font-medium"
															: ""
													}`}
													onClick={() => handleServiceSelect(service.value)}
												>
													{service.label}
												</div>
											))}
										</div>
									)}
								</div>

								{/* Date Mode Selector + Date Filter */}
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Filtro de fecha
									</label>
									{/* Mode toggle */}
									<div className="flex items-center rounded-lg border border-input bg-background p-1 gap-1 mb-2">
										<Button
											type="button"
											variant={dateMode === "month" ? "default" : "ghost"}
											size="sm"
											onClick={() => {
												setDateMode("month");
												setDateFrom("");
												setDateTo("");
											}}
											className="h-7 px-3 text-xs"
										>
											Por mes
										</Button>
										<Button
											type="button"
											variant={dateMode === "range" ? "default" : "ghost"}
											size="sm"
											onClick={() => {
												setDateMode("range");
												setMonthFilter("");
												setYearFilter("");
											}}
											className="h-7 px-3 text-xs"
										>
											Rango de fechas
										</Button>
									</div>

									{dateMode === "month" ? (
										/* Month-only grid picker */
										<Popover open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className="h-10 w-full justify-start gap-2 px-3 text-sm font-normal capitalize"
												>
													<CalendarIcon className="h-4 w-4 text-muted-foreground" />
													{monthFilter && yearFilter ? monthLabel : "Seleccionar mes"}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-70 p-4"
												align="start"
												onInteractOutside={(e) => {
													if (isInsidePopoverPortal(e.target as Node)) e.preventDefault();
												}}
											>
												{/* Year navigation */}
												<div className="flex items-center justify-between mb-3">
													<button
														type="button"
														onClick={() => setMonthPickerYear((y) => y - 1)}
														className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10"
													>
														<ChevronDown className="h-4 w-4 rotate-90" />
													</button>
													<span className="text-sm font-semibold">{monthPickerYear}</span>
													<button
														type="button"
														onClick={() => setMonthPickerYear((y) => y + 1)}
														className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10"
													>
														<ChevronDown className="h-4 w-4 -rotate-90" />
													</button>
												</div>
												{/* Month grid */}
												<div className="grid grid-cols-3 gap-2">
													{Array.from({ length: 12 }, (_, i) => {
														const m = String(i + 1).padStart(2, "0");
														const isSelected = monthFilter === m && yearFilter === String(monthPickerYear);
														const label = format(new Date(monthPickerYear, i, 1), "MMM", { locale: es });
														return (
															<button
																key={i}
																type="button"
																onClick={() => {
																	setMonthFilter(m);
																	setYearFilter(String(monthPickerYear));
																	setDateFrom("");
																	setDateTo("");
																	setMonthPickerOpen(false);
																}}
																className={`rounded-md px-2 py-2 text-sm capitalize transition-colors ${
																	isSelected
																		? "bg-primary text-primary-foreground font-medium"
																		: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300"
																}`}
															>
																{label}
															</button>
														);
													})}
												</div>
											</PopoverContent>
										</Popover>
									) : (
										/* Date range picker with controlled open state */
										<Popover open={rangePickerOpen} onOpenChange={setRangePickerOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={`h-10 w-full justify-start gap-2 px-3 text-sm font-normal ${
														dateFrom || dateTo
															? "border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300"
															: "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
													}`}
												>
													<CalendarIcon className="h-4 w-4" />
													{dateFrom && dateTo
														? `${format(new Date(dateFrom), "dd MMM yyyy", { locale: es })} - ${format(new Date(dateTo), "dd MMM yyyy", { locale: es })}`
														: dateFrom
															? `Desde ${format(new Date(dateFrom), "dd MMM yyyy", { locale: es })}`
															: dateTo
																? `Hasta ${format(new Date(dateTo), "dd MMM yyyy", { locale: es })}`
																: "Seleccionar rango de fechas"}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto p-0"
												align="start"
												onInteractOutside={(e) => {
													if (isInsidePopoverPortal(e.target as Node)) e.preventDefault();
												}}
											>
												<Calendar
													mode="range"
													defaultMonth={dateFrom ? new Date(dateFrom) : undefined}
													selected={{
														from: dateFrom ? new Date(dateFrom) : undefined,
														to: dateTo ? new Date(dateTo) : undefined,
													} as DateRange}
													onSelect={(range: DateRange | undefined) => {
														setDateFrom(range?.from ? format(range.from, "yyyy-MM-dd") : "");
														setDateTo(range?.to ? format(range.to, "yyyy-MM-dd") : "");
														// Only close when both dates are selected
														if (range?.from && range?.to) {
															setRangePickerOpen(false);
														}
													}}
													numberOfMonths={2}
													locale={es}
												/>
												<div className="border-t px-3 py-2 flex justify-between">
													{(dateFrom || dateTo) && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => {
																setDateFrom("");
																setDateTo("");
															}}
															className="text-xs"
														>
															Limpiar fechas
														</Button>
													)}
													<Button
														size="sm"
														onClick={() => setRangePickerOpen(false)}
														className="text-xs ml-auto"
													>
														Cerrar
													</Button>
												</div>
											</PopoverContent>
										</Popover>
									)}
								</div>

								{/* Responsible Lawyer Filter */}
								<div className="relative" ref={representativeLawyerDropdownRef}>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Abogado Responsable
									</label>
									<button
										onClick={() => setIsRepresentativeLawyerDropdownOpen(!isRepresentativeLawyerDropdownOpen)}
										className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 px-3 text-sm"
									>
										<span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
											<UserCheck className="h-4 w-4 text-gray-500" />
											{getRepresentativeLawyerName(selectedResponsibleLawyer)}
										</span>
										<ChevronDown
											className={`h-4 w-4 text-gray-500 transition-transform ${isRepresentativeLawyerDropdownOpen ? "rotate-180" : ""}`}
										/>
									</button>

									{isRepresentativeLawyerDropdownOpen && (
										<div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg max-h-72 overflow-hidden flex flex-col">
											{/* Search input */}
											<div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-800">
												<Input
													type="text"
													placeholder="Buscar abogado..."
													value={repLawyerSearch}
													onChange={(e) => setRepLawyerSearch(e.target.value)}
													className="h-8 text-sm"
													autoFocus
												/>
											</div>
											<div className="overflow-y-auto max-h-52">
												<div
													className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between"
													onClick={() => setSelectedResponsibleLawyer([])}
												>
													<span>Limpiar selección</span>
													{selectedResponsibleLawyer.length === 0 && (
														<Check className="h-4 w-4 text-blue-500" />
													)}
												</div>
												{filteredResponsibleLawyers.map((lawyer) => {
													const isSelected = selectedResponsibleLawyer.includes(lawyer.value);
													return (
														<div
															key={lawyer.id}
															className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between ${
																isSelected ? "bg-blue-50 dark:bg-primary/10" : ""
															}`}
															onClick={() => handleRepresentativeLawyerSelect(lawyer.value)}
														>
															<span className={isSelected ? "font-medium text-blue-700" : ""}>
																{lawyer.label}
															</span>
															{isSelected && <Check className="h-4 w-4 text-blue-500" />}
														</div>
													);
												})}
												{filteredResponsibleLawyers.length === 0 && (
													<div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
												)}
											</div>
										</div>
									)}
								</div>

								{/* Internal Lawyer Filter */}
								<div className="relative" ref={internalLawyerDropdownRef}>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Abogado Interno
									</label>
									<button
										onClick={() => setIsInternalLawyerDropdownOpen(!isInternalLawyerDropdownOpen)}
										className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 px-3 text-sm"
									>
										<span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
											<Users className="h-4 w-4 text-gray-500" />
											{getInternalLawyerName(selectedInternalLawyer)}
										</span>
										<ChevronDown
											className={`h-4 w-4 text-gray-500 transition-transform ${isInternalLawyerDropdownOpen ? "rotate-180" : ""}`}
										/>
									</button>

									{isInternalLawyerDropdownOpen && (
										<div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg max-h-72 overflow-hidden flex flex-col">
											{/* Search input */}
											<div className="px-2 py-1.5 border-b border-gray-100 dark:border-gray-800">
												<Input
													type="text"
													placeholder="Buscar abogado..."
													value={intLawyerSearch}
													onChange={(e) => setIntLawyerSearch(e.target.value)}
													className="h-8 text-sm"
													autoFocus
												/>
											</div>
											<div className="overflow-y-auto max-h-52">
												<div
													className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between"
													onClick={() => setSelectedInternalLawyer([])}
												>
													<span>Limpiar selección</span>
													{selectedInternalLawyer.length === 0 && (
														<Check className="h-4 w-4 text-blue-500" />
													)}
												</div>
												{filteredInternalLawyers.map((lawyer) => {
													const isSelected = selectedInternalLawyer.includes(lawyer.value);
													return (
														<div
															key={lawyer.id}
															className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between ${
																isSelected ? "bg-blue-50 dark:bg-primary/10" : ""
															}`}
															onClick={() => handleInternalLawyerSelect(lawyer.value)}
														>
															<span className={isSelected ? "font-medium text-blue-700" : ""}>
																{lawyer.label}
															</span>
															{isSelected && <Check className="h-4 w-4 text-blue-500" />}
														</div>
													);
												})}
												{filteredInternalLawyers.length === 0 && (
													<div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Filter Actions */}
							<div className="mt-6 flex items-center justify-between">
								<Button
									variant="ghost"
									onClick={handleClearFilters}
									disabled={!hasActiveFilters}
									className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
								>
									<X className="h-4 w-4" />
									Limpiar todos
								</Button>
								<Button onClick={() => setIsFiltersOpen(false)}>
									Aplicar filtros
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Active Filters Display */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm text-gray-600 dark:text-gray-400">Filtros activos:</span>

					{searchTerm && (
						<span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
							Búsqueda: {searchTerm}
							<button onClick={() => setSearchTerm("")} className="text-gray-600 hover:text-gray-800">
								<X className="h-3 w-3" />
							</button>
						</span>
					)}

					{selectedService !== undefined && (
						<span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
							{getServiceName(selectedService)}
							<button
								onClick={() => setSelectedService(undefined)}
								className="text-blue-600 hover:text-blue-800"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					)}

					{selectedResponsibleLawyer && selectedResponsibleLawyer.length > 0 && (
						<span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">
							{selectedResponsibleLawyer.length === 1
								? getRepresentativeLawyerName(selectedResponsibleLawyer)
								: `${selectedResponsibleLawyer.length} abogados responsables`}
							<button
								onClick={() => setSelectedResponsibleLawyer([])}
								className="text-purple-600 hover:text-purple-800"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					)}

					{selectedInternalLawyer && selectedInternalLawyer.length > 0 && (
						<span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs text-orange-800">
							{selectedInternalLawyer.length === 1
								? getInternalLawyerName(selectedInternalLawyer)
								: `${selectedInternalLawyer.length} abogados internos`}
							<button
								onClick={() => setSelectedInternalLawyer([])}
								className="text-orange-600 hover:text-orange-800"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					)}

					{(dateFrom || dateTo) && (
						<span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
							{dateFrom && dateTo
								? `${format(new Date(dateFrom), "dd/MM/yy")} - ${format(new Date(dateTo), "dd/MM/yy")}`
								: dateFrom
									? `Desde ${format(new Date(dateFrom), "dd/MM/yy")}`
									: `Hasta ${format(new Date(dateTo), "dd/MM/yy")}`}
							<button
								onClick={() => {
									setDateFrom("");
									setDateTo("");
								}}
								className="text-yellow-600 hover:text-yellow-800"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					)}

					{monthFilter && yearFilter && !dateFrom && !dateTo && (
						<span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-800 capitalize">
							{monthLabel}
							<button
								onClick={() => {
									setMonthFilter("");
									setYearFilter("");
								}}
								className="text-teal-600 hover:text-teal-800"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					)}
				</div>
			)}
		</div>
	);
};
