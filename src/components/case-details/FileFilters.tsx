"use client"

import { LayoutGrid, List, PlusCircle } from "lucide-react"
import Button from "@/components/ui/button/Button"
import { fileFilterOptions } from "@/lib/constant"

interface FileFiltersProps {
    fileTypeFilter: number
    viewMode: "card" | "list"
    isFilterSelectOpen: boolean
    onFilterChange: (value: number) => void
    onViewModeChange: (mode: "card" | "list") => void
    onToggleFilterSelect: () => void
    onAddNewFile: () => void
}

export const FileFilters = ({
    fileTypeFilter,
    viewMode,
    isFilterSelectOpen,
    onFilterChange,
    onViewModeChange,
    onToggleFilterSelect,
    onAddNewFile,
}: FileFiltersProps) => {
    return (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-end mb-4">
            <div className="flex items-center space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewModeChange(viewMode === "list" ? "card" : "list")}
                    className="flex items-center gap-2"
                >
                    {viewMode === "list" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative w-[180px]">
                    <button
                        onClick={onToggleFilterSelect}
                        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <span>{fileTypeFilter === 0 ? "Todos" : fileTypeFilter === 1 ? "Administrativo" : "Judicial"}</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>

                    {isFilterSelectOpen && (
                        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                            {fileFilterOptions.map((option) => (
                                <div
                                    key={option.id}
                                    className="cursor-pointer px-3 py-1.5 text-sm hover:bg-gray-100"
                                    onClick={() => {
                                        onFilterChange(option.value)
                                    }}
                                >
                                    {option.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Button
                    onClick={onAddNewFile}
                    variant="custom"
                    className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-2 px-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    Nuevo expediente
                </Button>
            </div>
        </div>
    )
}

