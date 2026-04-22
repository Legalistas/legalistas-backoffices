"use client";

import {
	CalendarDays,
	ChevronDown,
	Columns,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { ALL_CLOSING_COLUMNS } from "@/components/closing-manager/closing-manager-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LAWYERS_ENDPOINT } from "@/constant/api-endpoints";
import {
	closingType,
	monthOptions,
	statusCapital,
	statusData,
} from "@/constant/closing-manager";
import { Role } from "@/constant/user";

const RESPONSIBLE_LAWYER_ROLES = [
	Role.DIRECTOR_GENERAL_CEO,
	Role.GERENTE_GENERAL_COO,
	Role.DIRECTORA_AREA_LEGAL,
	Role.COORDINADOR_LEGAL,
	Role.ABOGADO_REPRESENTANTE,
] as string[];

export interface ClosingFiltersState {
	search: string;
	type: string;
	capitalState: string;
	feeStatus: string;
	pclStatus: string;
	responsibleLawyerId: string;
}

interface ClosingFiltersProps {
	filters: ClosingFiltersState;
	onFiltersChange: (filters: ClosingFiltersState) => void;
	visibleColumns: string[];
	onColumnsChange: (columns: string[]) => void;
	month: number;
	year: number;
	viewAll: boolean;
	onMonthChange: (month: number) => void;
	onYearChange: (year: number) => void;
	onToggleViewAll: () => void;
}

const columnLabels: Record<string, string> = {
	date: "Fecha",
	case: "Causa",
	lawyer: "Representante",
	type: "Tipo de Cierre",
	capitalAmount: "Capital ($)",
	capitalState: "Estado Capital",
	hpAgreed: "HP Convenido (%)",
	hpTotal: "HP Total ($)",
	hpRepresentante: "HP Representante ($)",
	hpLegalistas: "HP Legalistas ($)",
	feeStatus: "Estado Honorarios",
	pclAgreed: "PCL Convenido (%)",
	pclTotal: "PCL Total ($)",
	pclRepresentante: "PCL Representante ($)",
	pclLegalistas: "PCL Legalistas ($)",
	pclStatus: "Estado PCL",
	contributionsAmount: "Aportes Totales ($)",
	aportesRepresentante: "Aportes Representante ($)",
	aportesLegalistas: "Aportes Legalistas ($)",
	montoTransferir: "Monto a Transferir ($)",
	totalCaseExpenses: "Gastos Causa ($)",
	detail: "Detalle",
};

const ALWAYS_VISIBLE = ["montoTransferir"];
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function ClosingFilters({
	filters,
	onFiltersChange,
	visibleColumns,
	onColumnsChange,
	month,
	year,
	viewAll,
	onMonthChange,
	onYearChange,
	onToggleViewAll,
}: ClosingFiltersProps) {
	const { data: session } = useSession();
	const [localSearch, setLocalSearch] = useState(filters.search);
	const [showColumnsMenu, setShowColumnsMenu] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [lawyers, setLawyers] = useState<{ id: number; name: string }[]>([]);
	const [lawyerSearch, setLawyerSearch] = useState("");
	const [showLawyerDropdown, setShowLawyerDropdown] = useState(false);
	const lawyerDropdownRef = useRef<HTMLDivElement>(null);
	const lawyerInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!session?.user?.accessToken) return;
		const fetchLawyers = async () => {
			try {
				const response = await fetch(`${LAWYERS_ENDPOINT}?limit=10000`, {
					headers: { Authorization: `Bearer ${session.user.accessToken}` },
				});
				if (response.ok) {
					const data = await response.json();
					const list = Array.isArray(data) ? data : data.data || [];
					const representatives = list
						.filter((u: any) =>
							u?.roleUser?.some((ru: any) =>
								RESPONSIBLE_LAWYER_ROLES.includes(ru?.role?.name),
							),
						)
						.map((u: any) => ({ id: u.id, name: u.name ?? "" }))
						.sort((a: { name: string }, b: { name: string }) =>
							a.name.localeCompare(b.name),
						);
					setLawyers(representatives);
				}
			} catch {
				// silent
			}
		};
		fetchLawyers();
	}, [session?.user?.accessToken]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				lawyerDropdownRef.current &&
				!lawyerDropdownRef.current.contains(e.target as Node)
			) {
				setShowLawyerDropdown(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredLawyers = lawyers.filter((l) =>
		(l.name ?? "").toLowerCase().includes(lawyerSearch.toLowerCase()),
	);

	const selectedLawyerName =
		lawyers.find((l) => String(l.id) === filters.responsibleLawyerId)?.name ||
		"";

	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			onFiltersChange({ ...filters, search: localSearch });
		}
	};

	const clearFilters = () => {
		setLocalSearch("");
		onFiltersChange({
			search: "",
			type: "",
			capitalState: "",
			feeStatus: "",
			pclStatus: "",
			responsibleLawyerId: "",
		});
	};

	const hasActiveFilters =
		filters.search ||
		filters.type ||
		filters.capitalState ||
		filters.feeStatus ||
		filters.pclStatus ||
		filters.responsibleLawyerId;
	const activeFilterCount = [
		filters.type,
		filters.capitalState,
		filters.feeStatus,
		filters.pclStatus,
		filters.responsibleLawyerId,
	].filter(Boolean).length;

	const toggleColumn = (columnId: string) => {
		if (ALWAYS_VISIBLE.includes(columnId)) return;
		if (visibleColumns.includes(columnId)) {
			onColumnsChange(visibleColumns.filter((id) => id !== columnId));
		} else {
			onColumnsChange([...visibleColumns, columnId]);
		}
	};

	const toggleAllColumns = () => {
		if (visibleColumns.length === ALL_CLOSING_COLUMNS.length) {
			onColumnsChange(ALWAYS_VISIBLE);
		} else {
			onColumnsChange([...ALL_CLOSING_COLUMNS]);
		}
	};

	const currentMonthLabel =
		monthOptions.find((m) => m.value === month)?.label || "";

	return (
		<div className="space-y-3">
			{/* Card principal */}
			<div className="bg-white dark:bg-white/3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
				{/* Barra superior: período + búsqueda + acciones */}
				<div className="flex items-center gap-3 p-3">
					{/* Período — pill style */}
					<div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-800 p-1">
						<div className="flex items-center gap-1.5 pl-2">
							<CalendarDays className="h-4 w-4 text-gray-400" />
						</div>
						<Select
							value={String(month)}
							onValueChange={(v) => onMonthChange(Number(v))}
							disabled={viewAll}
						>
							<SelectTrigger
								className="border-0 bg-transparent shadow-none h-8 min-w-28 text-sm font-medium focus:ring-0"
							>
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

						<button
							onClick={onToggleViewAll}
							className={`
                h-8 px-3 rounded-md text-xs font-medium transition-all whitespace-nowrap
                ${
									viewAll
										? "bg-primary text-white shadow-sm"
										: "text-gray-600 hover:bg-gray-100 dark:bg-white/5"
								}
              `}
						>
							{viewAll ? "Anual" : "Año completo"}
						</button>
					</div>

					{/* Búsqueda */}
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="Buscar por causa, representante, detalle..."
							value={localSearch}
							onChange={(e) => setLocalSearch(e.target.value)}
							onKeyDown={handleSearchKeyDown}
							className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 dark:bg-white/5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-white/5 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
						/>
					</div>

					{/* Filtros avanzados toggle */}
					<button
						onClick={() => setShowAdvanced(!showAdvanced)}
						className={`
              flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all
              ${
								showAdvanced || hasActiveFilters
									? "border-primary/20 bg-primary/5 text-primary"
									: "border-gray-200 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10"
							}
            `}
					>
						<SlidersHorizontal className="h-3.5 w-3.5" />
						Filtros
						{activeFilterCount > 0 && (
							<span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-[10px] font-bold">
								{activeFilterCount}
							</span>
						)}
					</button>

					{/* Columnas */}
					<div className="relative">
						<button
							onClick={() => setShowColumnsMenu(!showColumnsMenu)}
							className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:bg-white/5 transition-colors"
						>
							<Columns className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Columnas</span>
							<span className="text-xs text-gray-400">
								({visibleColumns.length})
							</span>
							<ChevronDown
								className={`h-3.5 w-3.5 transition-transform ${showColumnsMenu ? "rotate-180" : ""}`}
							/>
						</button>

						{showColumnsMenu && (
							<>
								<div
									className="fixed inset-0 z-40"
									onClick={() => setShowColumnsMenu(false)}
								/>
								<div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
									<div className="p-3 border-b border-gray-100 flex items-center justify-between">
										<span className="text-sm font-semibold text-gray-900 dark:text-white">
											Columnas visibles
										</span>
										<button
											onClick={toggleAllColumns}
											className="text-xs font-medium text-primary hover:text-primary"
										>
											{visibleColumns.length === ALL_CLOSING_COLUMNS.length
												? "Ocultar todas"
												: "Mostrar todas"}
										</button>
									</div>
									<div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
										{ALL_CLOSING_COLUMNS.map((colId) => (
											<label
												key={colId}
												className={`
                          flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition-colors
                          ${ALWAYS_VISIBLE.includes(colId) ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-white/5"}
                          ${visibleColumns.includes(colId) ? "text-gray-900 dark:text-white" : "text-gray-400"}
                        `}
											>
												<Checkbox
													id={colId}
													checked={visibleColumns.includes(colId)}
													onCheckedChange={() => toggleColumn(colId)}
													disabled={ALWAYS_VISIBLE.includes(colId)}
												/>
												<span className="truncate">
													{columnLabels[colId] || colId}
												</span>
												{ALWAYS_VISIBLE.includes(colId) && (
													<span className="ml-auto text-[10px] font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded">
														Fija
													</span>
												)}
											</label>
										))}
									</div>
								</div>
							</>
						)}
					</div>

					{/* Limpiar */}
					{hasActiveFilters && (
						<button
							onClick={clearFilters}
							className="flex items-center gap-1 h-9 px-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
						>
							<X className="h-3.5 w-3.5" />
							Limpiar
						</button>
					)}
				</div>

				{/* Filtros avanzados — expandible */}
				{showAdvanced && (
					<div className="px-3 pb-3 pt-0">
						<div className="grid grid-cols-5 gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-gray-800">
							<div className="space-y-1.5" ref={lawyerDropdownRef}>
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
									Representante
								</label>
								<div className="relative">
									<div
										onClick={() => {
											setShowLawyerDropdown(!showLawyerDropdown);
											setLawyerSearch("");
											setTimeout(() => lawyerInputRef.current?.focus(), 0);
										}}
										className="flex items-center justify-between h-9 px-3 rounded-lg border border-gray-200 bg-white dark:bg-white/5 text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
									>
										<span
											className={`truncate ${filters.responsibleLawyerId ? "text-gray-900 dark:text-white" : "text-gray-400"}`}
										>
											{selectedLawyerName || "Todos"}
										</span>
										<div className="flex items-center gap-1 shrink-0">
											{filters.responsibleLawyerId && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														onFiltersChange({
															...filters,
															responsibleLawyerId: "",
														});
													}}
													className="p-0.5 rounded hover:bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600"
												>
													<X className="h-3 w-3" />
												</button>
											)}
											<ChevronDown
												className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showLawyerDropdown ? "rotate-180" : ""}`}
											/>
										</div>
									</div>

									{showLawyerDropdown && (
										<div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
											<div className="p-2 border-b border-gray-100">
												<div className="relative">
													<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
													<input
														ref={lawyerInputRef}
														type="text"
														placeholder="Buscar representante..."
														value={lawyerSearch}
														onChange={(e) => setLawyerSearch(e.target.value)}
														className="w-full h-8 pl-8 pr-3 rounded-md border border-gray-200 bg-gray-50 dark:bg-white/5 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-white/5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
													/>
												</div>
											</div>
											<div className="max-h-52 overflow-y-auto">
												<div
													onClick={() => {
														onFiltersChange({
															...filters,
															responsibleLawyerId: "",
														});
														setShowLawyerDropdown(false);
													}}
													className={`px-3 py-2 text-sm cursor-pointer transition-colors ${!filters.responsibleLawyerId ? "bg-primary/5 text-primary font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"}`}
												>
													Todos
												</div>
												{filteredLawyers.map((l) => (
													<div
														key={l.id}
														onClick={() => {
															onFiltersChange({
																...filters,
																responsibleLawyerId: String(l.id),
															});
															setShowLawyerDropdown(false);
														}}
														className={`px-3 py-2 text-sm cursor-pointer transition-colors ${filters.responsibleLawyerId === String(l.id) ? "bg-primary/5 text-primary font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"}`}
													>
														{l.name}
													</div>
												))}
												{filteredLawyers.length === 0 && lawyerSearch && (
													<div className="px-3 py-4 text-sm text-gray-400 text-center">
														Sin resultados
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
									Tipo de Cierre
								</label>
								<Select
									value={filters.type || "all"}
									onValueChange={(value) =>
										onFiltersChange({ ...filters, type: value === "all" ? "" : value })
									}
								>
									<SelectTrigger className="h-9 bg-white">
										<SelectValue placeholder="Todos" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Todos</SelectItem>
										<SelectItem value="SRT">{closingType.SRT}</SelectItem>
										<SelectItem value="JUDICIAL">
											{closingType.JUDICIAL}
										</SelectItem>
										<SelectItem value="EXTRAJUDICIAL">
											{closingType.EXTRAJUDICIAL}
										</SelectItem>
										<SelectItem value="DIRECTO">
											{closingType.DIRECTO}
										</SelectItem>
										<SelectItem value="OTROS">{closingType.OTROS}</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
									Estado Capital
								</label>
								<Select
									value={filters.capitalState || "all"}
									onValueChange={(value) =>
										onFiltersChange({ ...filters, capitalState: value === "all" ? "" : value })
									}
								>
									<SelectTrigger className="h-9 bg-white">
										<SelectValue placeholder="Todos" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Todos</SelectItem>
										<SelectItem value="AGREEMENT_IN_MANAGEMENT">
											{statusCapital.AGREEMENT_IN_MANAGEMENT}
										</SelectItem>
										<SelectItem value="AGREEMENT_PRESENTED">
											{statusCapital.AGREEMENT_PRESENTED}
										</SelectItem>
										<SelectItem value="AWAITING_DEADLINE">
											{statusCapital.AWAITING_DEADLINE}
										</SelectItem>
										<SelectItem value="REQUESTED_OP">
											{statusCapital.REQUESTED_OP}
										</SelectItem>
										<SelectItem value="TRANSFER_REQUESTED">
											{statusCapital.TRANSFER_REQUESTED}
										</SelectItem>
										<SelectItem value="K_RECEIVED_BY_ACTOR">
											{statusCapital.K_RECEIVED_BY_ACTOR}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
									Estado Honorarios
								</label>
								<Select
									value={filters.feeStatus || "all"}
									onValueChange={(value) =>
										onFiltersChange({ ...filters, feeStatus: value === "all" ? "" : value })
									}
								>
									<SelectTrigger className="h-9 bg-white">
										<SelectValue placeholder="Todos" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Todos</SelectItem>
										<SelectItem value="EARRINGS">
											{statusData.EARRINGS}
										</SelectItem>
										<SelectItem value="REQUESTED">
											{statusData.REQUESTED}
										</SelectItem>
										<SelectItem value="CHARGED">
											{statusData.CHARGED}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
									Estado PCL
								</label>
								<Select
									value={filters.pclStatus || "all"}
									onValueChange={(value) =>
										onFiltersChange({ ...filters, pclStatus: value === "all" ? "" : value })
									}
								>
									<SelectTrigger className="h-9 bg-white">
										<SelectValue placeholder="Todos" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Todos</SelectItem>
										<SelectItem value="EARRINGS">
											{statusData.EARRINGS}
										</SelectItem>
										<SelectItem value="REQUESTED">
											{statusData.REQUESTED}
										</SelectItem>
										<SelectItem value="CHARGED">
											{statusData.CHARGED}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
