"use client"

import Button from "@/components/ui/button/Button"
import { Plus, Download } from "lucide-react"
import { RoleIndicator } from "./RoleIndicator"
import { ColumnSelector, type ColumnConfig } from "./ColumnSelector"

interface NegotiationHeaderProps {
  columnConfig?: ColumnConfig[]
  onColumnChange?: (columns: ColumnConfig[]) => void
}

export function NegotiationHeader({ columnConfig = [], onColumnChange }: NegotiationHeaderProps) {

    const handleRedirectNewNegotiation = () => {
        window.location.href = '/admin/negotiation/new';
    }

    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Sistema de Negociaciones</h1>
                    <p className="text-sm text-muted-foreground">Gestión de pujas entre Legalistas y ART</p>
                </div>
                <RoleIndicator />
            </div>
            <div className="flex items-center gap-2">
                {columnConfig.length > 0 && onColumnChange && (
                    <ColumnSelector
                        columns={columnConfig}
                        onColumnsChange={onColumnChange}
                        storageKey="negotiations-columns"
                    />
                )}
                <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                </Button>
                <Button size="sm" onClick={() => handleRedirectNewNegotiation()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva negociación
                </Button>
            </div>
        </div>
    )
}
