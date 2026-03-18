"use client"

import { useState } from "react"
import { Search, X, Columns, ChevronDown, CalendarDays, SlidersHorizontal } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"
import Button from "@/components/ui/button/Button"
import { closingType, statusCapital, statusData, monthOptions } from "@/constant/closing-manager"
import Checkbox from "@/components/ui/input/Checkbox"
import { ALL_CLOSING_COLUMNS } from "@/components/closing-manager/closing-manager-table"

export interface ClosingFiltersState {
  search: string
  type: string
  capitalState: string
  feeStatus: string
  pclStatus: string
}

interface ClosingFiltersProps {
  filters: ClosingFiltersState
  onFiltersChange: (filters: ClosingFiltersState) => void
  visibleColumns: string[]
  onColumnsChange: (columns: string[]) => void
  month: number
  year: number
  viewAll: boolean
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  onToggleViewAll: () => void
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
  detail: "Detalle",
}

const ALWAYS_VISIBLE = ["montoTransferir"]
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

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
  const [localSearch, setLocalSearch] = useState(filters.search)
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onFiltersChange({ ...filters, search: localSearch })
    }
  }

  const clearFilters = () => {
    setLocalSearch("")
    onFiltersChange({ search: "", type: "", capitalState: "", feeStatus: "", pclStatus: "" })
  }

  const hasActiveFilters = filters.search || filters.type || filters.capitalState || filters.feeStatus || filters.pclStatus
  const activeFilterCount = [filters.type, filters.capitalState, filters.feeStatus, filters.pclStatus].filter(Boolean).length

  const toggleColumn = (columnId: string) => {
    if (ALWAYS_VISIBLE.includes(columnId)) return
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId))
    } else {
      onColumnsChange([...visibleColumns, columnId])
    }
  }

  const toggleAllColumns = () => {
    if (visibleColumns.length === ALL_CLOSING_COLUMNS.length) {
      onColumnsChange(ALWAYS_VISIBLE)
    } else {
      onColumnsChange([...ALL_CLOSING_COLUMNS])
    }
  }

  const currentMonthLabel = monthOptions.find(m => m.value === month)?.label || ""

  return (
    <div className="space-y-3">
      {/* Card principal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Barra superior: período + búsqueda + acciones */}
        <div className="flex items-center gap-3 p-3">
          {/* Período — pill style */}
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg border border-gray-200 p-1">
            <div className="flex items-center gap-1.5 pl-2">
              <CalendarDays className="h-4 w-4 text-gray-400" />
            </div>
            <Select
              value={String(month)}
              onValueChange={(v) => onMonthChange(Number(v))}
              disabled={viewAll}
            >
              <SelectTrigger className="border-0 bg-transparent shadow-none h-8 min-w-[110px] text-sm font-medium focus:ring-0">
                <SelectValue>{viewAll ? "Todos los meses" : currentMonthLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="h-5 w-px bg-gray-300" />

            <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
              <SelectTrigger className="border-0 bg-transparent shadow-none h-8 w-[72px] text-sm font-medium focus:ring-0">
                <SelectValue>{year}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              onClick={onToggleViewAll}
              className={`
                h-8 px-3 rounded-md text-xs font-medium transition-all whitespace-nowrap
                ${viewAll
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
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
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm placeholder:text-gray-400 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors"
            />
          </div>

          {/* Filtros avanzados toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`
              flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all
              ${showAdvanced || hasActiveFilters
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-brand-500 text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Columnas */}
          <div className="relative">
            <button
              onClick={() => setShowColumnsMenu(!showColumnsMenu)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Columnas</span>
              <span className="text-xs text-gray-400">({visibleColumns.length})</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showColumnsMenu ? "rotate-180" : ""}`} />
            </button>

            {showColumnsMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColumnsMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Columnas visibles</span>
                    <button onClick={toggleAllColumns} className="text-xs font-medium text-brand-600 hover:text-brand-700">
                      {visibleColumns.length === ALL_CLOSING_COLUMNS.length ? "Ocultar todas" : "Mostrar todas"}
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
                    {ALL_CLOSING_COLUMNS.map((colId) => (
                      <label
                        key={colId}
                        className={`
                          flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition-colors
                          ${ALWAYS_VISIBLE.includes(colId) ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}
                          ${visibleColumns.includes(colId) ? "text-gray-900" : "text-gray-400"}
                        `}
                      >
                        <Checkbox
                          id={colId}
                          checked={visibleColumns.includes(colId)}
                          onChange={() => toggleColumn(colId)}
                          label=""
                          disabled={ALWAYS_VISIBLE.includes(colId)}
                        />
                        <span className="truncate">{columnLabels[colId] || colId}</span>
                        {ALWAYS_VISIBLE.includes(colId) && (
                          <span className="ml-auto text-[10px] font-medium text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded">Fija</span>
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
            <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Cierre</label>
                <Select value={filters.type} onValueChange={(value) => onFiltersChange({ ...filters, type: value })}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="SRT">{closingType.SRT}</SelectItem>
                    <SelectItem value="JUDICIAL">{closingType.JUDICIAL}</SelectItem>
                    <SelectItem value="EXTRAJUDICIAL">{closingType.EXTRAJUDICIAL}</SelectItem>
                    <SelectItem value="DIRECTO">{closingType.DIRECTO}</SelectItem>
                    <SelectItem value="OTROS">{closingType.OTROS}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Capital</label>
                <Select value={filters.capitalState} onValueChange={(value) => onFiltersChange({ ...filters, capitalState: value })}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="AGREEMENT_IN_MANAGEMENT">{statusCapital.AGREEMENT_IN_MANAGEMENT}</SelectItem>
                    <SelectItem value="AGREEMENT_PRESENTED">{statusCapital.AGREEMENT_PRESENTED}</SelectItem>
                    <SelectItem value="AWAITING_DEADLINE">{statusCapital.AWAITING_DEADLINE}</SelectItem>
                    <SelectItem value="REQUESTED_OP">{statusCapital.REQUESTED_OP}</SelectItem>
                    <SelectItem value="TRANSFER_REQUESTED">{statusCapital.TRANSFER_REQUESTED}</SelectItem>
                    <SelectItem value="K_RECEIVED_BY_ACTOR">{statusCapital.K_RECEIVED_BY_ACTOR}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Honorarios</label>
                <Select value={filters.feeStatus} onValueChange={(value) => onFiltersChange({ ...filters, feeStatus: value })}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="EARRINGS">{statusData.EARRINGS}</SelectItem>
                    <SelectItem value="REQUESTED">{statusData.REQUESTED}</SelectItem>
                    <SelectItem value="CHARGED">{statusData.CHARGED}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado PCL</label>
                <Select value={filters.pclStatus} onValueChange={(value) => onFiltersChange({ ...filters, pclStatus: value })}>
                  <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="EARRINGS">{statusData.EARRINGS}</SelectItem>
                    <SelectItem value="REQUESTED">{statusData.REQUESTED}</SelectItem>
                    <SelectItem value="CHARGED">{statusData.CHARGED}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
