import { Lead } from "@/types/crm";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { CRM_COLUMNS, SOURCE_CHANNEL } from "@/constant/crm";
import Badge from "../ui/badge/Badge";
import {  Eye, Pencil, Trash } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Pagination } from "../ui/pagination/Pagination";

interface KanbanListProps {
    leads: Lead[];
    onEditLead: (lead: Lead) => void;
    onDeleteLead: (leadId: string) => void;
}

export default function KanbanList({ leads, onEditLead, onDeleteLead }: KanbanListProps) {
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(10)
    console.log("Leads", leads)

    const getSourceChannelLabel = (sourceChannelId: number | undefined) => {
        if (!sourceChannelId) return "Desconocido"

        const channel = SOURCE_CHANNEL.find((ch) => ch.id === sourceChannelId)
        return channel ? channel.name : `Canal ${sourceChannelId}`
    }

    const getColumnLabel = (columnId: number | undefined) => {
        if (!columnId) return "Desconocido"

        const column = CRM_COLUMNS.find((col) => String(col.id) === String(columnId))
        return column ? column.title : `Columna ${columnId}`
    }

    // Pagination logic
    const totalPages = Math.ceil(leads.length / itemsPerPage)
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentLeads = leads.slice(indexOfFirstItem, indexOfLastItem)

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber)
    }

    return (
        <div>
            <div></div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="w-full overflow-x-auto">
                    <Table className="w-full min-w-[800px]">
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableCell isHeader className="w-[1%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">ID</TableCell>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Cliente</TableCell>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Provincia</TableCell>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Ciudad</TableCell>
                                <TableCell isHeader className="w-auto px-4 py-3 text-sm font-semibold text-gray-700 text-left">Servicios</TableCell>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Canal ingreso</TableCell>
                                <TableCell isHeader className="w-[14%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Etapa</TableCell>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Vendedora</TableCell>
                                <TableCell isHeader className="w-[12%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Abog. Interno</TableCell>
                                <TableCell isHeader className="w-[12%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Abog. Responsable</TableCell>
                                <TableCell isHeader className="w-[4%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">Acciones</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leads.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{lead.id}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{lead.user?.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{lead.user?.userAddresses[0]?.state?.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{lead.user?.userAddresses[0]?.city}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {lead.services && (
                                            <Badge
                                                variant="light"
                                                className="text-xs flex items-center gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
                                            >
                                                {lead.services.label}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        <Badge
                                            variant="light"
                                            className="text-xs flex items-center gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
                                        >
                                            {getSourceChannelLabel(lead.sourceChannelId)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{getColumnLabel(Number(lead.columnId))}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{lead.seller?.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{lead.internalLawyer?.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">{lead.responsibleLawyer?.name}</TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/admin/crm/leads/${lead.id}`} className="text-gray-500 hover:text-gray-700 p-2 hover:bg-blue-100 rounded">
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <button onClick={() => onEditLead(lead)} className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-100 rounded">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm('¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.')) {
                                                        onDeleteLead(lead.id)
                                                    }
                                                }} 
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-blue-100 rounded"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
            {/* Pagination */}

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={leads.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
            />
        </div>
    )
}