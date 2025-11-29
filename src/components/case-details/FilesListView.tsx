"use client"

import { Delete, ExternalLink, Eye, Pencil, Trash, Trash2 } from "lucide-react"
import Link from "next/link"
import Badge from "@/components/ui/badge/Badge"
import type { CasesFiles } from "@/types/cases"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table"
import { getFileTypeLabel, getProceduralStageLabel, getProcessTypeLabel, getStatusProcessLabel } from "@/lib/functions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT } from "@/constant/api-endpoints"
import { useState } from "react"
import { NewFileModal } from "./NewFileModal"

interface FilesListViewProps {
    files: CasesFiles[]
    caseId: string
    customer?: {
        name: string
    }
}

export const FilesListView = ({ files, caseId, customer }: FilesListViewProps) => {
    const router = useRouter()
    const { data: session } = useSession()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [fileToEdit, setFileToEdit] = useState<CasesFiles | null>(null)

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
        <div className="overflow-hidden rounded-md border border-gray-200">
            <Table className="w-full min-w-[800px]">
                <TableHeader className="bg-gray-50">
                    <TableRow>
                        <TableCell isHeader className="w-[1%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Exp #
                        </TableCell>
                        <TableCell isHeader className="w-[20%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Caratula
                        </TableCell>
                        <TableCell isHeader className="w-[4%] px-4 py-3 text-sm font-semibold text-gray-700 text-center">
                            Nº de Expediente
                        </TableCell>
                        <TableCell isHeader className="w-[2%] px-4 py-3 text-sm font-semibold text-gray-700 text-center">
                            Tipo de expediente
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Juzgado
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Etapa procesal
                        </TableCell>
                        <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Estado del proceso
                        </TableCell>
                        <TableCell isHeader className="w-[1%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                            Acción
                        </TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {files.map((file) => (
                        <TableRow key={file.id} className="hover:bg-gray-50">
                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                {file.id}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                {customer && customer.name} {file.filesParts && file.filesParts[0]?.name ? `C/${file.filesParts[0].name}` : ""} S/ {getProcessTypeLabel(file.typeProcessId)}.
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-700 text-center">
                                {file.cuij}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-700 text-center">
                                <Badge variant="light" color="primary" className="text-xs font-normal">
                                    {getFileTypeLabel(file.filetype)}
                                </Badge>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                {file.court?.charter || 'Sin juzgado asignado'}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                {getProceduralStageLabel(file.proceduralStageId, file.filetype)}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                {getStatusProcessLabel(file.statusProcessId)}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center justify-end gap-2">
                                        <Link
                                            href={`/admin/legal-cases/${caseId}/files/${file.id}`}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            <span className="sr-only">View</span>
                                        </Link>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setFileToEdit(file)
                                                setIsEditModalOpen(true)
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            <span className="sr-only">Edit</span>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleDelete(file.id)
                                            }}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">Delete</span>
                                        </button>
                                    </div>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {/* Modal de edición */}
            {isEditModalOpen && fileToEdit && (
                <NewFileModal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setFileToEdit(null); }}
                    onSave={() => { setIsEditModalOpen(false); setFileToEdit(null); }}
                    initialFileType={fileToEdit.filetype || 1}
                    caseId={Number(caseId)}
                    fileToEdit={fileToEdit}
                    isEditMode={true}
                />
            )}
        </div>
    )
}

