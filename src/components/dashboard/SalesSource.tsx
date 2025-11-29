"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs/Tabs"
import dynamic from "next/dynamic"
import type ApexCharts from "react-apexcharts"
import Switch from "@/components/ui/switch/Switch"
import Label from "@/components/ui/label/Label"
import { STATISTICS_CRM_DASHBOARD_SC_ENDPOINT } from "@/constant/api-endpoints"
import { Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"

// Importar ApexCharts de forma dinámica para evitar problemas de SSR
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false })

// Interfaces para los datos
interface SourceData {
    source: string
    leads: number
    conversion: number
}

interface SocialData {
    network: string
    leads: number
    conversion: number
}

interface ApiResponse {
    monthlySourceData: SourceData[]
    monthlySocialData: SocialData[]
    quarterlySourceData?: SourceData[]
    quarterlySocialData?: SocialData[]
    yearlySourceData?: SourceData[]
    yearlySocialData?: SocialData[]
}

export function SalesSource() {
    const { data: session } = useSession()
    const [activeTab, setActiveTab] = useState("mensual")
    const [activeView, setActiveView] = useState("general")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<ApiResponse | null>(null)

    // Datos de respaldo en caso de que la API no devuelva datos para alguna categoría
    // const fallbackData = {
    //     monthlySourceData: [
    //         { source: "Website", leads: 1, conversion: 0 },
    //         { source: "Telemarketing", leads: 2, conversion: 0 },
    //         { source: "Radio", leads: 1, conversion: 0 },
    //         { source: "Correo Electrónico", leads: 1, conversion: 0 },
    //         { source: "Otros", leads: 2, conversion: 0 },
    //     ],
    //     monthlySocialData: [],
    //     quarterlySourceData: [
    //         { source: "Website", leads: 3, conversion: 0 },
    //         { source: "Telemarketing", leads: 6, conversion: 0 },
    //         { source: "Radio", leads: 3, conversion: 0 },
    //         { source: "Correo Electrónico", leads: 3, conversion: 0 },
    //         { source: "Otros", leads: 6, conversion: 0 },
    //     ],
    //     quarterlySocialData: [],
    //     yearlySourceData: [
    //         { source: "Website", leads: 12, conversion: 0 },
    //         { source: "Telemarketing", leads: 24, conversion: 0 },
    //         { source: "Radio", leads: 12, conversion: 0 },
    //         { source: "Correo Electrónico", leads: 12, conversion: 0 },
    //         { source: "Otros", leads: 24, conversion: 0 },
    //     ],
    //     yearlySocialData: [],
    // }

    // Obtener datos de la API
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const response = await fetch(`${STATISTICS_CRM_DASHBOARD_SC_ENDPOINT}/${session?.user?.id}`, {
                    headers: {
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })

                if (!response.ok) {
                    throw new Error(`Error al obtener datos: ${response.status}`)
                }

                const apiData: ApiResponse = await response.json()

                // Asegurarse de que todos los datos necesarios estén presentes
                const completeData = {
                    ...apiData,
                }

                setData(completeData)
                setError(null)
            } catch (err) {
                console.error("Error al cargar los datos:", err)
                setError("No se pudieron cargar los datos. Usando datos de respaldo.")
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [session?.user?.accessToken, session?.user?.id])

    // Preparar datos para ApexCharts según la pestaña activa
    const getChartData = (): {
        series: number[]
        labels: string[]
        options: ApexCharts.ApexOptions
    } => {
        if (!data) {
            return {
                series: [],
                labels: [],
                options: {
                    chart: {
                        type: "donut",
                        fontFamily: "inherit",
                    },
                },
            }
        }

        let sourceData: SourceData[] = []
        let socialData: SocialData[] = []

        // Seleccionar los datos según la pestaña activa
        switch (activeTab) {
            case "mensual":
                sourceData = data.monthlySourceData || []
                socialData = data.monthlySocialData || []
                break
            case "trimestral":
                sourceData = data.quarterlySourceData || []
                socialData = data.quarterlySocialData || []
                break
            case "anual":
                sourceData = data.yearlySourceData || []
                socialData = data.yearlySocialData || []
                break
            default:
                sourceData = data.monthlySourceData || []
                socialData = data.monthlySocialData || []
        }

        // Si estamos viendo el desglose de redes sociales
        if (activeView === "social") {
            // Si no hay datos de redes sociales, mostrar un mensaje
            if (socialData.length === 0) {
                return {
                    series: [1],
                    labels: ["No hay datos"],
                    options: {
                        chart: {
                            type: "donut",
                            fontFamily: "inherit",
                        },
                        labels: ["No hay datos"],
                        colors: ["#d1d5db"],
                        legend: {
                            position: "bottom",
                            fontFamily: "inherit",
                        },
                        plotOptions: {
                            pie: {
                                donut: {
                                    size: "50%",
                                    labels: {
                                        show: true,
                                        name: {
                                            show: true,
                                        },
                                        value: {
                                            show: true,
                                            formatter: () => "0",
                                        },
                                        total: {
                                            show: true,
                                            label: "Total",
                                            formatter: () => "0",
                                        },
                                    },
                                },
                            },
                        },
                        dataLabels: {
                            enabled: false,
                        },
                    },
                }
            }

            return {
                series: socialData.map((item) => item.leads),
                labels: socialData.map((item) => item.network),
                options: {
                    chart: {
                        type: "donut",
                        fontFamily: "inherit",
                    },
                    labels: socialData.map((item) => item.network),
                    colors: ["#4267B2", "#E1306C", "#0077B5", "#1DA1F2", "#000000"],
                    legend: {
                        position: "bottom",
                        fontFamily: "inherit",
                    },
                    plotOptions: {
                        pie: {
                            donut: {
                                size: "50%",
                                labels: {
                                    show: true,
                                    name: {
                                        show: true,
                                    },
                                    value: {
                                        show: true,
                                        formatter: (val) => val.toString(),
                                    },
                                    total: {
                                        show: true,
                                        label: "Total",
                                        formatter: (w) => {
                                            return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString()
                                        },
                                    },
                                },
                            },
                        },
                    },
                    dataLabels: {
                        enabled: false,
                    },
                    responsive: [
                        {
                            breakpoint: 480,
                            options: {
                                chart: {
                                    height: 300,
                                },
                                legend: {
                                    position: "bottom",
                                },
                            },
                        },
                    ],
                },
            }
        }

        // Para la vista general de fuentes
        return {
            series: sourceData.map((item) => item.leads),
            labels: sourceData.map((item) => item.source),
            options: {
                chart: {
                    type: "donut",
                    fontFamily: "inherit",
                },
                labels: sourceData.map((item) => item.source),
                colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"],
                legend: {
                    position: "bottom",
                    fontFamily: "inherit",
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: "50%",
                            labels: {
                                show: true,
                                name: {
                                    show: true,
                                },
                                value: {
                                    show: true,
                                    formatter: (val) => val.toString(),
                                },
                                total: {
                                    show: true,
                                    label: "Total",
                                    formatter: (w) => {
                                        return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0).toString()
                                    },
                                },
                            },
                        },
                    },
                },
                dataLabels: {
                    enabled: false,
                },
                responsive: [
                    {
                        breakpoint: 480,
                        options: {
                            chart: {
                                height: 300,
                            },
                            legend: {
                                position: "bottom",
                            },
                        },
                    },
                ],
            },
        }
    }

    const chartData = getChartData()

    // Función para obtener datos para el gráfico de barras de conversión
    const getConversionChartData = (): {
        series: { name: string; data: number[] }[]
        options: ApexCharts.ApexOptions
    } => {
        if (!data) {
            return {
                series: [{ name: "Tasa de Conversión", data: [] }],
                options: {
                    chart: {
                        type: "bar",
                        height: 300,
                    },
                },
            }
        }

        let sourceData: SourceData[] = []
        let socialData: SocialData[] = []

        // Seleccionar los datos según la pestaña activa
        switch (activeTab) {
            case "mensual":
                sourceData = data.monthlySourceData || []
                socialData = data.monthlySocialData || []
                break
            case "trimestral":
                sourceData = data.quarterlySourceData || []
                socialData = data.quarterlySocialData || []
                break
            case "anual":
                sourceData = data.yearlySourceData || []
                socialData = data.yearlySocialData || []
                break
            default:
                sourceData = data.monthlySourceData || []
                socialData = data.monthlySocialData || []
        }

        // Si estamos viendo el desglose de redes sociales
        if (activeView === "social") {
            // Si no hay datos de redes sociales, mostrar un mensaje
            if (socialData.length === 0) {
                return {
                    series: [{ name: "Tasa de Conversión", data: [0] }],
                    options: {
                        chart: {
                            type: "bar",
                            height: 300,
                            toolbar: {
                                show: false,
                            },
                            fontFamily: "inherit",
                        },
                        plotOptions: {
                            bar: {
                                horizontal: true,
                                barHeight: "70%",
                                borderRadius: 4,
                            },
                        },
                        dataLabels: {
                            enabled: true,
                            formatter: () => "0%",
                        },
                        xaxis: {
                            categories: ["No hay datos"],
                        },
                        colors: ["#d1d5db"],
                        legend: {
                            show: false,
                        },
                    },
                }
            }

            return {
                series: [
                    {
                        name: "Tasa de Conversión",
                        data: socialData.map((item) => item.conversion),
                    },
                ],
                options: {
                    chart: {
                        type: "bar",
                        height: 300,
                        toolbar: {
                            show: false,
                        },
                        fontFamily: "inherit",
                    },
                    plotOptions: {
                        bar: {
                            horizontal: true,
                            barHeight: "70%",
                            borderRadius: 4,
                            distributed: true,
                        },
                    },
                    dataLabels: {
                        enabled: true,
                        formatter: (val) => val + "%",
                        style: {
                            fontFamily: "inherit",
                        },
                    },
                    xaxis: {
                        categories: socialData.map((item) => item.network),
                        labels: {
                            formatter: (value) => value + "%",
                        },
                    },
                    yaxis: {
                        title: {
                            text: "Red Social",
                        },
                    },
                    colors: ["#4267B2", "#E1306C", "#0077B5", "#1DA1F2", "#000000"],
                    legend: {
                        show: false,
                    },
                    grid: {
                        borderColor: "#f1f1f1",
                        strokeDashArray: 4,
                    },
                },
            }
        }

        // Para la vista general de fuentes
        return {
            series: [
                {
                    name: "Tasa de Conversión",
                    data: sourceData.map((item) => item.conversion),
                },
            ],
            options: {
                chart: {
                    type: "bar",
                    height: 300,
                    toolbar: {
                        show: false,
                    },
                    fontFamily: "inherit",
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                        barHeight: "70%",
                        borderRadius: 4,
                        distributed: true,
                    },
                },
                dataLabels: {
                    enabled: true,
                    formatter: (val) => val + "%",
                    style: {
                        fontFamily: "inherit",
                    },
                },
                xaxis: {
                    categories: sourceData.map((item) => item.source),
                    labels: {
                        formatter: (value) => value + "%",
                    },
                },
                yaxis: {
                    title: {
                        text: "Fuente",
                    },
                },
                colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"],
                legend: {
                    show: false,
                },
                grid: {
                    borderColor: "#f1f1f1",
                    strokeDashArray: 4,
                },
            },
        }
    }

    const conversionChartData = getConversionChartData()

    // Verificar si hay datos de redes sociales disponibles
    const hasSocialData = data?.monthlySocialData && data.monthlySocialData.length > 0

    return (
        <Card className="col-span-1">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Fuentes de Leads</CardTitle>
                        <CardDescription>Análisis de canales de ingreso de leads</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        <Label htmlFor="view-mode" className="text-sm">
                            General
                        </Label>
                        <Switch
                            id="view-mode"
                            label=""
                            defaultChecked={activeView === "social"}
                            onChange={(checked: any) => setActiveView(checked ? "social" : "general")}
                            disabled={!hasSocialData}
                        />
                        <Label htmlFor="view-mode" className="text-sm">
                            Redes Sociales
                        </Label>
                    </div>
                </div>
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
                    <>
                        <Tabs defaultValue="mensual" className="w-full" onValueChange={setActiveTab}>
                            <TabsList className="w-full">
                                <TabsTrigger value="mensual">Mensual</TabsTrigger>
                                <TabsTrigger value="trimestral">Trimestral</TabsTrigger>
                                <TabsTrigger value="anual">Anual</TabsTrigger>
                            </TabsList>
                            <TabsContent value={activeTab} className="space-y-4">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-4 text-sm font-medium">
                                            Distribución de Leads por {activeView === "social" ? "Red Social" : "Fuente"}
                                        </h3>
                                        <div className="h-[300px] w-full">
                                            {typeof window !== "undefined" && (
                                                <ReactApexChart
                                                    options={chartData.options as ApexCharts.ApexOptions}
                                                    series={chartData.series}
                                                    type="donut"
                                                    height={300}
                                                />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="mb-4 text-sm font-medium">
                                            Tasa de Conversión por {activeView === "social" ? "Red Social" : "Fuente"} (%)
                                        </h3>
                                        <div className="h-[300px] w-full">
                                            {typeof window !== "undefined" && (
                                                <ReactApexChart
                                                    options={conversionChartData.options as ApexCharts.ApexOptions}
                                                    series={conversionChartData.series}
                                                    type="bar"
                                                    height={300}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {activeView === "social" && !hasSocialData && (
                            <div className="mt-4 rounded-md bg-muted p-4 text-center">
                                <p className="text-muted-foreground">No hay datos disponibles para redes sociales.</p>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}
