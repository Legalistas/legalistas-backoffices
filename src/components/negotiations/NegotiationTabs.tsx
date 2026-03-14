"use client"

import Button from "@/components/ui/button/Button"
import Badge from "@/components/ui/badge/Badge"
import type { ViewMode } from "@/types/negotiations"

interface NegotiationTabsProps {
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    counts?: {
        iniciar: number
        curso: number
        suspenso: number
        finalizadas: number
        perdidas: number
    }
}

const TABS: { key: ViewMode; label: string; countKey: ViewMode }[] = [
    { key: "iniciar", label: "Iniciar", countKey: "iniciar" },
    { key: "curso", label: "En Curso", countKey: "curso" },
    { key: "suspenso", label: "Suspenso", countKey: "suspenso" },
    { key: "finalizadas", label: "Finalizadas", countKey: "finalizadas" },
    { key: "perdidas", label: "Perdidas", countKey: "perdidas" },
]

export function NegotiationTabs({
    viewMode,
    onViewModeChange,
    counts = { iniciar: 0, curso: 0, suspenso: 0, finalizadas: 0, perdidas: 0 }
}: NegotiationTabsProps) {
    return (
        <div className="flex gap-2 flex-wrap">
            {TABS.map((tab) => (
                <Button
                    key={tab.key}
                    variant={viewMode === tab.key ? "primary" : "outline"}
                    onClick={() => onViewModeChange(tab.key)}
                    size="sm"
                >
                    {tab.label}
                    <Badge variant="light" color="primary" className="ml-2">
                        {counts[tab.countKey]}
                    </Badge>
                </Button>
            ))}
        </div>
    )
}
