"use client"
import { useState } from "react"
import { FileText, Download, Trash2, File, FileImage, FileIcon as FilePdf, FileArchive, FileCode, Archive } from "lucide-react"
import Button from "../ui/button/Button"
import { BASE_URL } from "@/constant/api-endpoints"
import { CasesDocuments } from "@/types/cases"
import JSZip from "jszip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card/Card"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import Badge from "../ui/badge/Badge"

interface CasesDocumentsProps {
    documents: CasesDocuments[]
    caseId?: string
    onDocumentLoad?: () => void
}

export default function CaseDocuments({ documents, caseId, onDocumentLoad }: CasesDocumentsProps) {
    const { data: session } = useSession()
    const [isDeleting, setIsDeleting] = useState<number | null>(null)
    const [isDownloadingAll, setIsDownloadingAll] = useState(false)

    // Función para obtener el icono según la extensión del archivo
    const getFileIcon = (extension: string) => {
        switch (extension?.toLowerCase()) {
            case "pdf":
                return <FilePdf className="h-5 w-5 text-red-500" />
            case "jpg":
            case "jpeg":
            case "png":
            case "webp":
            case "avif":
                return <FileImage className="h-5 w-5 text-blue-500" />
            case "zip":
            case "rar":
                return <FileArchive className="h-5 w-5 text-yellow-500" />
            case "doc":
            case "docx":
                return <FileText className="h-5 w-5 text-blue-700" />
            case "html":
            case "css":
            case "js":
                return <FileCode className="h-5 w-5 text-green-500" />
            default:
                return <File className="h-5 w-5 text-gray-500" />
        }
    }

    // Función para formatear el tamaño del archivo
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes"
        const k = 1024
        const sizes = ["Bytes", "KB", "MB", "GB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    // Función para formatear la fecha
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    // Función para descargar un documento
    const handleDownload = async (docItem: any) => {
        try {
            // Verificar que tenemos la ruta del archivo
            if (!docItem.filePath) {
                toast.error("Ruta del archivo no disponible")
                return
            }

            // Construir la URL completa del documento
            const fileUrl = `${BASE_URL}/${docItem.filePath}`

            // Si el archivo requiere autenticación, agregar el token
            const fetchOptions: RequestInit = {
                method: "GET",
                mode: "cors", // Asegurar CORS
            }

            if (session?.user?.accessToken) {
                fetchOptions.headers = {
                    Authorization: `Bearer ${session.user.accessToken}`,
                }
            }

            // Mostrar toast de inicio de descarga
            toast.loading("Iniciando descarga...", { id: "download-toast" })

            // Descargar el archivo usando fetch para forzar descarga automática
            const response = await fetch(fileUrl, fetchOptions)

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`)
            }

            const blob = await response.blob()

            // Crear URL del blob
            const blobUrl = window.URL.createObjectURL(blob)

            // Crear elemento de descarga
            const downloadLink = document.createElement("a")
            downloadLink.style.display = "none"
            downloadLink.href = blobUrl

            // Asegurar que el nombre del archivo tenga extensión
            const fileName = docItem.fileName || `documento.${docItem.extension || "bin"}`
            downloadLink.download = fileName

            // Agregar al DOM, hacer click y limpiar
            document.body.appendChild(downloadLink)
            downloadLink.click()

            // Limpiar después de un breve delay
            setTimeout(() => {
                if (document.body.contains(downloadLink)) {
                    document.body.removeChild(downloadLink)
                }
                window.URL.revokeObjectURL(blobUrl)
            }, 100)

            // Actualizar toast de éxito
            toast.success("Documento descargado correctamente", { id: "download-toast" })
        } catch (error) {
            console.error("Error al descargar:", error)
            toast.error("Error al descargar el documento", { id: "download-toast" })

            // Solo como último recurso
            if (docItem.filePath) {
                const fileUrl = `${BASE_URL}/${docItem.filePath}`
                const newWindow = window.open(fileUrl, "_blank")
                if (newWindow) {
                    newWindow.focus()
                    toast.info("Archivo abierto en nueva pestaña")
                }
            }
        }
    }

    // Función para eliminar un documento
    const handleDelete = async (documentId: number) => {
        if (!session?.user?.accessToken) {
            toast.error("No estás autenticado")
            return
        }

        try {
            // setIsDeleting(documentId)

            // // Usar el endpoint proporcionado para eliminar el documento
            // const response = await fetch(LEADS_DOCUMENTS_DELETE_ENDPOINT(Number(lead.id), Number(documentId)), {
            //     method: "DELETE",
            //     headers: {
            //         "Content-Type": "application/json",
            //         Authorization: `Bearer ${session.user.accessToken}`,
            //     },
            // })

            // if (!response.ok) {
            //     throw new Error(`Error al eliminar: ${response.statusText}`)
            // }

            // toast.success("Documento eliminado correctamente")

            // Si existe la función onLeadUpdate, actualizar el lead después de eliminar

        } catch (error) {
            console.error("Error al eliminar:", error)
            toast.error("Error al eliminar el documento")
        } finally {
            setIsDeleting(null)
        }
    }

    const handleDownloadAll = async () => {
        if (!documents || documents.length === 0) {
            toast.error("No hay documentos para descargar")
            return
        }

        try {
            setIsDownloadingAll(true)
            toast.loading("Preparando descarga de todos los documentos...", { id: "download-all-toast" })

            const zip = new JSZip()
            let successCount = 0
            let errorCount = 0

            // Descargar cada documento y agregarlo al ZIP
            for (const document of documents) {
                try {
                    if (!document.filePath) {
                        errorCount++
                        continue
                    }

                    const fileUrl = `${BASE_URL}/${document.filePath}`
                    const fetchOptions: RequestInit = {
                        method: "GET",
                        mode: "cors",
                    }

                    if (session?.user?.accessToken) {
                        fetchOptions.headers = {
                            Authorization: `Bearer ${session.user.accessToken}`,
                        }
                    }

                    const response = await fetch(fileUrl, fetchOptions)

                    if (!response.ok) {
                        errorCount++
                        continue
                    }

                    const blob = await response.blob()
                    const fileName = document.fileName || `documento_${document.id}.${document.extension || "bin"}`

                    zip.file(fileName, blob)
                    successCount++
                } catch (error) {
                    console.error(`Error descargando ${document.fileName}:`, error)
                    errorCount++
                }
            }

            if (successCount === 0) {
                toast.error("No se pudo descargar ningún documento", { id: "download-all-toast" })
                return
            }

            // Generar el archivo ZIP
            toast.loading("Generando archivo ZIP...", { id: "download-all-toast" })
            const zipBlob = await zip.generateAsync({ type: "blob" })

            // Crear URL del blob y descargar
            const blobUrl = window.URL.createObjectURL(zipBlob)
            const downloadLink = document.createElement("a")
            downloadLink.style.display = "none"
            downloadLink.href = blobUrl
            downloadLink.download = `documentos_lead_${caseId}.zip`

            document.body.appendChild(downloadLink)
            downloadLink.click()

            setTimeout(() => {
                if (document.body.contains(downloadLink)) {
                    document.body.removeChild(downloadLink)
                }
                window.URL.revokeObjectURL(blobUrl)
            }, 100)

            const message =
                errorCount > 0
                    ? `ZIP descargado con ${successCount} documentos (${errorCount} errores)`
                    : `ZIP descargado con ${successCount} documentos`

            toast.success(message, { id: "download-all-toast" })
        } catch (error) {
            console.error("Error al crear ZIP:", error)
            toast.error("Error al crear el archivo ZIP", { id: "download-all-toast" })
        } finally {
            setIsDownloadingAll(false)
        }
    }
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Documentos</CardTitle>
                        <CardDescription>Archivos relacionados con este lead</CardDescription>
                    </div>
                    {(documents?.length ?? 0) > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownloadAll}
                            disabled={isDownloadingAll}
                            className="flex items-center gap-2 bg-transparent"
                        >
                            <Archive className="h-4 w-4" />
                            {isDownloadingAll ? "Descargando..." : "Descargar Todo"}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {(documents?.length ?? 0) > 0 ? (
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableCell colSpan={2} className="w-[30%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                        Nombre
                                    </TableCell>
                                    <TableCell className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                        Tamaño
                                    </TableCell>
                                    <TableCell className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                        Tipo
                                    </TableCell>
                                    <TableCell className="w-[20%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                        Fecha
                                    </TableCell>
                                    <TableCell className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-center">
                                        Acciones
                                    </TableCell>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents?.map((document) => (
                                    <TableRow key={document.id} className="hover:bg-gray-50">
                                        <TableCell className="w-[1%] px-4 py-3">{getFileIcon(document.extension || "")}</TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {document.fileName || document.description}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {formatFileSize(document.fileSize || 0)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            <Badge variant="light" className="text-gray-700 text-sm" size="sm">
                                                {document.fileType?.split("/")[1]?.toUpperCase() || document.extension?.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {document.uploadedAt ? formatDate(document.uploadedAt) : "N/A"}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-center">
                                            <div className="flex justify-center space-x-2">
                                                <Button
                                                    variant="custom"
                                                    size="sm"
                                                    onClick={() => handleDownload(document)}
                                                    className="hover:bg-gray-100 transform transition duration-200 ease-in-out p-2 rounded-full"
                                                >
                                                    <Download className="h-4 w-4 text-gray-600" />
                                                </Button>
                                                <Button
                                                    variant="custom"
                                                    size="sm"
                                                    onClick={() => handleDelete(document.id)}
                                                    disabled={isDeleting === document.id}
                                                    className="hover:bg-gray-100 transform transition duration-200 ease-in-out p-2 rounded-full"
                                                >
                                                    <Trash2
                                                        className={`h-4 w-4 ${isDeleting === document.id ? "text-gray-400" : "text-red-500"}`}
                                                    />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No hay documentos disponibles</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}