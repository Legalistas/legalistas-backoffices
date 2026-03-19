"use client";

import {
	CalendarIcon,
	Check,
	ChevronDown,
	ChevronUp,
	Columns,
	FileDown,
	Filter,
	List,
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
import { Can } from "@/components/auth/Can";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Role } from "@/constant/user";
import { servicesType, stageCases } from "@/lib/constant";
import { getServiceName, getStatusName } from "@/lib/functions";

interface LawyerOption {
	id: string;
	value: string;
	label: string;
}

interface CasesFiltersProps {
	searchTerm: string;
	setSearchTerm: (term: string) => void;
	selectedService: number | undefined;
	setSelectedService: (service: number | undefined) => void;
	selectedStage: number | undefined;
	setSelectedStage: (status: number | undefined) => void;
	selectedRepresentativeLawyer: string[];
	setSelectedRepresentativeLawyer: React.Dispatch<
		React.SetStateAction<string[]>
	>;
	selectedInternalLawyer: string[];
	setSelectedInternalLawyer: React.Dispatch<React.SetStateAction<string[]>>;
	dateFrom: string;
	setDateFrom: (date: string) => void;
	dateTo: string;
	setDateTo: (date: string) => void;
	hasActiveFilters: boolean;
	handleClearSearch: () => void;
	viewMode: "list" | "kanban";
	handleViewModeChange: (mode: "list" | "kanban") => void;
	showArchivedOnly: boolean; // Updated prop name
	setShowArchivedOnly: (checked: boolean) => void; // Updated setter prop name
	showAll: boolean;
	setShowAll: (checked: boolean) => void;
	onExportExcel: () => void;
	responsibleLawyerTypes?: LawyerOption[];
	lawyerInternalTypes?: LawyerOption[];
}

export const CasesFilters = ({
	searchTerm,
	setSearchTerm,
	selectedService,
	setSelectedService,
	selectedStage,
	setSelectedStage,
	selectedRepresentativeLawyer,
	setSelectedRepresentativeLawyer,
	selectedInternalLawyer,
	setSelectedInternalLawyer,
	dateFrom,
	setDateFrom,
	dateTo,
	setDateTo,
	hasActiveFilters,
	handleClearSearch,
	viewMode,
	handleViewModeChange,
	showArchivedOnly, // Updated prop name
	setShowArchivedOnly, // Updated setter prop name
	showAll,
	setShowAll,
	onExportExcel,
	responsibleLawyerTypes,
	lawyerInternalTypes,
}: CasesFiltersProps) => {
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);
	const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
	const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);
	const [
		isRepresentativeLawyerDropdownOpen,
		setIsRepresentativeLawyerDropdownOpen,
	] = useState(false);
	const [isInternalLawyerDropdownOpen, setIsInternalLawyerDropdownOpen] =
		useState(false);

	const searchInputRef = useRef<HTMLInputElement>(null);
	const filtersContainerRef = useRef<HTMLDivElement>(null);
	const serviceDropdownRef = useRef<HTMLDivElement>(null);
	const statusDropdownRef = useRef<HTMLDivElement>(null);
	const representativeLawyerDropdownRef = useRef<HTMLDivElement>(null);
	const internalLawyerDropdownRef = useRef<HTMLDivElement>(null);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchTerm(e.target.value);
		},
		[setSearchTerm],
	);

	const handleSearch = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const inputValue = searchInputRef.current?.value || "";
			setSearchTerm(inputValue);
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

	const handleStageSelect = useCallback(
		(statusId: number | undefined) => {
			setSelectedStage(statusId);
			setIsStageDropdownOpen(false);
		},
		[setSelectedStage],
	);

	const handleRepresentativeLawyerSelect = useCallback(
		(lawyerId: string) => {
			setSelectedRepresentativeLawyer((prev) => {
				if (prev.includes(lawyerId)) {
					return prev.filter((id) => id !== lawyerId);
				} else {
					return [...prev, lawyerId];
				}
			});
		},
		[setSelectedRepresentativeLawyer],
	);

	const handleInternalLawyerSelect = useCallback(
		(lawyerId: string) => {
			setSelectedInternalLawyer((prev) => {
				if (prev.includes(lawyerId)) {
					return prev.filter((id) => id !== lawyerId);
				} else {
					return [...prev, lawyerId];
				}
			});
		},
		[setSelectedInternalLawyer],
	);


	const getRepresentativeLawyerName = useCallback(
		(lawyerIds: string[]) => {
			if (!lawyerIds || lawyerIds.length === 0) return "Abogado Representante";
			if (lawyerIds.length === 1) {
				const lawyer = responsibleLawyerTypes?.find(
					(l) => l.value === lawyerIds[0],
				);
				return lawyer ? lawyer.label : "Abogado Representante";
			}
			return `${lawyerIds.length} abogados seleccionados`;
		},
		[responsibleLawyerTypes],
	);

	const getInternalLawyerName = useCallback(
		(lawyerIds: string[]) => {
			if (!lawyerIds || lawyerIds.length === 0) return "Abogado Interno";
			if (lawyerIds.length === 1) {
				const lawyer = lawyerInternalTypes?.find(
					(l) => l.value === lawyerIds[0],
				);
				return lawyer ? lawyer.label : "Abogado Interno";
			}
			return `${lawyerIds.length} abogados seleccionados`;
		},
		[lawyerInternalTypes],
	);

	// Count active filters
	const getActiveFiltersCount = useCallback(() => {
		let count = 0;
		if (selectedService !== undefined) count++;
		if (selectedStage !== undefined) count++;
		if (selectedRepresentativeLawyer && selectedRepresentativeLawyer.length > 0)
			count++;
		if (selectedInternalLawyer && selectedInternalLawyer.length > 0) count++;
		if (dateFrom || dateTo) count++;
		if (showArchivedOnly) count++;
		if (showAll) count++;
		return count;
	}, [
		selectedService,
		selectedStage,
		selectedRepresentativeLawyer,
		selectedInternalLawyer,
		dateFrom,
		dateTo,
		showArchivedOnly,
		showAll,
	]);

	// Handle clicks outside of dropdowns
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			// Filters container
			if (
				filtersContainerRef.current &&
				!filtersContainerRef.current.contains(event.target as Node) &&
				isFiltersOpen
			) {
				setIsFiltersOpen(false);
			}

			// Service dropdown
			if (
				serviceDropdownRef.current &&
				!serviceDropdownRef.current.contains(event.target as Node) &&
				isServiceDropdownOpen
			) {
				setIsServiceDropdownOpen(false);
			}

			// Status dropdown
			if (
				statusDropdownRef.current &&
				!statusDropdownRef.current.contains(event.target as Node) &&
				isStageDropdownOpen
			) {
				setIsStageDropdownOpen(false);
			}

			// Representative lawyer dropdown
			if (
				representativeLawyerDropdownRef.current &&
				!representativeLawyerDropdownRef.current.contains(
					event.target as Node,
				) &&
				isRepresentativeLawyerDropdownOpen
			) {
				setIsRepresentativeLawyerDropdownOpen(false);
			}

			// Internal lawyer dropdown
			if (
				internalLawyerDropdownRef.current &&
				!internalLawyerDropdownRef.current.contains(event.target as Node) &&
				isInternalLawyerDropdownOpen
			) {
				setIsInternalLawyerDropdownOpen(false);
			}

		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [
		isFiltersOpen,
		isServiceDropdownOpen,
		isStageDropdownOpen,
		isRepresentativeLawyerDropdownOpen,
		isInternalLawyerDropdownOpen,
	]);


	const activeFiltersCount = getActiveFiltersCount();

	return (
		<div className="space-y-4">
			{/* Search and main controls */}
			<div className="flex flex-wrap items-center gap-3">
				{/* Search Input */}
				<div className="relative flex-1 min-w-[200px]">
					<form onSubmit={handleSearch} className="w-full">
						<div className="relative">
							<div className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none z-1">
								<Search className="w-5 h-5 text-gray-500 dark:text-gray-300" />
							</div>
							<Input
								type="search"
								placeholder="Buscar caso..."
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
									<span className="sr-only">Clear search</span>
									<X className="w-4 h-4 text-gray-600" />
								</button>
							)}
						</div>
					</form>
				</div>

				{/* Filters Toggle Button */}
				<div className="relative" ref={filtersContainerRef}>
					<button
						onClick={() => setIsFiltersOpen(!isFiltersOpen)}
						className={`flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors ${activeFiltersCount > 0 || isFiltersOpen
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
						<div className="absolute right-0 z-20 mt-2 w-200 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-lg">
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

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{/* Service Type Filter */}
								<div className="relative" ref={serviceDropdownRef}>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Tipo de servicio
									</label>
									<button
										onClick={() =>
											setIsServiceDropdownOpen(!isServiceDropdownOpen)
										}
										className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 px-3 text-sm"
									>
										<span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
											<ListFilterPlus className="h-4 w-4 text-gray-500" />
											{selectedService !== undefined
												? getServiceName(selectedService)
												: "Seleccionar servicio"}
										</span>
										<ChevronUp
											className={
												isServiceDropdownOpen
													? "rotate-180 h-4 w-4 text-gray-500"
													: "h-4 w-4 text-gray-500"
											}
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
											{servicesType.map((service) => (
												<div
													key={service.id}
													className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 ${selectedService === service.value
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

								{/* Status Filter */}
								<div className="relative" ref={statusDropdownRef}>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Etapa del caso
									</label>
									<button
										onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
										className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 px-3 text-sm"
									>
										<span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
											<ListFilterPlus className="h-4 w-4 text-gray-500" />
											{selectedStage !== undefined
												? getStatusName(selectedStage)
												: "Seleccionar etapa"}
										</span>
										<ChevronUp
											className={
												isStageDropdownOpen
													? "rotate-180 h-4 w-4 text-gray-500"
													: "h-4 w-4 text-gray-500"
											}
										/>
									</button>

									{isStageDropdownOpen && (
										<div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg max-h-60 overflow-y-auto">
											<div
												className="cursor-pointer px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
												onClick={() => handleStageSelect(undefined)}
											>
												Todas las etapas
											</div>
											{stageCases.map((stage) => (
												<div
													key={stage.id}
													className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 ${selectedStage === stage.value
														? "bg-gray-100 dark:bg-white/5 font-medium"
														: ""
														}`}
													onClick={() => handleStageSelect(stage.value)}
												>
													{stage.label}
												</div>
											))}
										</div>
									)}
								</div>

								{/* Representative Lawyer Filter */}
								<div className="relative" ref={representativeLawyerDropdownRef}>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Abogado Representante
									</label>
									<button
										onClick={() =>
											setIsRepresentativeLawyerDropdownOpen(
												!isRepresentativeLawyerDropdownOpen,
											)
										}
										className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 px-3 text-sm"
									>
										<span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
											<UserCheck className="h-4 w-4 text-gray-500" />
											{getRepresentativeLawyerName(
												selectedRepresentativeLawyer,
											)}
										</span>
										<ChevronUp
											className={
												isRepresentativeLawyerDropdownOpen
													? "rotate-180 h-4 w-4 text-gray-500"
													: "h-4 w-4 text-gray-500"
											}
										/>
									</button>

									{isRepresentativeLawyerDropdownOpen && (
										<div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg max-h-60 overflow-y-auto">
											<div
												className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between"
												onClick={() => setSelectedRepresentativeLawyer([])}
											>
												<span>Limpiar selección</span>
												{selectedRepresentativeLawyer.length === 0 && (
													<Check className="h-4 w-4 text-blue-500" />
												)}
											</div>
											{responsibleLawyerTypes?.map((lawyer) => {
												const isSelected =
													selectedRepresentativeLawyer.includes(lawyer.value);
												return (
													<div
														key={lawyer.id}
														className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center justify-between ${isSelected ? "bg-blue-50 dark:bg-primary/10" : ""
															}`}
														onClick={() =>
															handleRepresentativeLawyerSelect(lawyer.value)
														}
													>
														<span
															className={
																isSelected ? "font-medium text-blue-700" : ""
															}
														>
															{lawyer.label}
														</span>
														{isSelected && (
															<Check className="h-4 w-4 text-blue-500" />
														)}
													</div>
												);
											})}
										</div>
									)}
								</div>

								{/* Internal Lawyer Filter */}
								<div className="relative" ref={internalLawyerDropdownRef}>
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Abogado Interno
									</label>
									<button
										onClick={() =>
											setIsInternalLawyerDropdownOpen(
												!isInternalLawyerDropdownOpen,
											)
										}
										className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 px-3 text-sm"
									>
										<span className="flex items-center gap-2 text-gray-700 dark:text-gray-300 truncate">
											<Users className="h-4 w-4 text-gray-500" />
											{getInternalLawyerName(selectedInternalLawyer)}
										</span>
										<ChevronUp
											className={
												isInternalLawyerDropdownOpen
													? "rotate-180 h-4 w-4 text-gray-500"
													: "h-4 w-4 text-gray-500"
											}
										/>
									</button>

									{isInternalLawyerDropdownOpen && (
										<div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1 shadow-lg max-h-60 overflow-y-auto">
											<div
												className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-between"
												onClick={() => setSelectedInternalLawyer([])}
											>
												<span>Limpiar selección</span>
												{selectedInternalLawyer.length === 0 && (
													<Check className="h-4 w-4 text-blue-500" />
												)}
											</div>
											{lawyerInternalTypes?.map((lawyer) => {
												const isSelected = selectedInternalLawyer.includes(
													lawyer.value,
												);
												return (
													<div
														key={lawyer.id}
														className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100 flex items-center justify-between ${isSelected ? "bg-blue-50 dark:bg-primary/10" : ""
															}`}
														onClick={() =>
															handleInternalLawyerSelect(lawyer.value)
														}
													>
														<span
															className={
																isSelected ? "font-medium text-blue-700" : ""
															}
														>
															{lawyer.label}
														</span>
														{isSelected && (
															<Check className="h-4 w-4 text-blue-500" />
														)}
													</div>
												);
											})}
										</div>
									)}
								</div>

								{/* Date Filter */}
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
										Fecha de creación
									</label>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={`h-10 w-full justify-start gap-2 px-3 text-sm font-normal ${dateFrom || dateTo
													? "border-primary text-primary dark:border-primary dark:text-primary"
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
										<PopoverContent className="w-auto p-0" align="start">
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
												}}
												numberOfMonths={2}
												locale={es}
											/>
											{(dateFrom || dateTo) && (
												<div className="border-t px-3 py-2 flex justify-end">
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
												</div>
											)}
										</PopoverContent>
									</Popover>
								</div>
							</div>

							{/* Filter Actions */}
							<div className="mt-6 flex items-center justify-between">
								<Button
									variant="ghost"
									onClick={handleClearSearch}
									disabled={!hasActiveFilters}
									className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
								>
									<X className="h-4 w-4" />
									Limpiar todos
								</Button>
								<Button
									onClick={() => setIsFiltersOpen(false)}
								>
									Aplicar filtros
								</Button>
							</div>
						</div>
					)}
				</div>

				{/* View Mode Toggle Group */}
				<div className="flex items-center rounded-lg border border-input bg-background p-1 gap-1">
					<Button
						type="button"
						variant={viewMode === "list" ? "default" : "ghost"}
						size="sm"
						onClick={() => handleViewModeChange("list")}
						title="Vista de lista"
						className="h-8 px-3"
					>
						<List className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant={viewMode === "kanban" ? "default" : "ghost"}
						size="sm"
						onClick={() => handleViewModeChange("kanban")}
						title="Vista Kanban"
						className="h-8 px-3"
					>
						<Columns className="h-4 w-4" />
					</Button>
				</div>

				{/* Mis Casos / Todos toggle */}
				<Can
					role={[
						Role.ADMINISTRATOR,
						Role.DIRECTOR_GENERAL_CEO,
						Role.GERENTE_GENERAL_COO,
						Role.DIRECTORA_AREA_LEGAL,
						Role.COORDINADOR_LEGAL,
						Role.ASISTENTE_LEGAL,
					]}
				>
					<div className="flex items-center rounded-lg border border-input bg-background p-1 gap-1">
						<Button
							type="button"
							variant={!showAll ? "default" : "ghost"}
							size="sm"
							onClick={() => setShowAll(false)}
							className="h-8 px-3"
						>
							Mis Casos
						</Button>
						<Button
							type="button"
							variant={showAll ? "default" : "ghost"}
							size="sm"
							onClick={() => {
								setShowAll(true);
								setShowArchivedOnly(false);
							}}
							className="h-8 px-3"
						>
							Todos
						</Button>
					</div>
				</Can>

				{/* Export Excel Button */}
				<Button
					variant="outline"
					className="flex h-11 items-center gap-2 px-3 border-gray-200 dark:border-gray-700 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400 hover:text-green-700"
					onClick={onExportExcel}
				>
					<FileDown className="h-4 w-4" />
					<span className="text-sm">Exportar Excel</span>
				</Button>
			</div>

			{/* Active Filters Display */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-sm text-gray-600 dark:text-gray-400">Filtros activos:</span>
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
					{selectedStage !== undefined && (
						<span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
							{getStatusName(selectedStage)}
							<button
								onClick={() => setSelectedStage(undefined)}
								className="text-green-600 hover:text-green-800"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					)}
					{selectedRepresentativeLawyer &&
						selectedRepresentativeLawyer.length > 0 && (
							<span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-800">
								{selectedRepresentativeLawyer.length === 1
									? getRepresentativeLawyerName(selectedRepresentativeLawyer)
									: `${selectedRepresentativeLawyer.length} abogados representantes`}
								<button
									onClick={() => setSelectedRepresentativeLawyer([])}
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
					{showArchivedOnly && (
						<span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800">
							Solo Archivados
							<button
								onClick={() => setShowArchivedOnly(false)}
								className="text-gray-600 hover:text-gray-800"
							>
								<X className="h-3 w-3" />
							</button>
						</span>
					)}
					{showAll && (
						<span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-1 text-xs text-teal-800">
							Mostrando todos
							<button
								onClick={() => setShowAll(false)}
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
