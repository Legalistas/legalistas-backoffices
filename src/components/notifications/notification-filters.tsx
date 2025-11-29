"use client"

import Input from "@/components/ui/input/Input"
import { Search, SortAsc, SortDesc, Filter } from "lucide-react"

interface NotificationFiltersProps {
  filterType: string
  setFilterType: (value: string) => void
  sortType: string
  setSortType: (value: string) => void
  notificationType: string
  setNotificationType: (value: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
}

export default function NotificationFilters({
  filterType,
  setFilterType,
  sortType,
  setSortType,
  notificationType,
  setNotificationType,
  searchQuery,
  setSearchQuery,
}: NotificationFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar notificaciones..."
          defaultValue={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="w-full sm:w-auto">
        <select
            value={notificationType}
            onChange={(e) => setNotificationType(e.target.value)}
            className="w-full sm:w-[180px] border rounded px-3 py-2.5 text-sm"
        >
            <option value="all">Todos los tipos</option>
            <option value="crm">CRM</option>
            <option value="causes">Casos</option>
            <option value="cause_files">Expedientes</option>
            <option value="events">Eventos</option>
            <option value="system">Sistema</option>
        </select>
        </div>
        <div className="w-full sm:w-auto">
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value)}
            className="w-full sm:w-[180px] border rounded px-3 py-2 text-sm flex items-center"
          >
            <option value="newest">
              Más recientes
            </option>
            <option value="oldest">
              Más antiguas
            </option>
          </select>
        </div>
      </div>
    </div>
  )
}
