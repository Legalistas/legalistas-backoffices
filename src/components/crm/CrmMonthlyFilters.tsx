"use client"

import React, { useCallback, useMemo } from "react"
import { Calendar, ChevronDown, Filter } from "lucide-react"

interface CrmMonthlyFiltersProps {
    monthFilter: string
    setMonthFilter: (month: string) => void
    yearFilter: string
    setYearFilter: (year: string) => void
    onFiltersChange?: (filters: { month: string; year: string }) => void
    className?: string
}

export const CrmMonthlyFilters: React.FC<CrmMonthlyFiltersProps> = ({
    monthFilter,
    setMonthFilter,
    yearFilter,
    setYearFilter,
    onFiltersChange,
    className = ""
}) => {
    const years = useMemo(() => {
        const currentYearNum = new Date().getFullYear()
        return Array.from({ length: 5 }, (_, i) => String(currentYearNum - 2 + i)) // Año actual +/- 2 años
    }, [])

    const months = useMemo(
        () => [
            { value: "01", label: "Enero" },
            { value: "02", label: "Febrero" },
            { value: "03", label: "Marzo" },
            { value: "04", label: "Abril" },
            { value: "05", label: "Mayo" },
            { value: "06", label: "Junio" },
            { value: "07", label: "Julio" },
            { value: "08", label: "Agosto" },
            { value: "09", label: "Septiembre" },
            { value: "10", label: "Octubre" },
            { value: "11", label: "Noviembre" },
            { value: "12", label: "Diciembre" },
        ],
        []
    )

    const handleMonthChange = useCallback(
        (month: string) => {
            setMonthFilter(month)
            onFiltersChange?.({ month, year: yearFilter })
        },
        [setMonthFilter, onFiltersChange, yearFilter]
    )

    const handleYearChange = useCallback(
        (year: string) => {
            setYearFilter(year)
            onFiltersChange?.({ month: monthFilter, year })
        },
        [setYearFilter, onFiltersChange, monthFilter]
    )

    const getSelectedMonthLabel = useCallback(() => {
        const selectedMonth = months.find(month => month.value === monthFilter)
        return selectedMonth ? selectedMonth.label : "Seleccionar mes"
    }, [monthFilter, months])

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Filtro Mensual:</span>
            </div>

            {/* Filtro de Mes */}
            <div className="relative">
                <select
                    value={monthFilter}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="appearance-none w-[140px] rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-gray-300 transition-colors"
                >
                    {months.map((month) => (
                        <option key={month.value} value={month.value}>
                            {month.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Filtro de Año */}
            <div className="relative">
                <select
                    value={yearFilter}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="appearance-none w-[100px] rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 hover:border-gray-300 transition-colors"
                >
                    {years.map((year) => (
                        <option key={year} value={year}>
                            {year}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Indicador de filtro activo */}
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
                <Filter className="h-3 w-3" />
                <span>{getSelectedMonthLabel()} {yearFilter}</span>
            </div>
        </div>
    )
}

export default CrmMonthlyFilters