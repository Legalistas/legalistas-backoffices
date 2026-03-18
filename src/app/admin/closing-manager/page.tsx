"use client"

import { useState, useEffect, useCallback } from "react"
import ClosingManagerTable, { ALL_CLOSING_COLUMNS } from "@/components/closing-manager/closing-manager-table"
import ClosingFilters, { type ClosingFiltersState } from "@/components/closing-manager/ClosingFilters"
import { CLOSINGS_ENDPOINT, CLOSINGS_KPIS_ENDPOINT, CLOSINGS_EXPORT_ENDPOINT } from "@/constant/api-endpoints"
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions"
import type { ClosingManagerApiResponse, ClosingManagerEntry, Pagination, ClosingKpis } from "@/types/closing-manager"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlusCircle, Terminal, TrendingUp, DollarSign, Briefcase, Building, ArrowRightLeft, Download } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Button from "@/components/ui/button/Button"

const formatARS = (amount: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(amount)

export default function ClosingManagerPage() {
    const { data: session } = useSession()
    const permissions = useRolePermissions()

    // Data
    const [closings, setClosings] = useState<ClosingManagerEntry[]>([])
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 })
    const [kpis, setKpis] = useState<ClosingKpis | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    // Filtro temporal (obligatorio)
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [viewAll, setViewAll] = useState(false)

    // Filtros avanzados
    const [filters, setFilters] = useState<ClosingFiltersState>({
        search: "",
        type: "",
        capitalState: "",
        feeStatus: "",
        pclStatus: "",
    })
    const [visibleColumns, setVisibleColumns] = useState<string[]>([...ALL_CLOSING_COLUMNS])

    // =========================================================================
    // Fetch closings
    // =========================================================================
    const fetchClosings = useCallback(
        async (page: number) => {
            if (!session?.user?.accessToken) return
            setLoading(true)
            setError(null)
            try {
                const params: Record<string, string> = {
                    page: page.toString(),
                    limit: pagination.limit.toString(),
                    month: month.toString(),
                    year: year.toString(),
                }
                if (viewAll) params.viewAll = "true"
                if (filters.search) params.search = filters.search
                if (filters.type) params.type = filters.type
                if (filters.capitalState) params.capitalState = filters.capitalState
                if (filters.feeStatus) params.feeStatus = filters.feeStatus
                if (filters.pclStatus) params.pclStatus = filters.pclStatus

                const url = buildFilteredUrl(CLOSINGS_ENDPOINT, permissions, params)
                const response = await fetch(url, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                })

                if (!response.ok) throw new Error(`Error al cargar los datos: ${response.statusText}`)

                const data: ClosingManagerApiResponse = await response.json()
                setClosings(data.data)
                setPagination(data.meta)
            } catch (err) {
                console.error("Error fetching closings:", err)
                setError("No se pudieron cargar los datos de cierres.")
            } finally {
                setLoading(false)
            }
        },
        [pagination.limit, month, year, viewAll, filters, session?.user?.accessToken, permissions],
    )

    // =========================================================================
    // Fetch KPIs
    // =========================================================================
    const fetchKpis = useCallback(async () => {
        if (!session?.user?.accessToken) return
        try {
            const params: Record<string, string> = {
                month: month.toString(),
                year: year.toString(),
                view: viewAll ? "annual" : "monthly",
            }
            const url = buildFilteredUrl(CLOSINGS_KPIS_ENDPOINT, permissions, params)
            const response = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.user.accessToken}`,
                },
            })
            if (response.ok) {
                const json = await response.json()
                setKpis(json.data)
            }
        } catch {
            // Silent fail for KPIs
        }
    }, [month, year, viewAll, session?.user?.accessToken, permissions])

    // =========================================================================
    // Export
    // =========================================================================
    const handleExport = async (format: "xlsx" | "csv") => {
        if (!session?.user?.accessToken) return
        setExporting(true)
        try {
            const params: Record<string, string> = {
                format,
                month: month.toString(),
                year: year.toString(),
            }
            if (viewAll) params.viewAll = "true"
            if (filters.type) params.type = filters.type

            const url = buildFilteredUrl(CLOSINGS_EXPORT_ENDPOINT, permissions, params)
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${session.user.accessToken}`,
                },
            })

            if (!response.ok) throw new Error("Error al exportar")

            const blob = await response.blob()
            const link = document.createElement("a")
            link.href = URL.createObjectURL(blob)
            const period = viewAll ? `año_${year}` : `${String(month).padStart(2, "0")}_${year}`
            link.download = `cierres_${period}.${format}`
            link.click()
            URL.revokeObjectURL(link.href)
        } catch (err) {
            console.error("Error exporting:", err)
            alert("Error al exportar los cierres")
        } finally {
            setExporting(false)
        }
    }

    // =========================================================================
    // Effects
    // =========================================================================
    useEffect(() => {
        fetchClosings(1)
        setPagination((prev) => ({ ...prev, page: 1 }))
    }, [fetchClosings])

    useEffect(() => {
        fetchKpis()
    }, [fetchKpis])

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination((prev) => ({ ...prev, page: newPage }))
            fetchClosings(newPage)
        }
    }

    const handleFiltersChange = (newFilters: ClosingFiltersState) => {
        setFilters(newFilters)
        setPagination((prev) => ({ ...prev, page: 1 }))
    }

    // =========================================================================
    // KPI cards config
    // =========================================================================
    const kpiCards = [
        {
            label: "Cierres del mes",
            value: kpis?.count ?? 0,
            format: "number" as const,
            icon: TrendingUp,
            iconBg: "bg-brand-500/10",
            iconColor: "text-brand-500",
            valueColor: "text-gray-900",
        },
        {
            label: "Capital cerrado",
            value: kpis?.totalCapital ?? 0,
            format: "currency" as const,
            icon: DollarSign,
            iconBg: "bg-green-100",
            iconColor: "text-green-600",
            valueColor: "text-green-600",
        },
        {
            label: "Honorarios generados",
            value: kpis?.totalHonorarios ?? 0,
            format: "currency" as const,
            icon: Briefcase,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-600",
            valueColor: "text-blue-600",
        },
        {
            label: "Neto Legalistas",
            value: kpis?.totalNetoLegalistas ?? 0,
            format: "currency" as const,
            icon: Building,
            iconBg: "bg-purple-100",
            iconColor: "text-purple-600",
            valueColor: "text-purple-600",
        },
        {
            label: "Total a transferir",
            value: kpis?.totalTransferir ?? 0,
            format: "currency" as const,
            icon: ArrowRightLeft,
            iconBg: "bg-brand-500/10",
            iconColor: "text-brand-600",
            valueColor: "text-brand-600",
        },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestor de Cierres</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Administra y gestiona los cierres de causas</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Exportar */}
                    <div className="relative group">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={exporting}
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Exportar
                        </Button>
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50 hidden group-hover:block">
                            <button
                                onClick={() => handleExport("xlsx")}
                                disabled={exporting}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                            >
                                Excel (.xlsx)
                            </button>
                            <button
                                onClick={() => handleExport("csv")}
                                disabled={exporting}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                            >
                                CSV (.csv)
                            </button>
                        </div>
                    </div>

                    {/* Nuevo Cierre */}
                    <Link href="/admin/closing-manager/create">
                        <Button
                            variant="custom"
                            size="sm"
                            className="flex items-center gap-2 bg-brand-500 text-white hover:bg-brand-500/85 px-4 py-2.5 rounded-lg shadow-sm"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Nuevo Cierre
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {kpiCards.map((kpi) => (
                    <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {kpi.label}
                                </p>
                                <p className={`text-xl font-bold mt-1 ${kpi.valueColor}`}>
                                    {kpi.format === "currency"
                                        ? formatARS(kpi.value)
                                        : kpi.value}
                                </p>
                            </div>
                            <div className={`h-10 w-10 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <ClosingFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
                month={month}
                year={year}
                viewAll={viewAll}
                onMonthChange={setMonth}
                onYearChange={setYear}
                onToggleViewAll={() => setViewAll(!viewAll)}
            />

            {/* Content */}
            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 rounded-xl">
                        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-lg shadow-md border border-gray-100">
                            <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                            <span className="text-sm text-gray-600">Cargando cierres...</span>
                        </div>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {!loading && !error && (
                    <ClosingManagerTable
                        closings={closings}
                        pagination={pagination}
                        onPageChange={handlePageChange}
                        onRefresh={() => {
                            fetchClosings(pagination.page)
                            fetchKpis()
                        }}
                        visibleColumns={visibleColumns}
                    />
                )}
            </div>
        </div>
    )
}
