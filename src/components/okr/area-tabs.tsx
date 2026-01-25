"use client"

import { useState } from "react"
import { Plus, X, Pencil, Check } from "lucide-react"
import { type OKRArea, AREA_COLORS } from "@/types/okr-types"
import Button from "@/components/ui/button/Button"
import Input from "@/components/ui/input/Input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface AreaTabsProps {
    areas: OKRArea[]
    activeAreaId: string | null
    onSelectArea: (areaId: string | null) => void
    onAddArea: (area: Omit<OKRArea, "id" | "orden">) => void
    onUpdateArea: (id: string, data: Partial<OKRArea>) => void
    onDeleteArea: (id: string) => void
}

export function AreaTabs({ areas, activeAreaId, onSelectArea, onAddArea, onUpdateArea, onDeleteArea }: AreaTabsProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [newAreaName, setNewAreaName] = useState("")
    const [newAreaColor, setNewAreaColor] = useState(AREA_COLORS[0])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("")

    const handleAddArea = () => {
        if (newAreaName.trim()) {
            onAddArea({
                nombre: newAreaName.trim(),
                color: newAreaColor,
                activo: true,
            })
            setNewAreaName("")
            setNewAreaColor(AREA_COLORS[0])
            setIsAddDialogOpen(false)
        }
    }

    const startEditing = (area: OKRArea) => {
        setEditingId(area.id)
        setEditingName(area.nombre)
    }

    const saveEditing = () => {
        if (editingId && editingName.trim()) {
            onUpdateArea(editingId, { nombre: editingName.trim() })
        }
        setEditingId(null)
        setEditingName("")
    }

    return (
        <div className="relative flex items-center gap-2 px-3 py-2 overflow-x-auto flex-nowrap">
            {/* Tab "Todas" */}
            <button
                onClick={() => onSelectArea(null)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ring-1 ring-border bg-muted hover:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-[#09A4B5]",
                    activeAreaId === null
                        ? "bg-[#09A4B5] text-white ring-[#09A4B5] shadow-md"
                        : "text-foreground"
                )}
                aria-pressed={activeAreaId === null}
                title="Ver todas las áreas"
            >
                Todas las Áreas
            </button>

            {/* Tabs de áreas */}
            {areas.map((area) => (
                <div
                    key={area.id}
                    onClick={() => onSelectArea(area.id)}
                    className={cn(
                        "group cursor-pointer flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ring-1",
                        activeAreaId === area.id
                            ? "bg-[#09A4B5] text-white ring-[#09A4B5] shadow-md"
                            : "text-foreground bg-muted ring-border hover:bg-muted/70"
                    )}
                    title={`Área: ${area.nombre}`}
                >
                    <div
                        className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0 mr-1 ring-2",
                            activeAreaId === area.id ? "ring-white/80" : "ring-background"
                        )}
                        style={{ backgroundColor: area.color }}
                    />

                    {editingId === area.id ? (
                        <div className="flex items-center gap-1">
                            <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-7 w-28 text-xs"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditing()
                                    if (e.key === "Escape") {
                                        setEditingId(null)
                                        setEditingName("")
                                    }
                                }}
                            />
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { saveEditing() }} title="Guardar">
                                <Check className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setEditingId(null); setEditingName("") }} title="Cancelar">
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <span className="select-none">{area.nombre}</span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        startEditing(area)
                                    }}
                                    title="Renombrar área"
                                >
                                    <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                        onDeleteArea(area.id);
                                    }}
                                    title="Eliminar área"
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            ))}

            {/* Botón agregar área */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-auto shrink-0 gap-1.5">
                        <Plus className="h-4 w-4" />
                        Nueva Área
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Crear Nueva Área</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre del Área</label>
                            <Input
                                value={newAreaName}
                                onChange={(e) => setNewAreaName(e.target.value)}
                                placeholder="Ej: Marketing, Ventas, Desarrollo..."
                                onKeyDown={(e) => e.key === "Enter" && handleAddArea()}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Color</label>
                            <div className="flex gap-2 flex-wrap">
                                {AREA_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setNewAreaColor(color)}
                                        className={cn(
                                            "w-8 h-8 rounded-full transition-all",
                                            newAreaColor === color
                                                ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                                                : "hover:scale-105",
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleAddArea} disabled={!newAreaName.trim()}>
                            Crear Área
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
