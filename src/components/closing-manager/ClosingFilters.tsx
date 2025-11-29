"use client"

import { useState } from "react"
import { Search, Filter, X, Columns, ChevronDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"
import Button from "@/components/ui/button/Button"
import { closingType, statusCapital, statusData } from "@/constant/closing-manager"
import Checkbox from "@/components/ui/input/Checkbox"

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
}

const allColumns = [
  { id: "date", label: "Fecha Cierre" },
  { id: "case", label: "Causas" },
  { id: "lawyer", label: "Representante" },
  { id: "type", label: "Tipo de Cierre" },
  { id: "capitalAmount", label: "Monto Capital" },
  { id: "capitalState", label: "Estado Capital" },
  { id: "hpAgreed", label: "HP Convenido %" },
  { id: "hpTotal", label: "Monto HP Convenido Total" },
  { id: "aportes", label: "Aportes" },
  { id: "sepblac", label: "25% Sepblac" },
  { id: "hpLegalistas", label: "Monto HP Total Legalistas" },
  { id: "feeStatus", label: "Estado Honorarios $" },
  { id: "pclAgreed", label: "PCL Convenidos" },
  { id: "pclAmount", label: "Monto Pacto Cuota Litis $" },
  { id: "pcl25", label: "25% PCL" },
  { id: "pclTotal", label: "Monto Total Cuota Litis" },
  { id: "pclStatus", label: "Estado Pacto Cuota Litis $" },
  { id: "litigation", label: "Detalle" },
  { id: "intimation", label: "Expidió Intimación" },
]

export default function ClosingFilters({ filters, onFiltersChange, visibleColumns, onColumnsChange }: ClosingFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)
  const [showColumnsMenu, setShowColumnsMenu] = useState(false)

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onFiltersChange({ ...filters, search: localSearch })
    }
  }

  const handleSearchClick = () => {
    onFiltersChange({ ...filters, search: localSearch })
  }

  const clearFilters = () => {
    setLocalSearch("")
    onFiltersChange({
      search: "",
      type: "",
      capitalState: "",
      feeStatus: "",
      pclStatus: "",
    })
  }

  const hasActiveFilters = filters.search || filters.type || filters.capitalState || filters.feeStatus || filters.pclStatus

  const toggleColumn = (columnId: string) => {
    if (visibleColumns.includes(columnId)) {
      onColumnsChange(visibleColumns.filter(id => id !== columnId))
    } else {
      onColumnsChange([...visibleColumns, columnId])
    }
  }

  const toggleAllColumns = () => {
    if (visibleColumns.length === allColumns.length) {
      onColumnsChange([])
    } else {
      onColumnsChange(allColumns.map(col => col.id))
    }
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Búsqueda y Selectores de columnas */}
      <div className="flex gap-4 items-center">
        {/* Búsqueda */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por causa, representante..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-10 pl-10 pr-3 rounded-md border border-gray-300 bg-white dark:bg-gray-950 dark:border-gray-700 text-sm focus:border-[#09A4B5] focus:ring-1 focus:ring-[#09A4B5] outline-none"
            />
          </div>
        </div>

        {/* Selector de Columnas */}
        <div className="relative">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setShowColumnsMenu(!showColumnsMenu)}
          >
            <Columns className="h-4 w-4" />
            Columnas ({visibleColumns.length})
            <ChevronDown className="h-4 w-4" />
          </Button>
          
          {showColumnsMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowColumnsMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-lg z-50 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Columnas Visibles</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleAllColumns}
                      className="text-xs"
                    >
                      {visibleColumns.length === allColumns.length ? "Ocultar todas" : "Mostrar todas"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {allColumns.map((column) => (
                      <div key={column.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={column.id}
                          checked={visibleColumns.includes(column.id)}
                          onChange={() => toggleColumn(column.id)}
                          label={column.label}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Filtros avanzados */}
      <div className="grid grid-cols-4 gap-4">
        {/* Tipo de Cierre */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Tipo de Cierre</label>
          <Select value={filters.type} onValueChange={(value) => onFiltersChange({ ...filters, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="SRT">{closingType.SRT}</SelectItem>
              <SelectItem value="JUDICIAL">{closingType.JUDICIAL}</SelectItem>
              <SelectItem value="EXTRAJUDICIAL">{closingType.EXTRAJUDICIAL}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado Capital */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Estado Capital</label>
          <Select value={filters.capitalState} onValueChange={(value) => onFiltersChange({ ...filters, capitalState: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
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

        {/* Estado Honorarios */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Estado Honorarios</label>
          <Select value={filters.feeStatus} onValueChange={(value) => onFiltersChange({ ...filters, feeStatus: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="EARRINGS">{statusData.EARRINGS}</SelectItem>
              <SelectItem value="REQUESTED">{statusData.REQUESTED}</SelectItem>
              <SelectItem value="CHARGED">{statusData.CHARGED}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Estado PCL */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Estado PCL</label>
          <Select value={filters.pclStatus} onValueChange={(value) => onFiltersChange({ ...filters, pclStatus: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
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
  )
}
