"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Settings, Eye, EyeOff, RotateCcw } from "lucide-react"
import Button from "@/components/ui/button/Button"

export interface ColumnConfig {
  id: string
  label: string
  visible: boolean
  required?: boolean
}

interface ColumnSelectorProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
  storageKey: string
}

export function ColumnSelector({ columns, onColumnsChange, storageKey }: ColumnSelectorProps) {
  const [showSelector, setShowSelector] = useState(false)
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns)
  const isInitialMount = useRef(true)

  // Cargar configuración desde localStorage solo al montar
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const savedColumns: ColumnConfig[] = JSON.parse(saved)
          
          // Mergear columnas guardadas con las actuales (en caso de que se hayan agregado nuevas columnas)
          const mergedColumns = columns.map(col => {
            const savedCol = savedColumns.find(s => s.id === col.id)
            return savedCol ? { ...col, visible: savedCol.visible } : col
          })
          
          setLocalColumns(mergedColumns)
          onColumnsChange(mergedColumns)
        }
      } catch (error) {
        console.error('Error loading column configuration:', error)
      }
    }
  }, []) // Solo se ejecuta una vez al montar

  // Guardar en localStorage cuando cambien las columnas
  const saveToStorage = (newColumns: ColumnConfig[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newColumns))
    } catch (error) {
      console.error('Error saving column configuration:', error)
    }
  }

  const handleToggleColumn = (columnId: string) => {
    const updatedColumns = localColumns.map(col => 
      col.id === columnId 
        ? { ...col, visible: !col.visible }
        : col
    )
    
    setLocalColumns(updatedColumns)
    onColumnsChange(updatedColumns)
    saveToStorage(updatedColumns)
  }

  const handleShowAll = () => {
    const updatedColumns = localColumns.map(col => ({ ...col, visible: true }))
    setLocalColumns(updatedColumns)
    onColumnsChange(updatedColumns)
    saveToStorage(updatedColumns)
  }

  const handleHideAll = () => {
    const updatedColumns = localColumns.map(col => 
      col.required ? col : { ...col, visible: false }
    )
    setLocalColumns(updatedColumns)
    onColumnsChange(updatedColumns)
    saveToStorage(updatedColumns)
  }

  const handleReset = () => {
    const defaultColumns = columns.map(col => ({ ...col, visible: true }))
    setLocalColumns(defaultColumns)
    onColumnsChange(defaultColumns)
    saveToStorage(defaultColumns)
  }

  const visibleCount = localColumns.filter(col => col.visible).length
  const totalCount = localColumns.length

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSelector(!showSelector)}
        className={`flex items-center gap-2 ${visibleCount < totalCount ? 'text-[#09A4B5] border-[#09A4B5]' : ''}`}
      >
        <Settings className="w-4 h-4" />
        Columnas ({visibleCount}/{totalCount})
        {visibleCount < totalCount && (
          <span className="ml-1 px-1.5 py-0.5 bg-[#09A4B5] text-white text-xs rounded-full">
            {totalCount - visibleCount}
          </span>
        )}
      </Button>

      {showSelector && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Configurar Columnas</h3>
            <button
              onClick={() => setShowSelector(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 p-3 border-b border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowAll}
              className="text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              Mostrar Todas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHideAll}
              className="text-xs"
            >
              <EyeOff className="w-3 h-3 mr-1" />
              Ocultar Todas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Resetear
            </Button>
          </div>

          {/* Lista de columnas */}
          <div className="max-h-64 overflow-y-auto">
            {localColumns.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`column-${column.id}`}
                    checked={column.visible}
                    onChange={() => handleToggleColumn(column.id)}
                    disabled={column.required}
                    className="w-4 h-4 text-[#09A4B5] border-gray-300 rounded focus:ring-[#09A4B5] focus:ring-2 disabled:opacity-50"
                  />
                  <label
                    htmlFor={`column-${column.id}`}
                    className={`text-sm ${column.required ? 'text-gray-500' : 'text-gray-700'} ${column.visible ? 'font-medium' : ''}`}
                  >
                    {column.label}
                    {column.required && (
                      <span className="ml-1 text-xs text-gray-400">(requerida)</span>
                    )}
                  </label>
                </div>
                
                {column.visible ? (
                  <Eye className="w-4 h-4 text-[#09A4B5]" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>

          {/* Footer con información */}
          <div className="p-3 border-t border-gray-100 text-xs text-gray-500">
            {visibleCount} de {totalCount} columnas visibles
          </div>
        </div>
      )}

      {/* Overlay para cerrar al hacer click fuera */}
      {showSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSelector(false)}
        />
      )}
    </div>
  )
}