"use client";

import { useState } from "react";
import CalendarView from "@/components/calendar/CalendarView";
import "./calendar.module.css";
import {
	Calendar,
	Download,
	EllipsisVertical,
	Filter,
	Info,
	Plus,
	Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/shared/Dropdown";
import { DropdownItem } from "@/components/shared/DropdownItem";

export default function CalendarPage() {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [debugInfo, setDebugInfo] = useState<string | null>(null);
	const [newEventTrigger, setNewEventTrigger] = useState(0);

	// Incrementar el trigger abre el modal en CalendarView
	const handleNewEvent = () => {
		setNewEventTrigger((prev) => prev + 1);
	};

	// Función para exportar el calendario
	const handleExport = () => {
		console.log("Exportar calendario");
		// Implementar la lógica de exportación
	};

	// Función para filtrar eventos
	const handleFilter = () => {
		console.log("Filtrar eventos");
		// Implementar la lógica de filtrado
	};

	// Función para limpiar eventos
	const handleClear = () => {
		console.log("Limpiar eventos");
		// Implementar la lógica para limpiar eventos
	};

	// Función para formatear la información de depuración
	const formatDebugInfo = (info: string | null) => {
		if (!info) return null;

		// Si la información comienza con "Días festivos: ", extraemos solo la lista
		const holidaysList = info.startsWith("Días festivos: ")
			? info.substring("Días festivos: ".length)
			: info;

		// Dividimos la lista por comas
		const holidays = holidaysList.split(", ");

		return holidays;
	};

	const formattedHolidays = formatDebugInfo(debugInfo);

	// Filtrar solo los días festivos del año corriente
	const currentYear = new Date().getFullYear();
	const currentYearHolidays = formattedHolidays?.filter((holiday) => {
		const parts = holiday.split(": ");
		if (parts.length > 1) {
			const date = parts[1];
			// Intentar extraer el año de la fecha
			const yearMatch = date.match(/\d{4}/);
			if (yearMatch) {
				return parseInt(yearMatch[0]) === currentYear;
			}
		}
		return true; // Si no se puede determinar el año, incluirlo por defecto
	});

	return (
		<div className="flex flex-col h-full">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold">Calendario</h2>

				<div className="flex items-center gap-2">
					{/* Botón Nuevo Evento */}
					<Button
						variant="default"
						className="flex items-center gap-1"
						onClick={handleNewEvent}
					>
						<Plus className="h-4 w-4" />
						Nuevo Evento
					</Button>

					{/* Dropdown de opciones */}
					<div className="relative">
						<Button
							variant="outline"
							className="p-0 flex items-center justify-center"
							onClick={() => setDropdownOpen(!dropdownOpen)}
						>
							<EllipsisVertical className="h-4 w-4" />
							<span className="sr-only">Opciones</span>
						</Button>
						<Dropdown
							isOpen={dropdownOpen}
							onClose={() => setDropdownOpen(false)}
							className="w-72"
						>
							{/* Opciones principales */}
							<div className="p-2">
								<DropdownItem
									onClick={handleExport}
									className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md"
								>
									<Download className="h-4 w-4 text-muted-foreground" />
									<span>Exportar Calendario</span>
								</DropdownItem>
								<DropdownItem
									onClick={handleFilter}
									className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md"
								>
									<Filter className="h-4 w-4 text-muted-foreground" />
									<span>Filtrar Eventos</span>
								</DropdownItem>
								<DropdownItem
									onClick={handleClear}
									className="flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md"
								>
									<Trash className="h-4 w-4 text-red-500" />
									<span className="text-red-500">Limpiar Eventos</span>
								</DropdownItem>
							</div>

							{/* Información de días festivos */}
							{currentYearHolidays && currentYearHolidays.length > 0 && (
								<div className="border-t border-border mt-1">
									<div className="p-3">
										<div className="flex items-center gap-2 mb-2">
											<Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
											<h3 className="text-sm font-medium text-green-700 dark:text-green-400">
												Días festivos
											</h3>
										</div>
										<ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
											{currentYearHolidays.map((holiday, index) => {
												// Separar el nombre del día festivo de la fecha
												const parts = holiday.split(": ");
												const name = parts[0];
												const date = parts.length > 1 ? parts[1] : "";

												return (
													<li key={index} className="flex items-start gap-2">
														<div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0"></div>
														<div>
															<span className="text-xs font-medium">
																{name}
															</span>
															{date && (
																<span className="text-xs text-muted-foreground block">
																	{date}
																</span>
															)}
														</div>
													</li>
												);
											})}
										</ul>
									</div>
								</div>
							)}
						</Dropdown>
					</div>
				</div>
			</div>

			{/* Componente del calendario */}
			<div className="flex flex-row gap-3 mb-6 w-full">
				<CalendarView
					onNewEvent={handleNewEvent}
					triggerNewEvent={newEventTrigger}
					onDebugInfoChange={setDebugInfo}
				/>
			</div>
		</div>
	);
}
