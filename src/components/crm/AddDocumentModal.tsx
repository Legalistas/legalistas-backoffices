"use client"

import { useState, useCallback } from "react"
import type { Lead } from "@/types/crm"
import Button from "../ui/button/Button"
import { Modal } from "../ui/modal/Modal"
import { useSession } from "next-auth/react"
import { Loader2, Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { LEADS_ENDPOINT, LEADS_UPLOAD_ENDPOINT } from "@/constant/api-endpoints"

interface leadDocumentationProps {
    isOpen: boolean
    onClose: () => void
    lead: Lead
    onLeadUpdate: (updatedLead: Lead) => void
}

// Tipos de archivos aceptados
const ACCEPTED_FILE_TYPES = {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/avif": [".avif"],
}

export default function AddDocumentModal({ isOpen, onClose, lead, onLeadUpdate }: leadDocumentationProps) {
    const { data: session } = useSession()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [files, setFiles] = useState<File[]>([])
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
    const [uploadStatus, setUploadStatus] = useState<{ [key: string]: "idle" | "uploading" | "success" | "error" }>({})
    const [documentName, setDocumentName] = useState("")

    // Configuración del dropzone
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prevFiles) => {
            const newFiles = acceptedFiles.filter(
                (file) => !prevFiles.some((prevFile) => prevFile.name === file.name && prevFile.size === file.size),
            )
            const combinedFiles = [...prevFiles, ...newFiles]
            // Limit to maxFiles (5)
            return combinedFiles.slice(0, 5)
        })

        // Initialize progress and status for newly accepted files only
        setUploadProgress((prevProgress) => {
            const newProgress = { ...prevProgress }
            acceptedFiles.forEach((file) => {
                if (!(file.name in newProgress)) {
                    newProgress[file.name] = 0
                }
            })
            return newProgress
        })

        setUploadStatus((prevStatus) => {
            const newStatus = { ...prevStatus }
            acceptedFiles.forEach((file) => {
                if (!(file.name in newStatus)) {
                    newStatus[file.name] = "idle"
                }
            })
            return newStatus
        })
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_FILE_TYPES,
        maxSize: 10485760, // 10MB
        maxFiles: 5,
    })

    // Eliminar un archivo de la lista
    const removeFile = (fileName: string) => {
        setFiles((prev) => prev.filter((file) => file.name !== fileName))
        setUploadProgress((prev) => {
            const newProgress = { ...prev }
            delete newProgress[fileName]
            return newProgress
        })
        setUploadStatus((prev) => {
            const newStatus = { ...prev }
            delete newStatus[fileName]
            return newStatus
        })
    }

    // Añade esta función para limpiar los estados
    const handleClose = () => {
        setFiles([])
        setUploadProgress({})
        setUploadStatus({})
        setDocumentName("")
        onClose()
    }

    // Subir archivos al servidor
    const uploadFiles = async () => {
        if (files.length === 0) {
            toast.error("Por favor, selecciona al menos un archivo")
            return
        }

        setIsSubmitting(true)

        try {
            const results = await Promise.allSettled(
                files.map(async (file) => {
                    // Iniciar estado de carga para este archivo
                    setUploadStatus((prev) => ({ ...prev, [file.name]: "uploading" }))

                    // Iniciar simulación de progreso
                    let progress = 0
                    const interval = setInterval(() => {
                        progress += Math.random() * 10
                        if (progress > 95) {
                            progress = 95 // Dejar en 95% hasta que se complete realmente
                            clearInterval(interval)
                        }
                        setUploadProgress((prev) => ({ ...prev, [file.name]: Math.min(Math.round(progress), 95) }))
                    }, 300)

                    try {
                        // Preparar y enviar los datos
                        const formData = new FormData()
                        formData.append("file", file)
                        formData.append("documentName", file.name)
                        formData.append("userId", session?.user?.id || "")

                        const response = await fetch(`${LEADS_UPLOAD_ENDPOINT(Number(lead.id))}`, {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${session?.user?.accessToken}`,
                            },
                            body: formData,
                        })

                        // Detener la simulación de progreso
                        clearInterval(interval)

                        if (!response.ok) {
                            throw new Error(`Error al subir ${file.name}: ${response.statusText}`)
                        }

                        // Establecer progreso al 100% y estado a éxito
                        setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
                        setUploadStatus((prev) => ({ ...prev, [file.name]: "success" }))

                        return await response.json()
                    } catch (error) {
                        // Detener la simulación de progreso en caso de error
                        clearInterval(interval)
                        console.error(`Error uploading ${file.name}:`, error)
                        setUploadStatus((prev) => ({ ...prev, [file.name]: "error" }))
                        throw error
                    }
                }),
            )

            // Verificar si todas las subidas fueron exitosas
            const allSuccessful = results.every((result) => result.status === "fulfilled")

            if (allSuccessful) {
                toast.success("Documentos subidos correctamente")

                // Actualizar el lead con los nuevos documentos
                const updatedLeadResponse = await fetch(`${LEADS_ENDPOINT}/${lead.id}`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${session?.user?.accessToken}`,
                    },
                })

                if (updatedLeadResponse.ok) {
                    const updatedLead = await updatedLeadResponse.json()
                    onLeadUpdate(updatedLead)
                }

                handleClose() // Usar handleClose en lugar de onClose
            } else {
                // Algunos archivos fallaron
                const failedCount = results.filter((result) => result.status === "rejected").length
                toast.error(`${failedCount} documento(s) no se pudieron subir. Por favor, inténtalo de nuevo.`)
            }
        } catch (error) {
            console.error("Error al subir documentos:", error)
            toast.error("Ocurrió un error al subir los documentos")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-xl">
            <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Nuevo documento</h2>
                <p className="text-muted-foreground mb-6">
                    Selecciona el archivo para <span className="font-medium text-foreground">{lead.user?.name}</span>
                </p>

                <div className="space-y-4 mb-6">
                    {/* Dropzone */}
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                            }`}
                    >
                        <input {...getInputProps()} />
                        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                        {isDragActive ? (
                            <p className="text-blue-500">Suelta los archivos aquí...</p>
                        ) : (
                            <div>
                                <p className="text-gray-600">Arrastra y suelta archivos aquí, o haz clic para seleccionar</p>
                                <p className="text-sm text-gray-500 mt-1">
                                    Formatos aceptados: PDF, DOC, DOCX, JPG, JPEG, PNG, WEBP, AVIF (máx. 10MB)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Lista de archivos */}
                    {files.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
                            <p className="text-sm font-medium text-gray-700">Archivos seleccionados:</p>
                            {files.map((file) => (
                                <div key={file.name} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                        <File className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                        <span className="text-sm truncate">{file.name}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {uploadStatus[file.name] === "uploading" && (
                                            <div className="w-16 bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className="bg-blue-600 h-2.5 rounded-full"
                                                    style={{ width: `${uploadProgress[file.name]}%` }}
                                                ></div>
                                            </div>
                                        )}
                                        {uploadStatus[file.name] === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                                        {uploadStatus[file.name] === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeFile(file.name)
                                            }}
                                            className="text-gray-500 hover:text-red-500"
                                            disabled={isSubmitting}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button onClick={uploadFiles} disabled={isSubmitting || files.length === 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Subir documentos
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
