"use client"

import { useState } from "react"
import {
  User,
  Trash2,
  Edit3,
  FileText,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Type,
  Link,
  Undo,
  Redo,
  ImageIcon,
} from "lucide-react"
import type { CasesNotes } from "@/types/cases"
import { CreateNoteForm } from "./CreateNoteForm"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { CASES_NOTES_DELETE_ENDPOINT } from "@/constant/api-endpoints"

interface NotesViewProps {
  notes: CasesNotes[]
  caseId: string
  onNoteCreated: () => void
  onNoteDeleted?: (noteId: number) => void
}

export const NotesView = ({ notes, caseId, onNoteCreated, onNoteDeleted }: NotesViewProps) => {
  const { data: session } = useSession()
  const [isCreating, setIsCreating] = useState(true) // Always show the editor
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null)
  const [noteContent, setNoteContent] = useState("")

  const handleNoteCreated = () => {
    setNoteContent("")
    onNoteCreated()
  }

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta nota?")) return

    setDeletingNoteId(noteId)
    try {
      const response = await fetch(CASES_NOTES_DELETE_ENDPOINT(Number(caseId), noteId), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user?.accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al eliminar la nota")
      }

      onNoteDeleted?.(noteId)
    } catch (error) {
      console.error("Error deleting note:", error)
      alert("No se pudo eliminar la nota. Por favor, intenta de nuevo.")
    } finally {
      setDeletingNoteId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]

    const day = date.getDate().toString().padStart(2, "0")
    const month = months[date.getMonth()]
    const year = date.getFullYear()

    return `${day}/${month}/${year}`
  }

  return (
    <div className="w-full p-4 bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">Notas</h1>
        </div>
      </div>

      {/* Nueva Nota Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Nueva nota</h2>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-3 bg-gray-50 border-b border-gray-200">
            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <Bold className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <Italic className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <Strikethrough className="h-4 w-4 text-gray-600" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <select className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-200 transition-colors">
              <option>Párrafo</option>
              <option>Título 1</option>
              <option>Título 2</option>
              <option>Título 3</option>
            </select>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <List className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <ListOrdered className="h-4 w-4 text-gray-600" />
            </button>

            <div className="w-px h-6 bg-gray-300 mx-1"></div>

            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <Type className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <Link className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <ImageIcon className="h-4 w-4 text-gray-600" />
            </button>

            <div className="flex-1"></div>

            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <Undo className="h-4 w-4 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-200 rounded transition-colors">
              <Redo className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Text Area */}
          <div className="p-4">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Escribe una nota..."
              className="w-full min-h-[120px] resize-none border-none outline-none text-gray-700 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-4">
          <CreateNoteForm
            caseId={caseId}
            onCancel={() => { }}
            onSuccess={handleNoteCreated}
            customContent={noteContent}
            onContentChange={setNoteContent}
          />
        </div>
      </div>

      {/* Historial de notas */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <FileText className="h-5 w-5 text-gray-700" />
          <h2 className="text-lg font-medium text-gray-900">Historial de notas</h2>
        </div>

        {notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No hay notas registradas aún</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note, index) => (

              <div
                key={index}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden"
              >
                <div className="bg-gray-50 dark:bg-gray-800 p-3 flex justify-between items-center border-b">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                      <Image
                        src={
                          note.user?.image
                            ? (note.user.image.startsWith('http')
                              ? note.user.image
                              : `${process.env.NEXT_PUBLIC_BACKEND_URL}${note.user.image}`)
                            : "/images/placeholder.svg"
                        }
                        alt={note.user.name || "User Avatar"}
                        width={36}
                        height={36}
                        quality={100}
                        priority
                        className="rounded-full mr-2 aspect-square object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {note.user.name || "Anónimo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(note.updatedAt || note.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <button className="p-2 hover:bg-gray-200 rounded transition-colors">
                      <Edit3 className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(Number(note.id))}
                      disabled={deletingNoteId === Number(note.id)}
                      className="p-2 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                    >
                      {deletingNoteId === Number(note.id) ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <p dangerouslySetInnerHTML={{ __html: note.note }}></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}