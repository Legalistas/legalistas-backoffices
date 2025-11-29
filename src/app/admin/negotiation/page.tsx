"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { NegotiationsTable } from "@/components/negotiations/NegotiationsTable"
import { NegotiationHeader } from "@/components/negotiations/NegotiationHeader"
import { NegotiationTabs } from "@/components/negotiations/NegotiationTabs"
import { NEGOTIATIONS_COUNT_ENDPOINT } from "@/constant/api-endpoints"
import type { ViewMode } from "@/types/negotiations"
import type { ColumnConfig } from "@/components/negotiations/ColumnSelector"

export default function NegotiationPage() {
    const { data: session } = useSession()
    const [viewMode, setViewMode] = useState<ViewMode>("en-curso")
    const [counts, setCounts] = useState({ esperando: 0, enCurso: 0, finalizadas: 0 })
    const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([])
    
    // Memoizar la configuración inicial de columnas para que no cambie en cada render
    const initialColumnConfig = useMemo(() => [
        { id: 'causa', label: 'Causa', visible: true, required: true },
        { id: 'abogadoInterno', label: 'Abogado Legalistas', visible: true },
        { id: 'abogadoContraparte', label: 'Abogado Contraparte', visible: true },
        { id: 'lesion', label: 'Lesión', visible: true },
        { id: 'incLegalistas', label: '% Inc Legalistas', visible: true },
        { id: 'deArt', label: '% De ART', visible: true },
        { id: 'liquidacion100', label: 'Liquidación Legalistas - 100%', visible: true },
        { id: 'liquidacion80', label: 'Liquidación 80%', visible: true },
        { id: 'ultimaOferta', label: 'Última Oferta Aceptada', visible: true },
    ], [])

    // Inicializar columnConfig solo una vez
    useEffect(() => {
        if (columnConfig.length === 0) {
            setColumnConfig(initialColumnConfig)
        }
    }, [initialColumnConfig, columnConfig.length])

    // Fetch counts
    useEffect(() => {
        const fetchCounts = async () => {
            if (!session?.user?.accessToken) return

            try {
                const response = await fetch(NEGOTIATIONS_COUNT_ENDPOINT, {
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
        }

        fetchCounts()
    }, [session])

    // Memoizar la función de cambio de columnas para evitar re-renders
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
                />
            </div>
        </div>
    )
}