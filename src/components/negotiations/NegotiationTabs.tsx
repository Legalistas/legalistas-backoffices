"use client"

import Button from "@/components/ui/button/Button"
import Badge from "@/components/ui/badge/Badge"
import type { ViewMode } from "@/types/negotiations"

interface NegotiationTabsProps {
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    counts?: {
        esperando: number
        enCurso: number
        finalizadas: number
    }
}

export function NegotiationTabs({ 
    viewMode, 
    onViewModeChange,
    counts = { esperando: 0, enCurso: 0, finalizadas: 0 }
}: NegotiationTabsProps) {
    return (
        <div className="flex gap-2">
            <Button
                variant={viewMode === "esperando" ? "primary" : "outline"}
                onClick={() => onViewModeChange("esperando")}
                size="sm"
            >
                Esperando %
                <Badge variant="light" color="primary" className="ml-2">
                    {counts.esperando}
                </Badge>
            </Button>
            <Button
                variant={viewMode === "en-curso" ? "primary" : "outline"}
                onClick={() => onViewModeChange("en-curso")}
                size="sm"
            >
                En Curso
                <Badge variant="light" color="primary" className="ml-2">
                    {counts.enCurso}
                </Badge>
            </Button>
            <Button
                variant={viewMode === "finalizadas" ? "primary" : "outline"}
                onClick={() => onViewModeChange("finalizadas")}
                size="sm"
            >
                Finalizadas
                <Badge variant="light" color="primary" className="ml-2">
                    {counts.finalizadas}
                </Badge>
            </Button>
        </div>
    )
}
