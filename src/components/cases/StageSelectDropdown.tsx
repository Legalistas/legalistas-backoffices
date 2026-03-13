"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, FileText, Briefcase, Scale, Heart, Flag, Star, Archive, Check } from "lucide-react"
import { createPortal } from "react-dom"
import { stageCases } from "@/lib/constant"

interface StageSelectDropdownProps {
    currentStageId: number
    onStageChange: (newStageId: number) => void
}

const stageConfig: Record<number, { bg: string; color: string; hoverBg: string; icon: typeof FileText }> = {
    1: { bg: "#e0f2fe", color: "#0284c7", hoverBg: "#bae6fd", icon: FileText },
    2: { bg: "#fef3c7", color: "#d97706", hoverBg: "#fde68a", icon: Briefcase },
    3: { bg: "#fee2e2", color: "#dc2626", hoverBg: "#fecaca", icon: Scale },
    4: { bg: "#ede9fe", color: "#7c3aed", hoverBg: "#ddd6fe", icon: Heart },
    5: { bg: "#dbeafe", color: "#2563eb", hoverBg: "#bfdbfe", icon: Flag },
    6: { bg: "#d1fae5", color: "#059669", hoverBg: "#a7f3d0", icon: Star },
    7: { bg: "#f3f4f6", color: "#4b5563", hoverBg: "#e5e7eb", icon: Archive },
}

const defaultConfig = { bg: "#f3f4f6", color: "#4b5563", hoverBg: "#e5e7eb", icon: FileText }

export function StageSelectDropdown({ currentStageId, onStageChange }: StageSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

    const currentStage = stageCases.find((s) => s.value === currentStageId)
    const currentLabel = currentStage?.label ?? "Desconocido"
    const config = stageConfig[currentStageId] ?? defaultConfig
    const CurrentIcon = config.icon

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 6,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 180),
            })
        }
    }, [isOpen])

    // No cerrar en scroll para mejor UX

    const dropdown =
        isOpen && mounted
            ? createPortal(
                <>
                    <div className="fixed inset-0 z-9998" onClick={() => setIsOpen(false)} />
                    <div
                        className="fixed z-9999 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 overflow-auto"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            minWidth: dropdownPosition.width,
                        }}
                    >
                        {stageCases.map((stage) => {
                            const sc = stageConfig[stage.value] ?? defaultConfig
                            const Icon = sc.icon
                            const isSelected = stage.value === currentStageId
                            return (
                                <button
                                    key={stage.value}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (!isSelected) {
                                            onStageChange(stage.value)
                                        }
                                        setIsOpen(false)
                                    }}
                                    className={`w-full px-2.5 py-1.5 text-left text-xs transition-colors flex items-center gap-2 ${
                                        isSelected 
                                            ? "bg-gray-50 dark:bg-gray-700/50" 
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: sc.color }} />
                                    <span
                                        className={`flex-1 ${isSelected ? "font-semibold" : "font-medium"}`}
                                        style={{ color: sc.color }}
                                    >
                                        {stage.label}
                                    </span>
                                    {isSelected && (
                                        <Check className="h-3 w-3" style={{ color: sc.color }} />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </>,
                document.body,
            )
            : null

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all hover:shadow-md border"
                style={{ 
                    backgroundColor: config.bg, 
                    color: config.color,
                    borderColor: config.color + "40"
                }}
            >
                <CurrentIcon className="h-3.5 w-3.5" />
                <span>{currentLabel}</span>
                <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {dropdown}
        </div>
    )
}
