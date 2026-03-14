"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { NegotiationsTable } from "@/components/negotiations/NegotiationsTable"
import { NegotiationHeader } from "@/components/negotiations/NegotiationHeader"
import { NegotiationTabs } from "@/components/negotiations/NegotiationTabs"
import { NEGOTIATIONS_COUNT_ENDPOINT } from "@/constant/api-endpoints"
import type { ViewMode } from "@/types/negotiations"
import type { ColumnConfig } from "@/components/negotiations/ColumnSelector"
import { useRolePermissions } from "@/hooks/useRolePermissions"

export default function NegotiationPage() {
    const { data: session } = useSession()
    const permissions = useRolePermissions()
    const [viewMode, setViewMode] = useState<ViewMode>("curso")
    const [counts, setCounts] = useState({
        iniciar: 0,
        curso: 0,
        suspenso: 0,
        finalizadas: 0,
        perdidas: 0,
    })
    const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([])

    const initialColumnConfig = useMemo(() => [
        { id: 'causa', label: 'Causa', visible: true, required: true },
        { id: 'abogadoRepresentante', label: 'Abogado Representante', visible: true },
        { id: 'abogadoInterno', label: 'Abogado Interno', visible: true },
        { id: 'abogadoContraparte', label: 'Abogado Contraparte', visible: true },
        { id: 'lesion', label: 'Lesión', visible: true },
        { id: 'incLegalistas', label: '% Legalistas', visible: true },
        { id: 'deArt', label: '% PMO', visible: true },
        { id: 'liquidacion100', label: 'Liquidación 100%', visible: true },
        { id: 'liquidacion80', label: 'Liquidación 80%', visible: true },
        { id: 'ultimaOferta', label: 'Última Oferta', visible: true },
    ], [])

    useEffect(() => {
        if (columnConfig.length === 0) {
            setColumnConfig(initialColumnConfig)
        }
    }, [initialColumnConfig, columnConfig.length])

    // Fetch counts
    const fetchCounts = useCallback(async () => {
        if (!session?.user?.accessToken) return

        try {
            const params = new URLSearchParams()
            if (permissions.isLawyer) {
                const userId = permissions.getUserId()
                if (userId) params.append('lawyerId', userId.toString())
            }

            const url = params.toString()
                ? `${NEGOTIATIONS_COUNT_ENDPOINT}?${params.toString()}`
                : NEGOTIATIONS_COUNT_ENDPOINT

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.user.accessToken}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setCounts(data.data)
            }
        } catch (err) {
            console.error("Error fetching counts:", err)
        }
    }, [session?.user?.accessToken, permissions.isLawyer])

    useEffect(() => {
        fetchCounts()
    }, [fetchCounts])

    const handleColumnChange = useCallback((newColumns: ColumnConfig[]) => {
        setColumnConfig(newColumns)
    }, [])

    return (
        <div>
            <div className="flex flex-col gap-6 mb-2">
                <NegotiationHeader
                    columnConfig={initialColumnConfig}
                    onColumnChange={handleColumnChange}
                />
                <NegotiationTabs
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    counts={counts}
                />

                <NegotiationsTable
                    viewMode={viewMode}
                    columnConfig={columnConfig}
                    onColumnChange={handleColumnChange}
                    onDataChange={fetchCounts}
                />
            </div>
        </div>
    )
}
