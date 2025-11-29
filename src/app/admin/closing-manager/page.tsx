"use client"

import { useState, useEffect, useCallback } from "react"
import ClosingManagerTable from "@/components/closing-manager/closing-manager-table"
import ClosingFilters, { type ClosingFiltersState } from "@/components/closing-manager/ClosingFilters"
import { CLOSINGS_ENDPOINT } from "@/constant/api-endpoints"
import { useRolePermissions, buildFilteredUrl } from "@/hooks/useRolePermissions"
import type { ClosingManagerApiResponse, ClosingManagerEntry, Pagination } from "@/types/closing-manager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card/Card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, PlusCircle, Terminal } from "lucide-react"
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

    const fetchClosings = useCallback(
        async (page: number) => {
            setLoading(true)
            setError(null)
            try {
                // Build query params with filters
                const additionalParams: Record<string, string> = {
                    page: page.toString(),
                    limit: pagination.limit.toString(),
                }

                if (filters.search) additionalParams.search = filters.search
                if (filters.type) additionalParams.type = filters.type
                if (filters.capitalState) additionalParams.capitalState = filters.capitalState
                if (filters.feeStatus) additionalParams.feeStatus = filters.feeStatus
                if (filters.pclStatus) additionalParams.pclStatus = filters.pclStatus

                // Use buildFilteredUrl to apply role-based filtering
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
                    "No se pudieron cargar los datos de cierres. Por favor, asegúrate de que la API esté funcionando en http://localhost:5000.",
                )
            } finally {
                setLoading(false)
            }
        },
        [pagination.limit, filters, session?.user?.accessToken, permissions],
    )

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
        setPagination((prev: Pagination) => ({ ...prev, page: 1 })) // Reset to page 1 when filters change
    }

    return (
        <div>
            <div className="flex flex-col gap-6 mb-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-tight">Gestor de Cierres</h1>
                    <Link href="/admin/closing-manager/create">
                        <Button
                            variant="custom"
                            size="sm"
                            className="flex items-center gap-2 bg-[#09A4B5] text-white hover:bg-[#09A4B5]/80 hover:text-gray-dark p-2"
                        >
                            <PlusCircle className="h-4 w-4" />
                            Nuevo Cierre
                        </Button>
                    </Link>
                </div>

                {/* Filtros */}
                <ClosingFilters
                    filters={filters}
                    onFiltersChange={handleFiltersChange}
                    visibleColumns={visibleColumns}
                    onColumnsChange={setVisibleColumns}
                />

                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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