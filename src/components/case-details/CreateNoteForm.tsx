"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Button from "@/components/ui/button/Button"
import { toast } from "sonner"
import { CASES_NOTES_CREATE_ENDPOINT } from "@/constant/api-endpoints"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"

interface CreateNoteFormProps {
    caseId: string
    onCancel: () => void
    onSuccess: () => void
    customContent?: string
    onContentChange?: (content: string) => void
}

export const CreateNoteForm = ({
    caseId,
    onCancel,
    onSuccess,
    customContent = "",
    onContentChange,
}: CreateNoteFormProps) => {
    const { data: session } = useSession()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()
    const handleSubmit = async () => {
        if (!customContent.trim()) {
            toast.error("Por favor, escribe una nota antes de guardar")
            return
        }

        setIsSubmitting(true)
        try {
            const response = await fetch(CASES_NOTES_CREATE_ENDPOINT(Number(caseId)), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
                body: JSON.stringify({
                    note: customContent,
                    userId: session?.user?.id,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || "Error al crear la nota")
            }

            toast.success("Nota creada exitosamente")
            onSuccess()
            router.push(`/admin/legal-cases/${caseId}`)
        } catch (error) {
            console.error("Error creating note:", error)
            toast.error("No se pudo crear la nota. Por favor, intenta de nuevo.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !customContent.trim()}
            variant="custom"
                className="bg-[#09A4B5] text-white hover:bg-[#09A4B5]/85 dark:text-gray-900 py-2 px-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isSubmitting ? (
                <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Guardando...</span>
                </div>
            ) : (
                <div className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Guardar nota</span>
                </div>
            )}
        </Button>
    )
}
