"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { ArrowDown, ArrowUp, CircleDollarSign, Target, TrendingUp, Users } from "lucide-react"
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

export default function SalesOverview() {
    const { data: session } = useSession()
    const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0")) // 1-indexed, padded
    const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
    const [data, setData] = useState({
        oportunidadesCreadas: 0,
        oportunidadesGanadas: 0,
        oportunidadesPerdidas: 0,
        tasaConversion: 0,
        tendenciaCreadas: 0,
        tendenciaGanadas: 0,
        tendenciaPerdidas: 0,
        tendenciaConversion: 0,
    })

    useEffect(() => {
        async function fetchStatistics() {
            if (!session?.user?.id || !session?.user?.accessToken) return

            try {
                // Actualizamos la llamada a la API para usar year y month
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
                setData(stats.statsCard)
            } catch (error) {
                console.error("Error fetching statistics:", error)
            }
        }

        fetchStatistics()
    }, [session, monthFilter, yearFilter]) // Añadimos monthFilter y yearFilter a las dependencias

    const currentData = data

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
        [],
    )

    return (
        <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Resumen de Ventas</h2>
                    <p className="text-gray-600">Estadísticas clave de rendimiento</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {/* Month Selector */}
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="w-[120px] rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none"
                    >
                        {months.map((month) => (
                            <option key={month.value} value={month.value}>
                                {month.label}
                            </option>
                        ))}
                    </select>
                    {/* Year Selector */}
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="w-[120px] rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none"
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Oportunidades Creadas"
                    value={currentData.oportunidadesCreadas}
                    trend={currentData.tendenciaCreadas}
                    icon={<Target className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard
                    title="Oportunidades Ganadas"
                    value={currentData.oportunidadesGanadas}
                    trend={currentData.tendenciaGanadas}
                    icon={<CircleDollarSign className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard
                    title="Oportunidades Perdidas"
                    value={currentData.oportunidadesPerdidas}
                    trend={currentData.tendenciaPerdidas}
                    icon={<Users className="h-4 w-4 text-muted-foreground" />}
                />
                <StatCard
                    title="Tasa de Conversión"
                    value={`${currentData.tasaConversion}%`}
                    trend={currentData.tendenciaConversion}
                    icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                />
            </div>
        </div>
    )
}

function StatCard({
    title,
    value,
    trend,
    icon,
}: {
    title: string
    value: number | string
    trend: number
    icon: React.ReactNode
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                    {trend >= 0 ? (
                        <>
                            <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
                            <span className="text-emerald-500">{trend}%</span>
                        </>
                    ) : (
                        <>
                            <ArrowDown className="mr-1 h-3 w-3 text-rose-500" />
                            <span className="text-rose-500">{Math.abs(trend)}%</span>
                        </>
                    )}
                    <span className="ml-1">vs. período anterior</span>
                </div>
            </CardContent>
        </Card>
    )
}