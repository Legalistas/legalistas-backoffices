"use client"

import { useState } from "react"
import CalendarView from "@/components/calendar/CalendarView"
import "./calendar.module.css"
import Button from "@/components/ui/button/Button"
import { Dropdown } from "@/components/ui/dropdown/Dropdown"
import { DropdownItem } from "@/components/ui/dropdown/DropdownItem"
import { EllipsisVertical, Plus, Download, Filter, Trash, Calendar, Info } from 'lucide-react'

export default function CalendarPage() {
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [debugInfo, setDebugInfo] = useState<string | null>(null)

    // Función para manejar la creación de un nuevo evento
    const handleNewEvent = () => {
        // Esta función se pasará a CalendarView
        console.log("Crear nuevo evento desde el botón principal")
    }

    // Función para exportar el calendario
    const handleExport = () => {
        console.log("Exportar calendario")
        // Implementar la lógica de exportación
    }

    // Función para filtrar eventos
    const handleFilter = () => {
        console.log("Filtrar eventos")
        // Implementar la lógica de filtrado
    }

    // Función para limpiar eventos
    const handleClear = () => {
        console.log("Limpiar eventos")
        // Implementar la lógica para limpiar eventos
    }

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
    }

    const formattedHolidays = formatDebugInfo(debugInfo);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Calendario</h2>

                <div className="flex items-center gap-2">
                    {/* Botón Nuevo Evento */}
                    <Button variant="primary" size="sm" className="flex items-center gap-1" onClick={handleNewEvent}>
                        <Plus className="h-4 w-4" />
                        Nuevo Evento
                    </Button>

                    {/* Dropdown de opciones */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            size="sm"
                            className="p-0 flex items-center justify-center"
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                            <EllipsisVertical className="h-4 w-4" />
                            <span className="sr-only">Opciones</span>
                        </Button>
                        <Dropdown isOpen={dropdownOpen} onClose={() => setDropdownOpen(false)} className="w-72">
                            {/* Opciones principales */}
                            <div className="p-2">
                                <DropdownItem onClick={handleExport} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md">
                                    <Download className="h-4 w-4 text-gray-600" />
                                    <span>Exportar Calendario</span>
                                </DropdownItem>
                                <DropdownItem onClick={handleFilter} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md">
                                    <Filter className="h-4 w-4 text-gray-600" />
                                    <span>Filtrar Eventos</span>
                                </DropdownItem>
                                <DropdownItem onClick={handleClear} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-md">
                                    <Trash className="h-4 w-4 text-red-500" />
                                    <span className="text-red-500">Limpiar Eventos</span>
                                </DropdownItem>
                            </div>

                            {/* Información de días festivos */}
                            {formattedHolidays && formattedHolidays.length > 0 && (
                                <div className="border-t border-gray-200 mt-1">
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calendar className="h-4 w-4 text-green-600" />
                                            <h3 className="text-sm font-medium text-green-700">Días festivos</h3>
                                        </div>
                                        <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                            {formattedHolidays.map((holiday, index) => {
                                                // Separar el nombre del día festivo de la fecha
                                                const parts = holiday.split(": ");
                                                const name = parts[0];
                                                const date = parts.length > 1 ? parts[1] : "";

                                                return (
                                                    <li key={index} className="flex items-start gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                                                        <div>
                                                            <span className="text-xs font-medium text-gray-800">{name}</span>
                                                            {date && (
                                                                <span className="text-xs text-gray-500 block">
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
                <CalendarView onNewEvent={handleNewEvent} onDebugInfoChange={setDebugInfo} />
            </div>
        </div>
    )
}
