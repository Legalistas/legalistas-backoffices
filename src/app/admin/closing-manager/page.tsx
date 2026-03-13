"use client"

import { useState, useEffect, useCallback } from "react"
import ClosingManagerTable from "@/components/closing-manager/closing-manager-table"
import ClosingFilters, { type ClosingFiltersState } from "@/components/closing-manager/ClosingFilters"
import { CLOSINGS_ENDPOINT, CLOSINGS_COUNT_ENDPOINT } from "@/constant/api-endpoints"
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions"
import type { ClosingManagerApiResponse, ClosingManagerEntry, Pagination } from "@/types/closing-manager"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlusCircle, Terminal, TrendingUp, DollarSign, CheckCircle2, Clock } from "lucide-react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Button from "@/components/ui/button/Button"

const allColumns = ["date", "case", "lawyer", "type", "capitalAmount", "capitalState", "hpAgreed", "hpTotal", "aportes", "sepblac", "hpLegalistas", "feeStatus", "pclAgreed", "pclAmount", "pcl25", "pclTotal", "pclStatus", "litigation", "intimation"]

export default function ClosingManagerPage() {
    const { data: session } = useSession()
    const permissions = useRolePermissions()
    const [closings, setClosings] = useState<ClosingManagerEntry[]>([])
    const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 1 })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<ClosingFiltersState>({
        search: "",
        type: "",
        capitalState: "",
        feeStatus: "",
        pclStatus: "",
    })
    const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumns)
    const [counts, setCounts] = useState({ total: 0, cobrados: 0, pendientes: 0, solicitados: 0 })

    const fetchClosings = useCallback(
        async (page: number) => {
            setLoading(true)
            setError(null)
            try {
                const additionalParams: Record<string, string> = {
                    page: page.toString(),
                    limit: pagination.limit.toString(),
                }

                if (filters.search) additionalParams.search = filters.search
                if (filters.type) additionalParams.type = filters.type
                if (filters.capitalState) additionalParams.capitalState = filters.capitalState
                if (filters.feeStatus) additionalParams.feeStatus = filters.feeStatus
                if (filters.pclStatus) additionalParams.pclStatus = filters.pclStatus

                const url = buildFilteredUrl(CLOSINGS_ENDPOINT, permissions, additionalParams)

                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })

                if (!response.ok) {
                    throw new Error(`Error al cargar los datos: ${response.statusText}`)
                }

                const data: ClosingManagerApiResponse = await response.json()
                setClosings(data.data)
                setPagination(data.meta)
            } catch (err) {
                console.error("Error fetching closing manager data:", err)
                setError(
                    "No se pudieron cargar los datos de cierres. Por favor, asegúrate de que la API esté funcionando.",
                )
            } finally {
                setLoading(false)
            }
        },
        [pagination.limit, filters, session?.user?.accessToken, permissions],
    )

    // Fetch counts
    useEffect(() => {
        const fetchCounts = async () => {
            if (!session?.user?.accessToken) return
            try {
                const url = buildFilteredUrl(CLOSINGS_COUNT_ENDPOINT, permissions)
                const response = await fetch(url, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session.user.accessToken}`,
                    },
                })
                if (response.ok) {
                    const data = await response.json()
                    setCounts({
                        total: data.total || 0,
                        cobrados: data.cobrados || 0,
                        pendientes: data.pendientes || 0,
                        solicitados: data.solicitados || 0,
                    })
                }
            } catch {
                // Silent fail for counts
            }
        }
        fetchCounts()
    }, [session, permissions])

    useEffect(() => {
        fetchClosings(pagination.page)
    }, [fetchClosings, pagination.page])

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination((prev: Pagination) => ({ ...prev, page: newPage }))
        }
    }

    const handleFiltersChange = (newFilters: ClosingFiltersState) => {
        setFilters(newFilters)
        setPagination((prev: Pagination) => ({ ...prev, page: 1 }))
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestor de Cierres</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Administra y gestiona los cierres de causas</p>
                </div>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cierres</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{counts.total || pagination.total}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-brand-500" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cobrados</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{counts.cobrados}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pendientes</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{counts.pendientes}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitados</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{counts.solicitados}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <ClosingFilters
                filters={filters}
                onFiltersChange={handleFiltersChange}
                visibleColumns={visibleColumns}
                onColumnsChange={setVisibleColumns}
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
                        onRefresh={() => fetchClosings(pagination.page)}
                        visibleColumns={visibleColumns}
                    />
                )}
            </div>
        </div>
    )
}
