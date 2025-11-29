"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card/Card"
import dynamic from "next/dynamic"
import type ApexCharts from "react-apexcharts"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { STATISTICS_CRM_DASHBOARD_STATES_ENDPOINT } from "@/constant/api-endpoints"

// Importar ApexCharts de forma dinámica para evitar problemas de SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })
// Interfaces para los datos
interface LocationData {
    province: string
    count: number
}

export function SalesLocation() {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<LocationData[]>([])

    // Obtener datos de la API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const response = await fetch(`${STATISTICS_CRM_DASHBOARD_STATES_ENDPOINT}/${session?.user?.id}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })

                if (!response.ok) {
                    throw new Error(`Error al obtener datos: ${response.status}`)
                }

                const apiData: LocationData[] = await response.json()

                // Ordenar los datos por conteo (de mayor a menor)
                const sortedData = [...apiData].sort((a, b) => b.count - a.count)

                setData(sortedData)
                setError(null)
            } catch (err) {
                console.error("Error al cargar los datos de localidades:", err)
                setError("No se pudieron cargar los datos de localidades. Usando datos de respaldo.")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [session?.user?.accessToken, session?.user?.id])

    // Configuración para el gráfico de barras horizontales
    const chartOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "bar",
            height: 400,
            toolbar: {
                show: true,
            },
            fontFamily: "inherit",
        },
        plotOptions: {
            bar: {
                horizontal: true,
                barHeight: "70%",
                borderRadius: 4,
                distributed: true,
                dataLabels: {
                    position: "bottom",
                },
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => val.toString(),
            textAnchor: "start",
            style: {
                colors: ["#fff"],
                fontFamily: "inherit",
            },
            offsetX: 0,
            dropShadow: {
                enabled: true,
            },
        },
        colors: [
            "#3b82f6",
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#8b5cf6",
            "#ec4899",
            "#6b7280",
            "#0ea5e9",
            "#84cc16",
            "#d946ef",
        ],
        xaxis: {
            categories: data.map((item) => item.province),
            labels: {
                formatter: (value) => value.toString(),
            },
            title: {
                text: "Cantidad de Leads",
            },
        },
        yaxis: {
            title: {
                text: "Localidad",
            },
            labels: {
                style: {
                    fontFamily: "inherit",
                },
            },
        },
        tooltip: {
            y: {
                formatter: (val) => val.toString() + " leads",
            },
        },
        legend: {
            show: false,
        },
        grid: {
            borderColor: "#f1f1f1",
            strokeDashArray: 4,
            yaxis: {
                lines: {
                    show: false,
                },
            },
        },
    }

    const chartSeries = [
        {
            name: "Leads",
            data: data.map((item) => item.count),
        },
    ]

    return (
        <Card className="col-span-1">
            <CardHeader>
                <CardTitle>Distribución por Localidades</CardTitle>
                <CardDescription>Cantidad de leads por provincia</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex h-[400px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground">Cargando datos...</span>
                    </div>
                ) : error ? (
                    <div className="flex h-[400px] items-center justify-center">
                        <p className="text-muted-foreground">{error}</p>
                    </div>
                ) : (
                    <div className="h-[400px] w-full">
                        {typeof window !== "undefined" && (
                            <ReactApexChart options={chartOptions} series={chartSeries} type="bar" height={400} />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
