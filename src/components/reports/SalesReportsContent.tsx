"use client"

import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import CrmMonthlyFilters from "@/components/crm/CrmMonthlyFilters"
import CrmStatisticsWidget from "@/components/crm/CrmStatisticsWidget"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { STATISTICS_CRM_ALL_ENDPOINT } from "@/constant/api-endpoints"
import {
    FileText,
    Download,
    Filter,
    Calendar,
    MapPin,
    TrendingUp,
    BarChart3
} from "lucide-react"

interface SalesReportsContentProps {
    className?: string
}

export const SalesReportsContent: React.FC<SalesReportsContentProps> = ({
    className = ""
}) => {
    const { data: session } = useSession()
    // Estados para filtros mensuales
    const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0"))
    const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
    
    // Estados para datos de ventas por localidad
    const [salesByLocationData, setSalesByLocationData] = useState<{ name: string; value: number }[]>([])
    const [isLoadingLocation, setIsLoadingLocation] = useState(false)

    // Efecto para cargar datos de ventas por localidad cuando cambian los filtros
    useEffect(() => {
        const fetchLocationData = async () => {
            if (!session?.user?.accessToken) return

            setIsLoadingLocation(true)
            try {
                const res = await fetch(`${STATISTICS_CRM_ALL_ENDPOINT}?year=${yearFilter}&month=${monthFilter}`, {
                    headers: {
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })

                if (!res.ok) {
                    console.error("Error fetching location statistics")
                    return
                }

                const response = await res.json()
                
                // Procesar datos de ventas por localidad
                const locationData = [...(response.salesByLocationData || [])]
                
                // Agregar CABA y RAFAELA si no están presentes
                const existingLocations = locationData.map((item: any) => item.name.toLowerCase())
                
                if (!existingLocations.includes('caba') && !existingLocations.includes('ciudad autónoma de buenos aires')) {
                    locationData.push({ name: 'CABA', value: 0 })
                }
                
                if (!existingLocations.includes('rafaela')) {
                    locationData.push({ name: 'Rafaela', value: 0 })
                }
                
                // Ordenar por valor y tomar top 5
                locationData.sort((a: any, b: any) => b.value - a.value)
                setSalesByLocationData(locationData.slice(0, 5))
                
            } catch (error) {
                console.error("Error fetching location statistics:", error)
            } finally {
                setIsLoadingLocation(false)
            }
        }

        fetchLocationData()
    }, [session?.user?.accessToken, monthFilter, yearFilter])

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        Reportes de Ventas
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Análisis detallado del rendimiento de ventas y estadísticas del CRM
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                        <Download className="h-4 w-4" />
                        Exportar Reporte
                    </button>
                </div>
            </div>

            {/* Filtros Mensuales */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros de Período
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CrmMonthlyFilters
                        monthFilter={monthFilter}
                        setMonthFilter={setMonthFilter}
                        yearFilter={yearFilter}
                        setYearFilter={setYearFilter}
                        onFiltersChange={(filters) => {
                            console.log("Filtros de reportes actualizados:", filters)
                        }}
                        className="flex-wrap"
                    />
                </CardContent>
            </Card>

      {/* Widget de Estadísticas */}
      <CrmStatisticsWidget
        monthFilter={monthFilter}
        yearFilter={yearFilter}
        defaultCollapsed={false}
      />

      {/* Tarjetas de Ventas por Localidad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ventas por Localidad
          </CardTitle>
          <p className="text-sm text-gray-600">
            Top ubicaciones para {getMonthLabel(monthFilter)} {yearFilter}
          </p>
        </CardHeader>
        <CardContent>
          {isLoadingLocation ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : salesByLocationData.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {salesByLocationData.map((location, index) => (
                <div 
                  key={location.name}
                  className={`p-4 rounded-lg border ${
                    index === 0 ? 'bg-green-50 border-green-200' :
                    index === 1 ? 'bg-blue-50 border-blue-200' :
                    index === 2 ? 'bg-purple-50 border-purple-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      index === 0 ? 'bg-green-100 text-green-700' :
                      index === 1 ? 'bg-blue-100 text-blue-700' :
                      index === 2 ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      #{index + 1}
                    </span>
                    <TrendingUp className={`h-4 w-4 ${
                      location.value > 0 ? 'text-green-500' : 'text-gray-400'
                    }`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{location.name}</h3>
                  <p className="text-lg font-bold text-gray-800">{location.value}</p>
                  <p className="text-xs text-gray-500">
                    {location.value === 1 ? 'venta' : 'ventas'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p>No hay datos de ventas por localidad</p>
                <p className="text-sm">para el período seleccionado</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>            {/* Sección de Reportes Adicionales */}
            <div className="hidden gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Resumen Mensual</CardTitle>
                        <p className="text-sm text-gray-600">
                            Estadísticas consolidadas para {getMonthLabel(monthFilter)} {yearFilter}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <span className="font-medium text-blue-900">Total de Oportunidades</span>
                                <span className="text-xl font-bold text-blue-600">-</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="font-medium text-green-900">Ventas Cerradas</span>
                                <span className="text-xl font-bold text-green-600">-</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                <span className="font-medium text-purple-900">Tasa de Éxito</span>
                                <span className="text-xl font-bold text-purple-600">-%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Tendencias del Período</CardTitle>
                        <p className="text-sm text-gray-600">
                            Comparación con período anterior
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium text-gray-700">Crecimiento en Leads</span>
                                <span className="text-sm font-semibold text-gray-600">Calculando...</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium text-gray-700">Mejora en Conversión</span>
                                <span className="text-sm font-semibold text-gray-600">Calculando...</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium text-gray-700">Eficiencia del Equipo</span>
                                <span className="text-sm font-semibold text-gray-600">Calculando...</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Nota informativa */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-blue-900 mb-1">Datos Filtrados</h4>
                        <p className="text-sm text-blue-700">
                            Los reportes mostrados corresponden al período seleccionado: <strong>{getMonthLabel(monthFilter)} {yearFilter}</strong>.
                            Cambie los filtros arriba para ver diferentes períodos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Función helper para obtener el nombre del mes
function getMonthLabel(month: string): string {
    const months: Record<string, string> = {
        "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
        "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
        "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
    }
    return months[month] || month
}

export default SalesReportsContent