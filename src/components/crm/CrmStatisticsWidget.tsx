"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { 
  ArrowDown, 
  ArrowUp, 
  CircleDollarSign, 
  Target, 
  TrendingUp, 
  Users,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Eye
} from "lucide-react"
import { STATISTICS_CRM_DASHBOARD_ENDPOINT } from "@/constant/api-endpoints"

interface StatsCard {
  oportunidadesCreadas: number
  oportunidadesGanadas: number
  oportunidadesPerdidas: number
  tasaConversion: number
  tendenciaCreadas: number
  tendenciaGanadas: number
  tendenciaPerdidas: number
  tendenciaConversion: number
}

interface CrmStatisticsWidgetProps {
  monthFilter: string
  yearFilter: string
  className?: string
  defaultCollapsed?: boolean
}

export const CrmStatisticsWidget: React.FC<CrmStatisticsWidgetProps> = ({
  monthFilter,
  yearFilter,
  className = "",
  defaultCollapsed = false
}) => {
  const { data: session } = useSession()
  const [data, setData] = useState<StatsCard>({
    oportunidadesCreadas: 0,
    oportunidadesGanadas: 0,
    oportunidadesPerdidas: 0,
    tasaConversion: 0,
    tendenciaCreadas: 0,
    tendenciaGanadas: 0,
    tendenciaPerdidas: 0,
    tendenciaConversion: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  useEffect(() => {
    async function fetchStatistics() {
      if (!session?.user?.id || !session?.user?.accessToken) return

      setIsLoading(true)
      try {
        const res = await fetch(
          `${STATISTICS_CRM_DASHBOARD_ENDPOINT}/${session?.user?.id}?year=${yearFilter}&month=${monthFilter}`,
          {
            headers: {
              Authorization: `Bearer ${session?.user?.accessToken}`,
            },
          },
        )

        if (!res.ok) {
          console.error("Error fetching statistics")
          return
        }

        const stats = await res.json()
        setData(stats.statsCard || {
          oportunidadesCreadas: 0,
          oportunidadesGanadas: 0,
          oportunidadesPerdidas: 0,
          tasaConversion: 0,
          tendenciaCreadas: 0,
          tendenciaGanadas: 0,
          tendenciaPerdidas: 0,
          tendenciaConversion: 0,
        })
      } catch (error) {
        console.error("Error fetching statistics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStatistics()
  }, [session, monthFilter, yearFilter])

  const getMonthLabel = (month: string) => {
    const months: Record<string, string> = {
      "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
      "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
      "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
    }
    return months[month] || month
  }

  if (isLoading && !isCollapsed) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Estadísticas de Ventas</h3>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{getMonthLabel(monthFilter)} {yearFilter}</span>
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
          >
            <EyeOff className="h-4 w-4" />
            <span>Ocultar</span>
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Estadísticas de Ventas</h3>
          {!isCollapsed && (
            <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
              <Calendar className="h-4 w-4" />
              <span>{getMonthLabel(monthFilter)} {yearFilter}</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
        >
          {isCollapsed ? (
            <>
              <Eye className="h-4 w-4" />
              <span>Mostrar</span>
              <ChevronDown className="h-3 w-3" />
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Ocultar</span>
              <ChevronUp className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Oportunidades Creadas"
            value={data.oportunidadesCreadas}
            trend={data.tendenciaCreadas}
            icon={<Target className="h-4 w-4 text-gray-500" />}
            color="blue"
          />
          <StatCard
            title="Oportunidades Ganadas"
            value={data.oportunidadesGanadas}
            trend={data.tendenciaGanadas}
            icon={<CircleDollarSign className="h-4 w-4 text-gray-500" />}
            color="green"
          />
          <StatCard
            title="Oportunidades Perdidas"
            value={data.oportunidadesPerdidas}
            trend={data.tendenciaPerdidas}
            icon={<Users className="h-4 w-4 text-gray-500" />}
            color="red"
          />
          <StatCard
            title="Tasa de Conversión"
            value={`${data.tasaConversion}%`}
            trend={data.tendenciaConversion}
            icon={<TrendingUp className="h-4 w-4 text-gray-500" />}
            color="purple"
          />
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number | string
  trend: number
  icon: React.ReactNode
  color: "blue" | "green" | "red" | "purple"
}

function StatCard({ title, value, trend, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "text-blue-500"
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200", 
      text: "text-green-700",
      icon: "text-green-500"
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700", 
      icon: "text-red-500"
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      text: "text-purple-700",
      icon: "text-purple-500"
    }
  }

  const colors = colorClasses[color]

  return (
    <div className={`p-4 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-md bg-white ${colors.icon}`}>
          {icon}
        </div>
        <div className={`text-xs font-medium ${colors.text}`}>
          {trend >= 0 ? (
            <div className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <span>+{trend}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <ArrowDown className="h-3 w-3" />
              <span>{trend}%</span>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-xs text-gray-500">vs. período anterior</p>
      </div>
    </div>
  )
}

export default CrmStatisticsWidget