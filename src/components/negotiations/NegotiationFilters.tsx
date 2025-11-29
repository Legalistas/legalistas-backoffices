"use client"

import { useState } from "react"
import { Search, Filter, X, ChevronDown } from "lucide-react"
import Button from "@/components/ui/button/Button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select/SelectComposed"

interface FilterState {
  searchTerm: string
  abogadoInterno: string
  abogadoContraparte: string
  lesion: string
  estado: string
  rangoMonto: {
    min: string
    max: string
  }
}

interface NegotiationFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  onClearFilters: () => void
  totalResults: number
  filteredResults: number
  uniqueValues: {
    abogadosInternos: string[]
    abogadosContraparte: string[]
    lesiones: string[]
  }
}

export function NegotiationFilters({ 
  onFiltersChange, 
  onClearFilters, 
  totalResults, 
  filteredResults,
  uniqueValues 
}: NegotiationFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    abogadoInterno: "",
    abogadoContraparte: "", 
    lesion: "",
    estado: "",
    rangoMonto: {
      min: "",
      max: ""
    }
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleRangeChange = (type: 'min' | 'max', value: string) => {
    const newRange = { ...filters.rangoMonto, [type]: value }
    const newFilters = { ...filters, rangoMonto: newRange }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleClearFilters = () => {
    const defaultFilters: FilterState = {
      searchTerm: "",
      abogadoInterno: "",
      abogadoContraparte: "",
      lesion: "",
      estado: "",
      rangoMonto: {
        min: "",
        max: ""
      }
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
    onClearFilters()
  }

  const hasActiveFilters = Object.values(filters).some(value => {
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== "")
    }
    return value !== ""
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Buscador principal */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por causa, expediente, abogado o lesión..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="whitespace-nowrap"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avanzados
            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="whitespace-nowrap text-error-600 hover:text-error-700 hover:bg-error-50"
            >
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Filtros avanzados */}
      {showAdvancedFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          {/* Abogado Interno */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abogado Interno
            </label>
            <Select value={filters.abogadoInterno} onValueChange={(value) => handleFilterChange('abogadoInterno', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {uniqueValues.abogadosInternos.map((abogado) => (
                  <SelectItem key={abogado} value={abogado}>
                    {abogado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Abogado Contraparte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Abogado Contraparte
            </label>
            <Select value={filters.abogadoContraparte} onValueChange={(value) => handleFilterChange('abogadoContraparte', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {uniqueValues.abogadosContraparte.map((abogado) => (
                  <SelectItem key={abogado} value={abogado}>
                    {abogado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lesión */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Lesión
            </label>
            <Select value={filters.lesion} onValueChange={(value) => handleFilterChange('lesion', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {uniqueValues.lesiones.map((lesion) => (
                  <SelectItem key={lesion} value={lesion}>
                    {lesion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rango de Monto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rango de Monto
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.rangoMonto.min}
                onChange={(e) => handleRangeChange('min', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.rangoMonto.max}
                onChange={(e) => handleRangeChange('max', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-[#09A4B5] focus:outline-none focus:ring-1 focus:ring-[#09A4B5]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contador de resultados */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
        <span>
          Mostrando {filteredResults} de {totalResults} negociaciones
        </span>
        {hasActiveFilters && (
          <span className="text-[#09A4B5] font-medium">
            Filtros activos aplicados
          </span>
        )}
      </div>
    </div>
  )
}