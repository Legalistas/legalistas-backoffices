"use client"

import { AlertCircle, FileText } from "lucide-react"
import Link from "next/link"
import Badge from "@/components/ui/badge/Badge"
import Button from "@/components/ui/button/Button"
import { getServiceName, getStatusColor, getStatusName } from "@/lib/functions"
import type { Cases } from "@/types/cases"

interface CasesCardViewProps {
    cases: Cases[]
    hasActiveFilters: boolean
    handleClearSearch: () => void
}

export const CasesCardView = ({ cases, hasActiveFilters, handleClearSearch }: CasesCardViewProps) => {
    if (cases.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-gray-200 rounded-lg">
                <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay casos disponibles.</h3>
                <p className="text-gray-500 mb-4 text-center">
                    {hasActiveFilters
                        ? "No se encontraron casos que coincidan con los filtros seleccionados."
                        : "No se encontraron casos."}
                </p>
                {hasActiveFilters && (
                    <Button variant="outline" onClick={handleClearSearch} className="mb-4">
                        Limpiar filtros
                    </Button>
                )}
            </div>
        )
    }

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((caso) => (
                <Link key={caso.id} href={`/admin/legal-cases/${caso.id}`}>
                    <div className="h-full rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
                        <div className="border-b border-gray-200 p-4">
                            <div className="flex items-start justify-between">
                                <h3 className="text-lg font-medium">{caso.title}</h3>
                                <Badge size="sm">{getServiceName(Number(caso.servicesId))}</Badge>
                            </div>
                            <p className="text-sm text-gray-500">Case #{caso.number}</p>
                        </div>
                        <div className="p-4">
                            <div className="mb-2">
                                <Badge size="sm" color={getStatusColor(caso?.stageId ?? "-")}>
                                    {getStatusName(caso?.stageId ?? "-")}
                                </Badge>
                            </div>
                        </div>
                        <div className="border-t border-gray-200 p-4">
                            <div className="flex items-center text-sm text-gray-500">
                                <FileText className="mr-1 h-4 w-4" />
                                Created: {new Date(caso.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}

