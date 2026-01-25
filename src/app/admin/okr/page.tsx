"use client"

import { useState } from "react"
import { type OKRItem, type OKRArea, AREA_COLORS } from "@/types/okr-types"
import { AreaTabs } from "@/components/okr/area-tabs"
import { OKRTable } from "@/components/okr/okr-table"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card/Card"
import Button from "@/components/ui/button/Button"
import { Bell, Plus } from "lucide-react"

// Datos de ejemplo - esto vendrá del backend
const initialAreas: OKRArea[] = [
    { id: "1", nombre: "Legales", color: AREA_COLORS[0], orden: 1, activo: true },
    { id: "2", nombre: "Marketing", color: AREA_COLORS[1], orden: 2, activo: true },
    { id: "3", nombre: "Desarrollo", color: AREA_COLORS[2], orden: 3, activo: true },
]

const initialItems: OKRItem[] = [
    {
        id: "1",
        areaId: "1",
        unidad: "Legalistas",
        prioridad: "Alta",
        categoria: "Backend",
        objetivo: "Optimizar contratos digitales",
        resultadosClave: "Reducir tiempo de firma en 50%",
        accionesClave: "Implementar firma electrónica",
        responsable: "Jonatan",
        estado: "En Desarrollo",
        gradoAvance: 45,
        fechaObjetivo: new Date("2026-02-15"),
    },
    {
        id: "2",
        areaId: "1",
        unidad: "Lexias",
        prioridad: "Media",
        categoria: "Frontend",
        objetivo: "Portal de clientes",
        resultadosClave: "100% clientes con acceso",
        accionesClave: "Crear dashboard cliente",
        responsable: "Agustin",
        estado: "Para Iniciar",
        gradoAvance: 0,
        fechaObjetivo: new Date("2026-03-01"),
    },
    {
        id: "3",
        areaId: "2",
        unidad: "Generales",
        prioridad: "Alta",
        categoria: "APP",
        objetivo: "Campaña Q1",
        resultadosClave: "10K leads generados",
        accionesClave: "Lanzar ads y landing",
        responsable: "Todos",
        estado: "En Proceso",
        gradoAvance: 60,
        fechaObjetivo: new Date("2026-01-30"),
    },
    {
        id: "4",
        areaId: "3",
        unidad: "Fixer",
        prioridad: "Alta",
        categoria: "Backend",
        objetivo: "API v2",
        resultadosClave: "Migración completa",
        accionesClave: "Refactorizar endpoints",
        responsable: "Jonatan",
        estado: "En Testeo",
        gradoAvance: 80,
        fechaObjetivo: new Date("2026-01-25"),
    },
]

export default function Home() {
    const [areas, setAreas] = useState<OKRArea[]>(initialAreas)
    const [items, setItems] = useState<OKRItem[]>(initialItems)
    const [activeAreaId, setActiveAreaId] = useState<string | null>(null)

    // Filtrar items por área activa
    const filteredItems = activeAreaId ? items.filter((item) => item.areaId === activeAreaId) : items
    const activeArea = activeAreaId ? areas.find((a) => a.id === activeAreaId) || null : null

    // Handlers para áreas
    const handleAddArea = (areaData: Omit<OKRArea, "id" | "orden">) => {
        const newArea: OKRArea = {
            ...areaData,
            id: crypto.randomUUID(),
            orden: areas.length + 1,
        }
        setAreas((prev) => [...prev, newArea])
    }
    const handleUpdateArea = (id: string, data: Partial<OKRArea>) => {
        setAreas((prev) => prev.map((area) => (area.id === id ? { ...area, ...data } : area)))
    }
    const handleDeleteArea = (id: string) => {
        setAreas((prev) => prev.filter((area) => area.id !== id))
        setItems((prev) => prev.filter((item) => item.areaId !== id))
        if (activeAreaId === id) setActiveAreaId(null)
    }
    // Handlers para items
    const handleUpdateItem = (id: string, field: keyof OKRItem, value: unknown) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
    }
    const handleAddItem = () => {
        const newItem: OKRItem = {
            id: crypto.randomUUID(),
            areaId: activeAreaId || areas[0]?.id || "",
            unidad: "Generales",
            prioridad: "Media",
            categoria: "Backend",
            objetivo: "",
            resultadosClave: "",
            accionesClave: "",
            responsable: "Todos",
            estado: "Para Iniciar",
            gradoAvance: 0,
            fechaObjetivo: null,
        }
        setItems((prev) => [...prev, newItem])
    }
    const handleDeleteItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id))
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                    <Bell className="h-6 w-6 inline-block mr-2" />
                    Gestión de Objetivos OKR
                </h2>
                <div className="flex items-center gap-2">
                    {/* <Button onClick={handleRefresh} disabled={loading || !currentUserId} variant="outline" size="sm">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Actualizar
                    </Button> */}
                    <Button onClick={handleAddItem} variant="primary" size="sm">
                        <Plus className="h-4 w-4" />
                        Nuevo Objetivo
                    </Button>
                </div>
            </div>

            {/* New search and filter bar */}
            <div className="flex flex-col gap-6 mb-6">
                <AreaTabs
                    areas={areas}
                    activeAreaId={activeAreaId}
                    onSelectArea={setActiveAreaId}
                    onAddArea={handleAddArea}
                    onUpdateArea={handleUpdateArea}
                    onDeleteArea={handleDeleteArea}
                />
            </div>

            <OKRTable
                items={filteredItems}
                activeArea={activeArea}
                onUpdateItem={handleUpdateItem}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
            />

        </div>

    )
}
