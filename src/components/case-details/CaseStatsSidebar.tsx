"use client"

import { Clock, CalendarClock, FileText, MessageSquare, Activity, DollarSign, Hash, Info } from "lucide-react"
import type { Cases } from "@/types/cases"
import { getServiceName } from "@/lib/functions"
import Badge from "@/components/ui/badge/Badge"

interface CaseStatsSidebarProps {
    caseData: Cases
}

export const CaseStatsSidebar = ({ caseData }: CaseStatsSidebarProps) => {
    const createdAt = new Date(caseData.createdAt)
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    const updatedAt = new Date(caseData.updatedAt)
    const diffUpdateMs = now.getTime() - updatedAt.getTime()
    const diffUpdateDays = Math.floor(diffUpdateMs / (1000 * 60 * 60 * 24))
    const diffUpdateHours = Math.floor(diffUpdateMs / (1000 * 60 * 60))

    const lastUpdateLabel =
        diffUpdateDays > 0
            ? `hace ${diffUpdateDays} día${diffUpdateDays > 1 ? "s" : ""}`
            : diffUpdateHours > 0
                ? `hace ${diffUpdateHours} hora${diffUpdateHours > 1 ? "s" : ""}`
                : "hace un momento"

    const totalDocuments = caseData.documents?.length || 0
    const totalNotes = caseData.notes?.length || 0
    const totalMovements = caseData.files?.reduce((acc, file) => acc + (file.fileMovements?.length || 0), 0) || 0

    return (
        <div className="space-y-4">
            {/* Estadísticas del Caso */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <Info className="h-4 w-4 text-gray-400" />
                        <span>Estadísticas del Caso</span>
                    </h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>Duración</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                            {diffDays} día{diffDays !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CalendarClock className="h-4 w-4 text-gray-400" />
                            <span>Última actualización</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{lastUpdateLabel}</span>
                    </div>
                </div>

                {/* Actividad */}
                <div className="px-5 py-4 border-t border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actividad</h4>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span>Documentos</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{totalDocuments}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MessageSquare className="h-4 w-4 text-gray-400" />
                                <span>Comentarios</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{totalNotes}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Activity className="h-4 w-4 text-gray-400" />
                                <span>Movimientos</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{totalMovements}</span>
                        </div>
                    </div>
                </div>

                {/* Finanzas */}
                <div className="px-5 py-4 border-t border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Finanzas</h4>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                <span>Liquidación Pretendida</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                                ${(0).toLocaleString("es-AR")}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Hash className="h-4 w-4 text-gray-400" />
                                <span>Gastos del caso</span>
                            </div>
                            <span className="text-sm font-semibold text-blue-600">{totalMovements}</span>
                        </div>
                    </div>
                </div>

                {/* Estado actual */}
                <div className="px-5 py-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Estado actual</span>
                        <Badge size="md" color={caseData.status === "WON" ? "success" : caseData.status === "LOST" ? "error" : "info"}>
                            {caseData.status === "WON" ? "Ganado" : caseData.status === "LOST" ? "Perdido" : "Nuevo"}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    )
}
