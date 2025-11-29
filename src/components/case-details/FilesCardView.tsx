"use client"

import { ExternalLink, Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import Badge from "@/components/ui/badge/Badge"
import type { CasesFiles } from "@/types/cases"
import { getProceduralStageLabel, getProcessTypeLabel } from "@/lib/functions"
import { CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT } from "@/constant/api-endpoints"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface FilesCardViewProps {
    files: CasesFiles[]
    caseId: string
    customer?: {
        name: string
    }
}

export const FilesCardView = ({ files, caseId, customer }: FilesCardViewProps) => {
    const { data: session } = useSession()
    const router = useRouter()
    const handleDelete = async (fileId: string) => {
        try {
            // Aquí deberías implementar la lógica para eliminar el archivo
            // Por ejemplo, hacer una solicitud DELETE a tu API
            const response = await fetch(`${CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT(Number(caseId), Number(fileId))}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`, // Asegúrate de que el token esté disponible
                },
            })
            if (!response.ok) {
                throw new Error("Failed to delete file")
            }

            console.log(`Deleting file with ID: ${fileId}`)
            // Simulación de eliminación exitosa
            toast.success("Archivo eliminado correctamente")
            router.push(`/admin/legal-cases/${caseId}`)
        } catch (error) {
            console.error("Error al eliminar el archivo:", error)
            toast.error("Error al eliminar el archivo")
        }
    }
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => (
                <div key={file.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                    <div className="border-b border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                            <h3 className="text-lg font-medium">
                                {customer && customer.name} {file.filesParts && file.filesParts[0]?.name ? `C/${file.filesParts[0].name}` : ""} S/ {getProcessTypeLabel(file.typeProcessId)}.
                            </h3>
                        </div>
                        <p className="text-sm text-gray-500">Created on {new Date(file.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="p-4">
                        <div className="mb-2">
                            <Badge size="sm" color={file.filetype === 1 ? "primary" : "warning"}>
                                {file.filetype === 1 ? "Administrative" : "Judicial"}
                            </Badge>
                            {file.proceduralStageId && (
                                <div className="mt-2 text-xs">
                                    <span className="text-gray-500">Etapa: </span>
                                    <span className="font-medium"> {getProceduralStageLabel(file.proceduralStageId, file.filetype)}</span>
                                </div>
                            )}
                        </div>
                        <p className="line-clamp-2 text-sm text-gray-500">{file.description || "No description"}</p>
                    </div>
                    <div className="border-t border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-end gap-2">
                            <Link
                                href={`/admin/legal-cases/${caseId}/files/${file.id}`}
                                className="inline-flex h-10 w-auto p-3 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <Eye className="h-4 w-4" />
                                Ver
                                <span className="sr-only">View</span>
                            </Link>
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    handleDelete(file.id)
                                }}
                                className="inline-flex h-10 w-auto p-3 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Borrar
                                <span className="sr-only">Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

