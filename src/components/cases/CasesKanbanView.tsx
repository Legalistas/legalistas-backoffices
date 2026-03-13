"use client"

import { useCallback } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { useRouter } from "next/navigation"
import {
    FileText,
    Briefcase,
    Scale,
    Heart,
    Flag,
    Star,
    Archive,
    User,
    Calendar,
    Clock,
    Trophy,
    XCircle,
} from "lucide-react"
import { stageCases } from "@/lib/constant"
import { getServiceName } from "@/lib/functions"
import { GroupAvatar } from "@/components/ui/avatar/GroupAvatar"
import type { Cases } from "@/types/cases"

interface CasesKanbanViewProps {
    cases: Cases[]
    onStageChange: (caseId: number, newStageId: number) => void
    onResultChange?: (caseId: number, newResult: string) => void
}

const stageConfig: Record<number, { bg: string; color: string; borderColor: string; icon: typeof FileText }> = {
    1: { bg: "bg-sky-50", color: "text-sky-700", borderColor: "border-sky-200", icon: FileText },
    2: { bg: "bg-amber-50", color: "text-amber-700", borderColor: "border-amber-200", icon: Briefcase },
    3: { bg: "bg-red-50", color: "text-red-700", borderColor: "border-red-200", icon: Scale },
    4: { bg: "bg-violet-50", color: "text-violet-700", borderColor: "border-violet-200", icon: Heart },
    5: { bg: "bg-blue-50", color: "text-blue-700", borderColor: "border-blue-200", icon: Flag },
    6: { bg: "bg-emerald-50", color: "text-emerald-700", borderColor: "border-emerald-200", icon: Star },
    7: { bg: "bg-gray-50", color: "text-gray-600", borderColor: "border-gray-200", icon: Archive },
}

const resultConfig: Record<string, { bg: string; icon: typeof Clock }> = {
    IN_PROGRESS: { bg: "bg-amber-100 text-amber-700", icon: Clock },
    WON: { bg: "bg-emerald-100 text-emerald-700", icon: Trophy },
    LOST: { bg: "bg-red-100 text-red-700", icon: XCircle },
}

const defaultConfig = { bg: "bg-gray-50", color: "text-gray-600", borderColor: "border-gray-200", icon: FileText }

function formatDate(date: Date | string | undefined): string {
    if (!date) return "-"
    const d = new Date(date)
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
}

export function CasesKanbanView({ cases, onStageChange, onResultChange }: CasesKanbanViewProps) {
    const router = useRouter()

    const handleDragEnd = useCallback(
        (result: DropResult) => {
            const { destination, source, draggableId } = result

            if (!destination) return

            if (destination.droppableId === source.droppableId && destination.index === source.index) {
                return
            }

            const newStageId = Number.parseInt(destination.droppableId, 10)
            const caseId = Number.parseInt(draggableId, 10)

            onStageChange(caseId, newStageId)
        },
        [onStageChange]
    )

    const handleCardClick = (caseId: number) => {
        router.push(`/admin/legal-cases/${caseId}`)
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="relative flex-1 overflow-hidden">
                {/* Scrollable container */}
                <div
                    className="flex gap-4 pb-4 overflow-x-auto scrollbar-hide h-[calc(100vh-280px)]"
                >
                    {stageCases.map((stage) => {
                        const config = stageConfig[stage.value] ?? defaultConfig
                        const Icon = config.icon
                        const stageCasesList = cases.filter((c) => c.stageId === stage.value)

                        return (
                            <div
                                key={stage.id}
                                className="bg-white dark:bg-gray-800/30 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full w-75 shrink-0 flex flex-col"
                            >
                                {/* Column header */}
                                <div className={`p-3 border-b ${config.borderColor} dark:border-gray-700`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-md ${config.bg}`}>
                                                <Icon className={`h-4 w-4 ${config.color}`} />
                                            </div>
                                            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                                                {stage.label}
                                            </h3>
                                        </div>
                                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                            {stageCasesList.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Droppable area */}
                                <Droppable droppableId={stage.value.toString()}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors ${
                                                snapshot.isDraggingOver ? "bg-gray-50 dark:bg-gray-700/20" : ""
                                            }`}
                                        >
                                            {stageCasesList.map((caseItem, index) => (
                                                <Draggable
                                                    key={caseItem.id.toString()}
                                                    draggableId={caseItem.id.toString()}
                                                    index={index}
                                                >
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => handleCardClick(caseItem.id)}
                                                            className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer transition-all hover:shadow-md h-40 flex flex-col overflow-hidden ${
                                                                snapshot.isDragging
                                                                    ? "shadow-lg ring-2 ring-primary/20"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {/* Case number & Result */}
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-semibold text-primary">
                                                                    #{caseItem.number || caseItem.id}
                                                                </span>
                                                                {caseItem.status && (
                                                                    <span
                                                                        className={`text-xs px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                                                                            resultConfig[caseItem.status]?.bg ??
                                                                            "bg-gray-100 text-gray-700"
                                                                        }`}
                                                                    >
                                                                        {(() => {
                                                                            const ResultIcon =
                                                                                resultConfig[caseItem.status]?.icon ??
                                                                                Clock
                                                                            return <ResultIcon className="h-3 w-3" />
                                                                        })()}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Title */}
                                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                                                                {caseItem.title || "Sin título"}
                                                            </h4>

                                                            {/* Service & Client */}
                                                            <div className="flex-1 min-h-0">
                                                                {caseItem.servicesId && (
                                                                    <div className="mb-1">
                                                                        <span className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                                                            {getServiceName(caseItem.servicesId)}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                {caseItem.customer && (
                                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                                        <User className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">
                                                                            {caseItem.customer.name}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Footer: Lawyer & Date */}
                                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
                                                                {(() => {
                                                                    const lawyers = [
                                                                        caseItem.responsibleLawyer,
                                                                        caseItem.internalLawyer,
                                                                    ].filter(Boolean) as { name: string; image: string }[]
                                                                    return lawyers.length > 0 ? (
                                                                        <GroupAvatar users={lawyers} size="xs" />
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400">-</span>
                                                                    )
                                                                })()}
                                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                    <Calendar className="h-3 w-3" />
                                                                    <span>{formatDate(caseItem.createdAt)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}

                                            {/* Empty state */}
                                            {stageCasesList.length === 0 && (
                                                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                                    <Icon className="h-8 w-8 mb-2 opacity-50" />
                                                    <p className="text-xs">Sin casos</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        )
                    })}
                </div>
            </div>
        </DragDropContext>
    )
}
