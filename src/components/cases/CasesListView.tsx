"use client"

import { AlertCircle, Pencil, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import Badge from "@/components/ui/badge/Badge"
import Button from "@/components/ui/button/Button"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { getServiceName, getStatusName } from "@/lib/functions"
import type { Cases } from "@/types/cases"

interface CasesListViewProps {
    cases: Cases[]
    hasActiveFilters: boolean
    handleClearSearch: () => void
    handleDelete: (id: number) => void
}

export const CasesListView = ({ cases, hasActiveFilters, handleClearSearch, handleDelete }: CasesListViewProps) => {
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[800px]">
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableCell isHeader className="w-[1%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                Caso #
                            </TableCell>
                            <TableCell isHeader className="w-[20%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                Titulo
                            </TableCell>
                            <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                Servicio
                            </TableCell>
                            <TableCell isHeader className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                Estado
                            </TableCell>
                            <TableCell isHeader className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                Abog. Responsable
                            </TableCell>
                            <TableCell isHeader className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                Abog. Interno
                            </TableCell>
                            <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                Fecha
                            </TableCell>
                            <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                Acción
                            </TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cases.length > 0 ? (
                            cases.map((caso) => (
                                <TableRow key={caso.id} className="hover:bg-gray-50">
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        <Link href={`/admin/legal-cases/${caso.id}`} className="hover:underline font-medium">
                                            {caso.number ?? caso.id ?? "Sin número"}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div>
                                            <Link
                                                href={`/admin/legal-cases/${caso.id}`}
                                                className="text-sm font-medium text-gray-700 hover:underline"
                                            >
                                                {caso.title}
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <Badge size="sm">{getServiceName(Number(caso.servicesId))}</Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        <div
                                            className="inline-flex px-2 py-1.5 text-xs font-medium rounded-full"
                                            style={{
                                                backgroundColor:
                                                    caso.stageId === 1
                                                        ? "#e6f7f4"
                                                        : caso.stageId === 2
                                                            ? "#fff8e6"
                                                            : caso.stageId === 3
                                                                ? "#fee"
                                                                : "#f5f5f5",
                                                color:
                                                    caso.stageId === 1
                                                        ? "#09A4B5"
                                                        : caso.stageId === 2
                                                            ? "#f59e0b"
                                                            : caso.stageId === 3
                                                                ? "#ef4444"
                                                                : "#6b7280",
                                            }}
                                        >
                                            {getStatusName(Number(caso.stageId))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        {caso?.responsibleLawyer ? (
                                            <div className="flex items-center gap-2">
                                                {caso?.responsibleLawyer?.image ? (
                                                    <Image
                                                        className="w-6 h-6 rounded-full"
                                                        src={
                                                            caso?.responsibleLawyer?.image
                                                                ? (caso.responsibleLawyer.image.startsWith('http')
                                                                    ? caso.responsibleLawyer.image
                                                                    : `${process.env.NEXT_PUBLIC_BACKEND_URL}${caso.responsibleLawyer.image}`)
                                                                : "/placeholder.svg"
                                                        }
                                                        alt={`${caso?.responsibleLawyer?.name || "Lawyer"} profile`}
                                                        width={24}
                                                        height={24}
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs">
                                                        {caso?.responsibleLawyer?.name ? caso.responsibleLawyer.name.charAt(0).toUpperCase() : "L"}
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-700 truncate">
                                                    {caso?.responsibleLawyer?.name || "Sin asignar"}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-500">Sin asignar</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-4 py-3">
                                        {caso?.internalLawyer ? (
                                            <div className="flex items-center gap-2">
                                                 {caso?.internalLawyer?.image ? (
                                                    <Image
                                                        className="w-6 h-6 rounded-full"
                                                        src={
                                                            caso?.internalLawyer?.image
                                                                ? (caso.internalLawyer.image.startsWith('http')
                                                                    ? caso.internalLawyer.image
                                                                    : `${process.env.NEXT_PUBLIC_BACKEND_URL}${caso.internalLawyer.image}`)
                                                                : "/placeholder.svg"
                                                        }
                                                        alt={`${caso?.internalLawyer?.name || "Lawyer"} profile`}
                                                        width={24}
                                                        height={24}
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs">
                                                        {caso?.internalLawyer?.name ? caso.internalLawyer.name.charAt(0).toUpperCase() : "L"}
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-700 truncate">
                                                    {caso?.internalLawyer?.name || "Sin asignar"}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-500">Sin asignar</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {new Date(caso.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/legal-cases/${caso.id}?edit=true`}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    handleDelete(caso.id)
                                                }}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete</span>
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="px-4 py-8 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                                        <p className="text-gray-500 font-medium">
                                            {hasActiveFilters
                                                ? "No se encontraron casos que coincidan con los filtros seleccionados."
                                                : "No hay casos disponibles."}
                                        </p>
                                        {hasActiveFilters && (
                                            <Button variant="outline" onClick={handleClearSearch} className="mt-4">
                                                Limpiar filtros
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

