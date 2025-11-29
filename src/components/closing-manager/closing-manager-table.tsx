"use client"

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination/Pagination"
import Badge from "@/components/ui/badge/Badge" // Import Badge
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Import Avatar components
import Button from "@/components/ui/button/Button" // Import Button for action icons
import { Pencil, Trash2 } from "lucide-react" // Import icons
import { CLOSING_BY_ID_ENDPOINT } from "@/constant/api-endpoints"
import type { ClosingManagerEntry, Pagination as PaginationType } from "@/types/closing-manager"
import { closingType, closingTypeColors, statusCapital, statusCapitalColor, statusData, statusColors } from "@/constant/closing-manager"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface ClosingManagerTableProps {
    closings: ClosingManagerEntry[]
    pagination: PaginationType
    onPageChange: (page: number) => void
    onRefresh?: () => void
    visibleColumns: string[]
}

export default function ClosingManagerTable({ closings, pagination, onPageChange, onRefresh, visibleColumns }: ClosingManagerTableProps) {
    const { data: session } = useSession()
    const router = useRouter()

    const isColumnVisible = (columnId: string) => visibleColumns.includes(columnId)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            minimumFractionDigits: 2,
        }).format(amount)
    }

    const formatPercent = (amount: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "percent",
            minimumFractionDigits: 2,
        }).format(amount)
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("es-AR", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
    }

    const handleDelete = async (id: number) => {
        if (!confirm("¿Estás seguro de eliminar este cierre?")) return

        try {
            const response = await fetch(CLOSING_BY_ID_ENDPOINT(id), {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!response.ok) throw new Error("Error al eliminar el cierre")

            alert("Cierre eliminado exitosamente")
            if (onRefresh) onRefresh()
        } catch (err) {
            console.error("Error deleting closing:", err)
            alert("Error al eliminar el cierre")
        }
    }

    const handleEdit = (id: number) => {
        router.push(`/admin/closing-manager/${id}/edit`)
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="w-full overflow-x-auto">
                <Table className="w-full min-w-[2000px]">
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            {isColumnVisible("date") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Fecha Cierre
                                </TableCell>
                            )}
                            {isColumnVisible("case") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Causas
                                </TableCell>
                            )}
                            {isColumnVisible("lawyer") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Representante
                                </TableCell>
                            )}
                            {isColumnVisible("type") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Tipo de Cierre
                                </TableCell>
                            )}
                            {isColumnVisible("capitalAmount") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Monto Capital
                                </TableCell>
                            )}
                            {isColumnVisible("capitalState") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Estado Capital
                                </TableCell>
                            )}
                            {isColumnVisible("hpAgreed") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    HP Convenido $
                                </TableCell>
                            )}
                            {isColumnVisible("hpTotal") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Monto HP Convenido Total
                                </TableCell>
                            )}
                            {isColumnVisible("aportes") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Aportes
                                </TableCell>
                            )}
                            {isColumnVisible("sepblac") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    25% Percibido por el Sepblac
                                </TableCell>
                            )}
                            {isColumnVisible("hpLegalistas") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Monto HP Total Legalistas
                                </TableCell>
                            )}
                            {isColumnVisible("feeStatus") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Estado Honorarios $
                                </TableCell>
                            )}
                            {isColumnVisible("pclAgreed") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    PCL Convenidos
                                </TableCell>
                            )}
                            {isColumnVisible("pclAmount") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Monto Pacto Cuota Litis $
                                </TableCell>
                            )}
                            {isColumnVisible("pcl25") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    %
                                </TableCell>
                            )}
                            {isColumnVisible("pclTotal") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Monto Total Cuota Litis
                                </TableCell>
                            )}
                            {isColumnVisible("pclStatus") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Estado Pacto Cuota Litis $
                                </TableCell>
                            )}
                            {isColumnVisible("litigation") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Detalle
                                </TableCell>
                            )}
                            {isColumnVisible("intimation") && (
                                <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Expidió Intimación
                                </TableCell>
                            )}
                            <TableCell isHeader={true} className="px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                Acción
                            </TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {closings.length > 0 ? (
                            closings.map((closing) => (
                                <TableRow key={closing.id} className="hover:bg-gray-50">
                                    {isColumnVisible("date") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {formatDate(closing.date)}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("case") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {closing.case.title}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("lawyer") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {closing?.case?.responsibleLawyer?.name || "-"}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("type") && (
                                        <TableCell className="px-4 py-3">
                                            <Badge size="sm" className={cn(closingTypeColors[closing.type as keyof typeof closingType])}>
                                                {closingType[closing.type as keyof typeof closingType] || "Desconocido"}
                                            </Badge>
                                        </TableCell>
                                    )}
                                    {isColumnVisible("capitalAmount") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {formatCurrency(closing.capitalAmount)}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("capitalState") && (
                                        <TableCell className="px-4 py-3">
                                            <Badge size="sm" className={cn(statusCapitalColor[closing.capitalState as keyof typeof statusCapitalColor])}>
                                                {statusCapital[closing.capitalState as keyof typeof statusCapital] || "-"}
                                            </Badge>
                                        </TableCell>
                                    )}
                                    {isColumnVisible("hpAgreed") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {Number(closing.hpAgreed) % 1 === 0 ? Number(closing.hpAgreed).toFixed(0) : Number(closing.hpAgreed).toFixed(2)}%
                                        </TableCell>
                                    )}
                                    {isColumnVisible("hpTotal") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {formatCurrency(closing.capitalAmount * (Number(closing.hpAgreed) / 100))}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("aportes") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-center">
                                            {closing.contributions === "0" ? "0%" :
                                                closing.contributions === "10" ? "10%" :
                                                    closing.contributions === "10_IVA" ? "10% + IVA" :
                                                        closing.contributions === "25" ? "25%" :
                                                            closing.contributions === "25_IVA" ? "25% + IVA" :
                                                                closing.contributions === "50" ? "50%" :
                                                                    closing.contributions === "50_IVA" ? "50% + IVA" :
                                                                        closing.contributions || "-"}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("sepblac") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {(() => {
                                                // Monto HP Total
                                                const hpTotal = closing.capitalAmount * (Number(closing.hpAgreed) / 100);

                                                // Si no hay aportes, usar el 25% default
                                                if (!closing.contributions || closing.contributions === "0") {
                                                    return formatCurrency(hpTotal * 0.25);
                                                }

                                                // Determinar el porcentaje del aporte
                                                const contributionPercent = closing.contributions === "10" || closing.contributions === "10_IVA" ? 10 :
                                                    closing.contributions === "25" || closing.contributions === "25_IVA" ? 25 :
                                                        closing.contributions === "50" || closing.contributions === "50_IVA" ? 50 : 0;

                                                // Si tiene IVA
                                                if (closing.contributions?.includes("_IVA")) {
                                                    // Formula: (Porcentaje / 2) * 21% del HP Total
                                                    const divisor = 100 / contributionPercent; // 50% -> 2, 25% -> 4, 10% -> 10
                                                    const result = hpTotal * (0.21 / divisor);
                                                    return formatCurrency(result);
                                                }

                                                // Sin IVA: se anula el 25% y no se calcula nada (0)
                                                return formatCurrency(0);
                                            })()}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("hpLegalistas") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {formatCurrency(closing.capitalAmount * (Number(closing.hpAgreed) / 100) * 0.75)}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("feeStatus") && (
                                        <TableCell className="px-4 py-3">
                                            <Badge size="sm" className={cn(statusColors[closing.feeStatus as keyof typeof statusColors])}>
                                                {statusData[closing.feeStatus as keyof typeof statusColors] || "-"}
                                            </Badge>
                                        </TableCell>
                                    )}
                                    {isColumnVisible("pclAgreed") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {closing.pclAgreed || "-"}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("pclAmount") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {closing.pclAgreed ? formatCurrency(closing.capitalAmount * (Number(closing.pclAgreed) / 100)) : "-"}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("pcl25") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {closing.pclAgreed ? formatCurrency(closing.capitalAmount * (Number(closing.pclAgreed) / 100) * 0.25) : "-"}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("pclTotal") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700 text-right">
                                            {closing.pclAgreed ? formatCurrency(closing.capitalAmount * (Number(closing.pclAgreed) / 100) * 0.75) : "-"}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("pclStatus") && (
                                        <TableCell className="px-4 py-3">
                                            <Badge size="sm" className={cn(statusColors[closing.pclStatus as keyof typeof statusColors])}>
                                                {statusData[closing.pclStatus as keyof typeof statusColors] || "-"}
                                            </Badge>
                                        </TableCell>
                                    )}
                                    {isColumnVisible("litigation") && (
                                        <TableCell className="px-4 py-3 text-sm text-gray-700">
                                            {closing.litigation || "-"}
                                        </TableCell>
                                    )}
                                    {isColumnVisible("intimation") && (
                                        <TableCell className="px-4 py-3">
                                            <Badge size="sm" className="bg-red-100 text-red-800">
                                                NO RESPONDIO
                                            </Badge>
                                        </TableCell>
                                    )}
                                    <TableCell className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(closing.id)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(closing.id)}
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
                                <TableCell colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <p className="text-gray-500 font-medium">
                                            No hay cierres disponibles.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {pagination.totalPages > 1 && (
                    <div className="px-6 py-4">
                        <Pagination
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.total}
                            itemsPerPage={pagination.limit}
                            onPageChange={onPageChange}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
