"use client"

import { AlertCircle, FileText, PlusCircle } from "lucide-react"
import Button from "@/components/ui/button/Button"

interface EmptyFilesStateProps {
    noFiles: boolean
    fileTypeFilter: number
    onAddNewFile: () => void
    onClearFilter: () => void
}

export const EmptyFilesState = ({ noFiles, fileTypeFilter, onAddNewFile, onClearFilter }: EmptyFilesStateProps) => {
    if (noFiles) {
        return (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
                <FileText className="h-10 w-10 text-gray-500" />
                <h3 className="mt-4 text-lg font-semibold">Sin expedientes</h3>
                <p className="mb-4 mt-2 text-sm text-gray-500">Este caso aún no tiene ningún expediente asociado</p>
                <Button
                    onClick={onAddNewFile}
                    variant="custom"
                    className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-2 px-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    Nuevo expediente
                </Button>
            </div>
        )
    }

    return (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <AlertCircle className="h-10 w-10 text-gray-500" />
            <h3 className="mt-4 text-lg font-semibold">No hay expedientes que coincidan con el filtro</h3>
            <p className="mb-4 mt-2 text-sm text-gray-500">
                No hay expediente del tipo {fileTypeFilter === 1 ? "Administrativo" : "Judicial"} que fueran encontrados.
            </p>
            <Button variant="outline" onClick={onClearFilter}>
                Mostrar todos los expedientes
            </Button>
        </div>
    )
}

