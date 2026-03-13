"use client"

import { Check, ChevronDown, Eye, FolderOpen, Link2, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import Link from "next/link"
import Badge from "@/components/ui/badge/Badge"
import type { CasesFiles } from "@/types/cases"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table"
import { getFileTypeLabel, getProceduralStageLabel, getProcessTypeLabel, getStatusProcessLabel } from "@/lib/functions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT } from "@/constant/api-endpoints"
import { FILES_TYPE, STATUS_PROCESS } from "@/constant/causes"
import { createPortal } from "react-dom"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NewFileModal } from "./NewFileModal"

interface FilesListViewProps {
    files: CasesFiles[]
    caseId: string
    customer?: {
        name: string
    }
    onAddNewFile?: () => void
}

export const FilesListView = ({ files, caseId, customer, onAddNewFile }: FilesListViewProps) => {
    const router = useRouter()
    const { data: session } = useSession()
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [fileToEdit, setFileToEdit] = useState<CasesFiles | null>(null)
    const [fileTypeFilter, setFileTypeFilter] = useState<number>(0)
    const [statusFilter, setStatusFilter] = useState<number>(0)

    const handleDelete = async (fileId: string) => {
        try {
            const response = await fetch(`${CASES_FILES_DELETE_BY_CASE_ID_ENDPOINT(Number(caseId), Number(fileId))}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })
            if (!response.ok) {
                throw new Error("Failed to delete file")
            }

            console.log(`Deleting file with ID: ${fileId}`)
            toast.success("Archivo eliminado correctamente")
            router.push(`/admin/legal-cases/${caseId}`)
        } catch (error) {
            console.error("Error al eliminar el archivo:", error)
            toast.error("Error al eliminar el archivo")
        }
    }

    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
    const [statusSearch, setStatusSearch] = useState("")
    const statusBtnRef = useRef<HTMLButtonElement>(null)
    const statusDropdownRef = useRef<HTMLDivElement>(null)
    const statusSearchRef = useRef<HTMLInputElement>(null)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

    const filteredStatuses = useMemo(() => {
        if (!statusSearch) return STATUS_PROCESS
        const q = statusSearch.toLowerCase()
        return STATUS_PROCESS.filter((s) => s.value.toLowerCase().includes(q))
    }, [statusSearch])

    const selectedStatusLabel = useMemo(() => {
        if (statusFilter === 0) return "Todos los estados"
        return STATUS_PROCESS.find((s) => s.id === statusFilter)?.value || "Estado"
    }, [statusFilter])

    const toggleStatusDropdown = useCallback(() => {
        if (!statusDropdownOpen && statusBtnRef.current) {
            const rect = statusBtnRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) })
        }
        setStatusDropdownOpen((prev) => !prev)
        setStatusSearch("")
    }, [statusDropdownOpen])

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        if (!statusDropdownOpen) return
        const handle = (e: MouseEvent) => {
            if (
                statusDropdownRef.current?.contains(e.target as Node) ||
                statusBtnRef.current?.contains(e.target as Node)
            ) return
            setStatusDropdownOpen(false)
        }
        document.addEventListener("mousedown", handle)
        return () => document.removeEventListener("mousedown", handle)
    }, [statusDropdownOpen])

    // Focus en el input de búsqueda al abrir
    useEffect(() => {
        if (statusDropdownOpen) {
            setTimeout(() => statusSearchRef.current?.focus(), 0)
        }
    }, [statusDropdownOpen])

    // Filtrar expedientes
    const filteredFiles = useMemo(() => {
        return files.filter((file) => {
            const matchesType = fileTypeFilter === 0 || file.filetype === fileTypeFilter
            const matchesStatus = statusFilter === 0 || file.statusProcessId === statusFilter
            return matchesType && matchesStatus
        })
    }, [files, fileTypeFilter, statusFilter])

    const hasActiveFilters = fileTypeFilter !== 0 || statusFilter !== 0

    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-gray-400" />
                    <h3 className="text-md font-semibold text-gray-900">Expedientes</h3>
                </div>
                <div className="flex items-center gap-2">
                    {/* Filtros - solo cuando hay expedientes */}
                    {files.length > 0 && (
                        <>
                            <div className="relative">
                                <select
                                    value={fileTypeFilter}
                                    onChange={(e) => setFileTypeFilter(Number(e.target.value))}
                                    className="appearance-none text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md pl-3 pr-7 py-2 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer"
                                >
                                    <option value={0}>Todos los tipos</option>
                                    {FILES_TYPE.map((type) => (
                                        <option key={type.id} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="relative">
                                <button
                                    ref={statusBtnRef}
                                    onClick={toggleStatusDropdown}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md pl-3 pr-2 py-2 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer max-w-45"
                                >
                                    <span className="truncate">{selectedStatusLabel}</span>
                                    <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
                                </button>
                                {statusDropdownOpen && createPortal(
                                    <div
                                        ref={statusDropdownRef}
                                        className="fixed z-9999 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
                                        style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                                    >
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                                <input
                                                    ref={statusSearchRef}
                                                    type="text"
                                                    value={statusSearch}
                                                    onChange={(e) => setStatusSearch(e.target.value)}
                                                    placeholder="Buscar estado..."
                                                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-md pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            <button
                                                onClick={() => { setStatusFilter(0); setStatusDropdownOpen(false) }}
                                                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${statusFilter === 0 ? "text-blue-600 font-semibold bg-blue-50/50" : "text-gray-700"}`}
                                            >
                                                Todos los estados
                                                {statusFilter === 0 && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                            </button>
                                            {filteredStatuses.map((status) => (
                                                <button
                                                    key={status.id}
                                                    onClick={() => { setStatusFilter(status.id); setStatusDropdownOpen(false) }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-gray-50 transition-colors ${statusFilter === status.id ? "text-blue-600 font-semibold bg-blue-50/50" : "text-gray-700"}`}
                                                >
                                                    {status.value}
                                                    {statusFilter === status.id && <Check className="h-3.5 w-3.5 text-blue-600" />}
                                                </button>
                                            ))}
                                            {filteredStatuses.length === 0 && (
                                                <p className="px-3 py-2 text-xs text-gray-400 text-center">Sin resultados</p>
                                            )}
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </div>
                            {hasActiveFilters && (
                                <button
                                    onClick={() => { setFileTypeFilter(0); setStatusFilter(0) }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </>
                    )}
                    {onAddNewFile && (
                        <button
                            onClick={onAddNewFile}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo expediente
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-5 py-14">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <FolderOpen className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-700 mb-1">No hay expedientes creado</p>
                    <p className="text-xs text-gray-400 mb-4">Cree un expediente para iniciar la gestión del caso.</p>
                    {onAddNewFile && (
                        <button
                            onClick={onAddNewFile}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Nuevo expediente
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableCell isHeader className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">
                                    #
                                </TableCell>
                                <TableCell isHeader className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-left">
                                    Carátula
                                </TableCell>
                                <TableCell isHeader className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">
                                    CUIJ
                                </TableCell>
                                <TableCell isHeader className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">
                                    Tipo
                                </TableCell>
                                <TableCell isHeader className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-left">
                                    Juzgado
                                </TableCell>
                                <TableCell isHeader className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">
                                    Estado
                                </TableCell>
                                <TableCell isHeader className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-right whitespace-nowrap">
                                    Acción
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFiles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="px-4 py-10">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                                                <Search className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-700 mb-0.5">Sin resultados</p>
                                            <p className="text-xs text-gray-400 mb-3">No se encontraron expedientes con los filtros aplicados</p>
                                            <button
                                                onClick={() => { setFileTypeFilter(0); setStatusFilter(0) }}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                            >
                                                Limpiar filtros
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredFiles.map((file) => (
                                    <TableRow key={file.id} className="hover:bg-gray-50">
                                        <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                            {file.id}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {customer?.name} {file.filesParts?.[0]?.name ? `C/ ${file.filesParts[0].name}` : ""} S/ {getProcessTypeLabel(file.typeProcessId)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            {file.cuij || "—"}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 whitespace-nowrap">
                                            <Badge variant="light" color="primary" className="text-xs font-normal">
                                                {getFileTypeLabel(file.filetype)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-600">
                                            {file.court?.charter || <span className="text-gray-400 italic">Sin asignar</span>}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            {getStatusProcessLabel(file.statusProcessId)}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setFileToEdit(file)
                                                        setIsEditModalOpen(true)
                                                    }}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-amber-600 transition-colors"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleDelete(file.id)
                                                    }}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

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
