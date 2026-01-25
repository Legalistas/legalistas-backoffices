"use client"

import { Trash2 } from "lucide-react"
import {
    type OKRItem,
    type Unidad,
    type Prioridad,
    type Estado,
    UNIDADES,
    PRIORIDADES,
    CATEGORIAS,
    RESPONSABLES,
    ESTADOS,
} from "@/types/okr-types"
import { SelectDropdown } from "./select-dropdown"
import { ProgressBar } from "./progress-bar"
import { DatePickerCell } from "./date-picker-cell"
import { DaysCounter } from "./days-counter"
import Button from "@/components/ui/button/Button"
import Input from "@/components/ui/input/Input"
import { TableRow, TableCell } from "../ui/table"

interface OKRTableRowProps {
    item: OKRItem
    showUnidad: boolean
    rowSpan: number
    onUpdate: (id: string, field: keyof OKRItem, value: unknown) => void
    onDelete: (id: string) => void
}

const prioridadColors: Record<Prioridad, string> = {
    Baja: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Media: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Alta: "bg-red-500/20 text-red-400 border-red-500/30",
}

const estadoColors: Record<Estado, string> = {
    "Para Iniciar": "bg-slate-500/20 text-slate-400 border-slate-500/30",
    "En Desarrollo": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "En Proceso": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "En Testeo": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Finalizada: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "No Alcanzada": "bg-red-500/20 text-red-400 border-red-500/30",
}

const unidadColors: Record<Unidad, string> = {
    Legalistas: "text-teal-400",
    Lexias: "text-blue-400",
    Fixer: "text-orange-400",
    Brixar: "text-pink-400",
    Anderregen: "text-purple-400",
    Generales: "text-foreground",
}

export function OKRTableRow({ item, showUnidad, rowSpan, onUpdate, onDelete }: OKRTableRowProps) {
    return (
        <TableRow key={item.id} className="group border-b border-border bg-card hover:bg-secondary/50 transition-colors">
            {showUnidad && (
                <TableCell
                    rowSpan={rowSpan}
                    className={`border-r border-border px-3 py-2 font-medium ${unidadColors[item.unidad]} align-top bg-card/80`}
                >
                    <SelectDropdown
                        value={item.unidad}
                        options={UNIDADES}
                        onChange={(v) => onUpdate(item.id, "unidad", v)}
                        className="bg-transparent border-none font-semibold"
                    />
                </TableCell>
            )}
            <TableCell className="border-r border-border px-2 py-1.5">
                <SelectDropdown
                    value={item.prioridad}
                    options={PRIORIDADES}
                    onChange={(v) => onUpdate(item.id, "prioridad", v)}
                    badgeClassName={prioridadColors[item.prioridad]}
                />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <SelectDropdown
                    value={item.categoria}
                    options={CATEGORIAS}
                    onChange={(v) => onUpdate(item.id, "categoria", v)}
                />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <Input
                    value={item.objetivo}
                    onChange={(e) => onUpdate(item.id, "objetivo", e.target.value)}
                    placeholder="Objetivo..."
                    className="h-8 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary text-sm"
                />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <Input
                    value={item.resultadosClave}
                    onChange={(e) => onUpdate(item.id, "resultadosClave", e.target.value)}
                    placeholder="Resultados clave..."
                    className="h-8 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary text-sm"
                />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <Input
                    value={item.accionesClave}
                    onChange={(e) => onUpdate(item.id, "accionesClave", e.target.value)}
                    placeholder="Acciones clave..."
                    className="h-8 bg-transparent border-none focus-visible:ring-1 focus-visible:ring-primary text-sm"
                />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <SelectDropdown
                    value={item.responsable}
                    options={RESPONSABLES}
                    onChange={(v) => onUpdate(item.id, "responsable", v)}
                />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <SelectDropdown
                    value={item.estado}
                    options={ESTADOS}
                    onChange={(v) => onUpdate(item.id, "estado", v)}
                    badgeClassName={estadoColors[item.estado]}
                />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <ProgressBar value={item.gradoAvance} onChange={(v) => onUpdate(item.id, "gradoAvance", v)} />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5">
                <DatePickerCell date={item.fechaObjetivo} onChange={(d) => onUpdate(item.id, "fechaObjetivo", d)} />
            </TableCell>
            <TableCell className="border-r border-border px-2 py-1.5 text-center">
                <DaysCounter targetDate={item.fechaObjetivo} />
            </TableCell>
            <TableCell className="px-2 py-1.5 text-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(item.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TableCell>
        </TableRow>
    )
}
