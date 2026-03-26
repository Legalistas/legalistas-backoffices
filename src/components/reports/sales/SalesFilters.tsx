"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Check, ChevronsUpDown, Filter, RotateCcw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
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
import {
	LAWYERS_ENDPOINT,
	SELLERS_ENDPOINT,
	SETTINGS_COUNTRIES_ENDPOINT,
} from "@/constant/api-endpoints";
import { SOURCE_CHANNEL, SERVICES_TYPE } from "@/constant/crm";
import type { FilterOption, SalesFiltersState } from "./types";

interface SalesFiltersProps {
	filters: SalesFiltersState;
	onChange: (filters: SalesFiltersState) => void;
}

function getDefaultRange(): { startDate: string; endDate: string } {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), 1);
	const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	return {
		startDate: start.toISOString().slice(0, 10),
		endDate: end.toISOString().slice(0, 10),
	};
}

export function getInitialFilters(): SalesFiltersState {
	const { startDate, endDate } = getDefaultRange();
	return {
		startDate,
		endDate,
		sellerId: "",
		internalLawyerId: "",
		responsibleLawyerId: "",
		sourceChannelId: "",
		servicesId: "",
		stateId: "",
		city: "",
	};
}

const INTERNAL_LAWYER_ROLES = ["abogado_interno", "coordinador_legal"];
const REPRESENTATIVE_ROLES = ["director_general_ceo", "abogado_representante"];

function getUserRoles(user: any): string[] {
	return (user.roleUser || []).map((ru: any) => ru.role?.name).filter(Boolean);
}

export function SalesFilters({ filters, onChange }: SalesFiltersProps) {
	const { data: session } = useSession();
	const [sellers, setSellers] = useState<FilterOption[]>([]);
	const [internalLawyers, setInternalLawyers] = useState<FilterOption[]>([]);
	const [representatives, setRepresentatives] = useState<FilterOption[]>([]);
	const [states, setStates] = useState<FilterOption[]>([]);

	useEffect(() => {
		if (!session?.user?.accessToken) return;
		const headers = { Authorization: `Bearer ${session.user.accessToken}` };

		Promise.all([
			fetch(`${SELLERS_ENDPOINT}?limit=999`, { headers }).then((r) =>
				r.json(),
			),
			fetch(`${LAWYERS_ENDPOINT}?limit=999`, { headers }).then((r) =>
				r.json(),
			),
			fetch(`${SETTINGS_COUNTRIES_ENDPOINT}/1/states?limit=999`, {
				headers,
			}).then((r) => r.json()),
		]).then(([sellersRes, lawyersRes, statesRes]) => {
			const mapUsers = (res: any) => {
				const arr = res?.data ?? res;
				return Array.isArray(arr)
					? arr.map((u: any) => ({ id: u.id, name: u.name }))
					: [];
			};
			setSellers(mapUsers(sellersRes));

			// Split lawyers by role
			const allLawyers = (lawyersRes?.data ?? lawyersRes) || [];
			setInternalLawyers(
				allLawyers
					.filter((u: any) =>
						getUserRoles(u).some((r: string) =>
							INTERNAL_LAWYER_ROLES.includes(r),
						),
					)
					.map((u: any) => ({ id: u.id, name: u.name })),
			);
			setRepresentatives(
				allLawyers
					.filter((u: any) =>
						getUserRoles(u).some((r: string) =>
							REPRESENTATIVE_ROLES.includes(r),
						),
					)
					.map((u: any) => ({ id: u.id, name: u.name })),
			);

			setStates(mapUsers(statesRes));
		});
	}, [session?.user?.accessToken]);

	// Date range state derived from filters
	const dateRange = useMemo<DateRange | undefined>(() => {
		if (!filters.startDate || !filters.endDate) return undefined;
		return {
			from: new Date(filters.startDate + "T00:00:00"),
			to: new Date(filters.endDate + "T00:00:00"),
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

	const handleChange = useCallback(
		(key: keyof SalesFiltersState, value: string) => {
			onChange({ ...filters, [key]: value });
		},
		[filters, onChange],
	);

	const handleReset = useCallback(() => {
		onChange(getInitialFilters());
	}, [onChange]);

	const hasActiveFilters =
		filters.sellerId ||
		filters.internalLawyerId ||
		filters.responsibleLawyerId ||
		filters.sourceChannelId ||
		filters.servicesId ||
		filters.stateId ||
		filters.city;

	const dateLabel = useMemo(() => {
		if (!filters.startDate) return "Seleccionar período";
		const from = new Date(filters.startDate + "T00:00:00");
		const to = filters.endDate
			? new Date(filters.endDate + "T00:00:00")
			: from;
		if (filters.startDate === filters.endDate) {
			return format(from, "dd MMM yyyy", { locale: es });
		}
		return `${format(from, "dd MMM", { locale: es })} - ${format(to, "dd MMM yyyy", { locale: es })}`;
	}, [filters.startDate, filters.endDate]);

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

			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
				{/* Vendedor */}
				<Select
					value={filters.sellerId}
					onValueChange={(v) =>
						handleChange("sellerId", v === "all" ? "" : v)
					}
				>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue placeholder="Vendedor" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los vendedores</SelectItem>
						{sellers.map((s) => (
							<SelectItem key={s.id} value={String(s.id)}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Abogado Interno */}
				<Select
					value={filters.internalLawyerId}
					onValueChange={(v) =>
						handleChange("internalLawyerId", v === "all" ? "" : v)
					}
				>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue placeholder="Abogado interno" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los abogados int.</SelectItem>
						{internalLawyers.map((l) => (
							<SelectItem key={l.id} value={String(l.id)}>
								{l.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Representante (con buscador) */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className="h-9 w-full justify-between px-3 text-xs font-normal"
						>
							<span className="truncate">
								{filters.responsibleLawyerId
									? representatives.find(
											(l) =>
												String(l.id) === filters.responsibleLawyerId,
										)?.name ?? "Representante"
									: "Representante"}
							</span>
							<ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-55 p-0" align="start">
						<Command>
							<CommandInput placeholder="Buscar representante..." className="h-8 text-xs" />
							<CommandList>
								<CommandEmpty>No encontrado</CommandEmpty>
								<CommandGroup>
									<CommandItem
										value="all"
										onSelect={() =>
											handleChange("responsibleLawyerId", "")
										}
									>
										<Check
											className={`mr-2 h-3 w-3 ${!filters.responsibleLawyerId ? "opacity-100" : "opacity-0"}`}
										/>
										Todos los representantes
									</CommandItem>
									{representatives.map((l) => (
										<CommandItem
											key={l.id}
											value={l.name}
											onSelect={() =>
												handleChange(
													"responsibleLawyerId",
													String(l.id),
												)
											}
										>
											<Check
												className={`mr-2 h-3 w-3 ${filters.responsibleLawyerId === String(l.id) ? "opacity-100" : "opacity-0"}`}
											/>
											{l.name}
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>

				{/* Canal de Ingreso */}
				<Select
					value={filters.sourceChannelId}
					onValueChange={(v) =>
						handleChange("sourceChannelId", v === "all" ? "" : v)
					}
				>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue placeholder="Canal de ingreso" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los canales</SelectItem>
						{SOURCE_CHANNEL.map((ch) => (
							<SelectItem key={ch.id} value={String(ch.id)}>
								{ch.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Tipo de Servicio */}
				<Select
					value={filters.servicesId}
					onValueChange={(v) =>
						handleChange("servicesId", v === "all" ? "" : v)
					}
				>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue placeholder="Tipo de servicio" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos los servicios</SelectItem>
						{SERVICES_TYPE.map((s) => (
							<SelectItem key={s.id} value={String(s.value)}>
								{s.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Provincia */}
				<Select
					value={filters.stateId}
					onValueChange={(v) =>
						handleChange("stateId", v === "all" ? "" : v)
					}
				>
					<SelectTrigger className="h-9 text-xs">
						<SelectValue placeholder="Provincia" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todas las provincias</SelectItem>
						{states.map((s) => (
							<SelectItem key={s.id} value={String(s.id)}>
								{s.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Ciudad */}
				<div>
					<input
						type="text"
						placeholder="Ciudad..."
						value={filters.city}
						onChange={(e) => handleChange("city", e.target.value)}
						className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
				</div>
			</div>
		</div>
	);
}
