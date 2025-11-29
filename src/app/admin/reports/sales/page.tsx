"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import dynamic from "next/dynamic"
import { TrendingUp, TrendingDown, Target, ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { STATISTICS_CRM_ALL_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table" // Import Table components
import Button from "@/components/ui/button/Button" // Asegúrate de importar Button
import SalesReportsContent from "@/components/reports/SalesReportsContent"

// Importar ApexCharts dinámicamente para evitar problemas de SSR
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false })

export default function ReportSalesPage() {
    const { data: session } = useSession()
    const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()))
    const [monthFilter, setMonthFilter] = useState(String(new Date().getMonth() + 1).padStart(2, "0")) // 1-indexed, padded
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
    const [monthlyLeadsData, setMonthlyLeadsData] = useState<{ month: string; ganadas: number; perdidas: number }[]>([])
    const [channelLeadsData, setChannelLeadsData] = useState<{ name: string; value: number }[]>([])
    const [salesBySellerData, setSalesBySellerData] = useState<{ name: string; value: number }[]>([])
    const [salesByStateData, setSalesByStateData] = useState<{ name: string; value: number }[]>([])
    const [leadsGanadasPersonasTable, setLeadsGanadasPersonasTable] = useState<
        { nombreCompleto: string; email: string }[]
    >([]) // Actualizado para la nueva estructura
    const [loading, setLoading] = useState(false)

    // Estados para la paginación
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5 // Puedes ajustar esto según sea necesario

    // Configuración para el gráfico de barras (Ganadas vs Perdidas)
    const barChartOptions = useMemo(
        () => ({
            chart: {
                type: "bar" as const,
                height: 300,
                stacked: true,
                toolbar: {
                    show: false,
                },
                background: "transparent",
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    borderRadius: 10,
                    borderRadiusApplication: "end" as "end" | "around" | undefined,
                    borderRadiusWhenStacked: "last" as "all" | "last" | undefined,
                    dataLabels: {
                        total: {
                            enabled: true,
                            style: {
                                fontSize: "13px",
                                fontWeight: 900,
                            },
                        },
                    },
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                width: 2,
                colors: ["transparent"],
            },
            xaxis: {
                categories: monthlyLeadsData.map((item) => item.month), // Usa datos reales para categorías
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                labels: {
                    style: {
                        colors: "#6b7280",
                        fontSize: "12px",
                    },
                },
            },
            yaxis: {
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                labels: {
                    style: {
                        colors: "#6b7280",
                        fontSize: "12px",
                    },
                },
            },
            fill: {
                opacity: 1,
            },
            tooltip: {
                theme: "light",
                y: {
                    formatter: (val: number) => val + " oportunidades",
                },
            },
            legend: {
                position: "bottom" as const,
                horizontalAlign: "center" as const,
                fontSize: "12px",
                markers: {
                    size: 4,
                },
            },
            colors: ["#10b981", "#ef4444"],
            grid: {
                borderColor: "#f1f5f9",
                strokeDashArray: 3,
            },
        }),
        [monthlyLeadsData],
    )

    const barChartSeries = useMemo(
        () => [
            {
                name: "Ganadas",
                data: monthlyLeadsData.map((item) => item.ganadas),
            },
            {
                name: "Perdidas",
                data: monthlyLeadsData.map((item) => item.perdidas),
            },
        ],
        [monthlyLeadsData],
    )

    // Configuración para el gráfico de dona (Canales)
    const donutChartOptions = useMemo(
        () => ({
            chart: {
                type: "donut" as const,
                height: 300,
            },
            labels: channelLeadsData.map((item) => item.name),
            colors: ["#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280", "#3b82f6", "#ec4899"],
            plotOptions: {
                pie: {
                    donut: {
                        size: "60%",
                    },
                },
            },
            dataLabels: {
                enabled: false,
            },
            tooltip: {
                theme: "light",
                y: {
                    formatter: (val: number) => val + " leads",
                },
            },
            legend: {
                position: "bottom" as const,
                horizontalAlign: "center" as const,
                fontSize: "12px",
                markers: {
                    size: 4,
                },
            },
            responsive: [
                {
                    breakpoint: 480,
                    options: {
                        chart: {
                            width: 200,
                        },
                        legend: {
                            position: "bottom" as const,
                        },
                    },
                },
            ],
        }),
        [channelLeadsData],
    )

    const donutChartSeries = useMemo(() => channelLeadsData.map((item: any) => item.value), [channelLeadsData])

    // Configuración para el gráfico de barras (Ventas por Vendedor - Rol)
    const salesBySellerChartOptions = useMemo(
        () => ({
            chart: {
                type: "bar" as const,
                height: 300,
                toolbar: {
                    show: false,
                },
                background: "transparent",
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: "50%",
                    borderRadius: 5,
                },
            },
            dataLabels: {
                enabled: false,
            },
            xaxis: {
                categories: salesBySellerData.map((item) => item.name),
                labels: {
                    style: {
                        colors: "#6b7280",
                        fontSize: "12px",
                    },
                },
            },
            yaxis: {
                title: {
                    text: "Oportunidades Ganadas",
                    style: {
                        color: "#6b7280",
                    },
                },
                labels: {
                    style: {
                        colors: "#6b7280",
                        fontSize: "12px",
                    },
                },
            },
            fill: {
                opacity: 1,
            },
            tooltip: {
                theme: "light",
                y: {
                    formatter: (val: number) => val + " oportunidades",
                },
            },
            legend: {
                show: false,
            },
            colors: ["#3b82f6"], // Un color azul agradable
            grid: {
                borderColor: "#f1f5f9",
                strokeDashArray: 3,
            },
        }),
        [salesBySellerData],
    )

    const salesBySellerChartSeries = useMemo(
        () => [
            {
                name: "Oportunidades Ganadas",
                data: salesBySellerData.map((item) => item.value),
            },
        ],
        [salesBySellerData],
    )

    // Configuración para el nuevo gráfico de barras (Ventas por Localidad/Estado)
    const salesByStateChartOptions = useMemo(
        () => ({
            chart: {
                type: "bar" as const,
                height: 300,
                toolbar: {
                    show: false,
                },
                background: "transparent",
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: "50%",
                    borderRadius: 5,
                },
            },
            dataLabels: {
                enabled: false,
            },
            xaxis: {
                categories: salesByStateData.map((item) => item.name),
                labels: {
                    style: {
                        colors: "#6b7280",
                        fontSize: "12px",
                    },
                },
            },
            yaxis: {
                title: {
                    text: "Oportunidades Ganadas",
                    style: {
                        color: "#6b7280",
                    },
                },
                labels: {
                    style: {
                        colors: "#6b7280",
                        fontSize: "12px",
                    },
                },
            },
            fill: {
                opacity: 1,
            },
            tooltip: {
                theme: "light",
                y: {
                    formatter: (val: number) => val + " oportunidades",
                },
            },
            legend: {
                show: false,
            },
            colors: ["#06b6d4"], // Un color cian agradable
            grid: {
                borderColor: "#f1f5f9",
                strokeDashArray: 3,
            },
        }),
        [salesByStateData],
    )

    const salesByStateChartSeries = useMemo(
        () => [
            {
                name: "Oportunidades Ganadas",
                data: salesByStateData.map((item) => item.value),
            },
        ],
        [salesByStateData],
    )

    // Usar useCallback para evitar múltiples cargas innecesarias
    const fetchStatistics = useCallback(async () => {
        if (!session?.user?.accessToken) return

        setLoading(true)
        try {
            // Enviar ambos filtros de mes y año. timeframe='month' indica que las estadísticas principales son para el mes específico.
            const res = await fetch(`${STATISTICS_CRM_ALL_ENDPOINT}?year=${yearFilter}&month=${monthFilter}`, {
                headers: {
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!res.ok) {
                console.error("Error fetching statistics:", res.status, res.statusText)
                return
            }

            const response = await res.json()
            console.log("API Response:", response) // 🔍 Para debug

            if (response.statsCard) {
                setData({
                    oportunidadesCreadas: response.statsCard.oportunidadesCreadas || 0,
                    oportunidadesGanadas: response.statsCard.oportunidadesGanadas || 0,
                    oportunidadesPerdidas: response.statsCard.oportunidadesPerdidas || 0,
                    tasaConversion: response.statsCard.tasaConversion || 0,
                    tendenciaCreadas: response.statsCard.tendenciaCreadas || 0,
                    tendenciaGanadas: response.statsCard.tendenciaGanadas || 0,
                    tendenciaPerdidas: response.statsCard.tendenciaPerdidas || 0,
                    tendenciaConversion: response.statsCard.tendenciaConversion || 0,
                })
            }

            setMonthlyLeadsData(response.monthlyLeadsData || [])
            setChannelLeadsData(response.channelLeadsData || [])
            setSalesBySellerData(response.salesBySellerData || [])
            
            // Procesar datos de ventas por localidad/estado con datos adicionales si es necesario
            const salesLocationData = [...(response.salesByLocationData || [])]
            
            // Agregar CABA y RAFAELA si no están presentes en la respuesta
            const existingLocations = salesLocationData.map((item: any) => item.name.toLowerCase())
            
            if (!existingLocations.includes('caba') && !existingLocations.includes('ciudad autónoma de buenos aires')) {
                salesLocationData.push({ name: 'CABA', value: 0 })
            }
            
            if (!existingLocations.includes('rafaela')) {
                salesLocationData.push({ name: 'Rafaela', value: 0 })
            }
            
            // Ordenar por valor descendente para mejor visualización
            salesLocationData.sort((a: any, b: any) => b.value - a.value)
            
            setSalesByStateData(salesLocationData)
            setLeadsGanadasPersonasTable(response.leadsGanadasPersonas || [])
            setCurrentPage(1) // Resetear a la primera página al cargar nuevos datos
        } catch (error) {
            console.error("Error fetching statistics:", error)
        } finally {
            setLoading(false)
        }
    }, [session?.user?.accessToken, yearFilter, monthFilter])

    useEffect(() => {
        fetchStatistics()
    }, [fetchStatistics])

    // ✅ Función para calcular la tasa de conversión
    const calculateConversionRate = () => {
        if (data.oportunidadesCreadas === 0) return "0"
        return ((data.oportunidadesGanadas / data.oportunidadesCreadas) * 100).toFixed(1)
    }

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

    // Lógica de paginación
    const totalPages = Math.ceil(leadsGanadasPersonasTable.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const currentTableData = leadsGanadasPersonasTable.slice(startIndex, endIndex)

    const handlePreviousPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1))
    }

    const handleNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto space-y-6">
                {/* Nuevo componente de reportes de ventas con estadísticas */}
                <SalesReportsContent />
                
                {/* Separador */}
                <div className="border-t border-gray-200 my-8"></div>

                {/* Header con filtro de año y mes - CONTENIDO EXISTENTE */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Análisis Detallado</h1>
                        <p className="text-gray-600">Dashboard de oportunidades y conversiones (vista extendida)</p>
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

                {/* Indicador de carga */}
                {loading && (
                    <div className="py-4 text-center">
                        <p className="text-gray-600">Cargando datos...</p>
                    </div>
                )}

                {/* Métricas principales */}
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {" "}
                    {/* Cambiado a lg:grid-cols-3 */}
                    {/* Tarjeta de Total Leads (suma de las tres) */}
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
                            <Target className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">
                                {data.oportunidadesCreadas + data.oportunidadesGanadas + data.oportunidadesPerdidas}
                            </div>
                            <p className="text-xs text-blue-600">
                                {/* Aquí podrías calcular una tendencia general si lo deseas */}
                                {/* Por ahora, solo mostramos el total */}
                                Suma de Pendientes, Ganadas y Perdidas
                            </p>
                        </CardContent>
                    </Card>
                    {/* Tarjeta de Oportunidades Pendientes (antes era "Total Oportunidades") */}
                    <Card className="border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Oportunidades Pendientes</CardTitle>
                            <Target className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{data.oportunidadesCreadas}</div>
                            <p className="text-xs text-emerald-600">
                                <TrendingUp className="mr-1 inline h-3 w-3" />
                                {data.tendenciaCreadas > 0 ? "+" : ""}
                                {data.tendenciaCreadas}% vs período anterior
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Ganadas</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{data.oportunidadesGanadas}</div>
                            <p className="text-xs text-green-600">
                                <TrendingUp className="mr-1 inline h-3 w-3" />
                                {data.tendenciaGanadas > 0 ? "+" : ""}
                                {data.tendenciaGanadas}% vs período anterior
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Perdidas</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-gray-900">{data.oportunidadesPerdidas}</div>
                            <p className="text-xs text-red-600">
                                <TrendingDown className="mr-1 inline h-3 w-3" />
                                {data.tendenciaPerdidas > 0 ? "+" : ""}
                                {data.tendenciaPerdidas}% vs período anterior
                            </p>
                        </CardContent>
                    </Card>
                    {/* La tarjeta "En Progreso" ha sido eliminada */}
                </div>

                {/* Gráficos */}
                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-2">
                    {/* Gráfico de Ganadas vs Perdidas */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Oportunidades Ganadas vs Perdidas</CardTitle>
                            <CardDescription>Comparación mensual de resultados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                {monthlyLeadsData.length > 0 ? (
                                    <Chart options={barChartOptions} series={barChartSeries} type="bar" height={300} />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-gray-500">
                                        <p>No hay datos disponibles para este gráfico</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gráfico por Canal de Ingreso */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Oportunidades por Canal</CardTitle>
                            <CardDescription>Distribución de leads por fuente de ingreso</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                {channelLeadsData.length > 0 ? (
                                    <Chart options={donutChartOptions} series={donutChartSeries} type="donut" height={300} />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-gray-500">
                                        <p>No hay datos disponibles para este gráfico</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-2">
                    {/* Nuevo Gráfico: Ventas por Vendedor (Rol) */}
                    <Card className="lg:col-span-2 xl:col-span-1">
                        {" "}
                        {/* Ocupa 2 columnas en lg, 1 en xl */}
                        <CardHeader>
                            <CardTitle>Ventas por Vendedor (Rol)</CardTitle>
                            <CardDescription>Oportunidades ganadas por rol de ventas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                {salesBySellerData.length > 0 ? (
                                    <Chart
                                        options={salesBySellerChartOptions}
                                        series={salesBySellerChartSeries}
                                        type="bar"
                                        height={300}
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-gray-500">
                                        <p>No hay datos disponibles para este gráfico</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    {/* Nuevo Gráfico: Ventas por Localidad/Estado */}
                    <Card className="lg:col-span-2 xl:col-span-1">
                        {" "}
                        {/* Ocupa 2 columnas en lg, 1 en xl */}
                        <CardHeader>
                            <CardTitle>Ventas por Localidad/Estado</CardTitle>
                            <CardDescription>
                                Oportunidades ganadas por ubicación - {months.find(m => m.value === monthFilter)?.label} {yearFilter}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px]">
                                {salesByStateData.length > 0 ? (
                                    <>
                                        <div className="mb-4 p-2 bg-blue-50 rounded-lg text-center">
                                            <p className="text-sm text-blue-700 font-medium">
                                                📊 Datos actualizados para: {months.find(m => m.value === monthFilter)?.label} {yearFilter}
                                            </p>
                                        </div>
                                        <Chart options={salesByStateChartOptions} series={salesByStateChartSeries} type="bar" height={250} />
                                    </>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <p className="text-lg mb-2">No hay datos disponibles</p>
                                            <p className="text-sm">para {months.find(m => m.value === monthFilter)?.label} {yearFilter}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Nueva Tabla: Oportunidades Ganadas por Persona */}
                <Card>
                    <CardHeader>
                        <CardTitle>Oportunidades Ganadas por Persona</CardTitle>
                        <CardDescription>Detalle de oportunidades ganadas por cada vendedor.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentTableData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table className="w-full border border-gray-200">
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                                                Nombre Completo
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</TableCell>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentTableData.map((item, index) => (
                                            <TableRow key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">{item.nombreCompleto}</TableCell>
                                                <TableCell className="px-4 py-3 text-sm text-gray-700">{item.email}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Controles de paginación */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-end space-x-2 py-4">
                                        <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Anterior
                                        </Button>
                                        <span className="text-sm text-gray-700">
                                            Página {currentPage} de {totalPages}
                                        </span>
                                        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                                            Siguiente
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-4 text-center text-gray-500">
                                <div className="flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
                                    <Target className="mb-4 h-10 w-10 text-gray-500" />
                                    <h3 className="mb-2 text-lg font-medium">No hay datos de oportunidades ganadas por persona</h3>
                                    <p className="text-sm text-gray-500">
                                        Asegúrate de que haya oportunidades marcadas como &quot;Ganadas&quot; para este período.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
