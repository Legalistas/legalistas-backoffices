"use client"

import { NotepadText, Plus } from "lucide-react"
import Button from "@/components/ui/button/Button"

interface EmptyNotesStateProps {
    onAddNewNote: () => void
}

export const EmptyNotesState = ({ onAddNewNote }: EmptyNotesStateProps) => {
    return (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <NotepadText className="h-10 w-10 text-gray-500" />
            <h3 className="mb-2 text-lg font-medium">No hay notas</h3>
            <p className="mb-4 mt-2 text-sm text-gray-500">
                No hay notas asociadas a este caso. Crea una nueva nota para comenzar a documentar información importante.
            </p>
            <Button onClick={onAddNewNote} variant="custom"
                className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-2 px-2">
                <Plus className="h-4 w-4" />
                Nueva Nota
            </Button>
        </div>
    )
}
