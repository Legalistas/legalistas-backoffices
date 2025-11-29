import { Clock, Edit, Trash, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import { Lead } from "@/types/crm";
import Button from "../ui/button/Button";
import { formatDateCustom, getBuenosAiresDateTime, getBuenosAiresTime } from "@/lib/functions";
import { MEETING_TYPES } from "@/constant/crm";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { LEADS_ENDPOINT } from "@/constant/api-endpoints";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LeadActivityProps {
    lead: Lead
}

export default function LeadActivity({ lead }: LeadActivityProps) {
    const { data: session } = useSession()
    const router = useRouter()
    const [isDeleting, setIsDeleting] = useState<number | null>(null)

    const handleDeleted = async (meetId: number) => {
        setIsDeleting(meetId)

        try {
            const response = await fetch(`${LEADS_ENDPOINT}/${lead.id}/meetings/${meetId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.user?.accessToken}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`)
            }

            // Mostrar mensaje de éxito
            toast.success("Reunión eliminada correctamente")

            router.push(`/admin/crm/leads/${lead.id}`)
        } catch (error) {
            console.error("Error al eliminar la reunión:", error)
            toast.error(error instanceof Error ? error.message : "Error al eliminar la reunión")
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="w-full overflow-x-auto">
                {lead.crmMeetings?.length ? (
                    <Table className="w-full min-w-[800px]">
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Fecha
                                </TableCell>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Hora
                                </TableCell>
                                <TableCell isHeader className="w-[25%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Nota
                                </TableCell>
                                <TableCell isHeader className="w-[20%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Tipo
                                </TableCell>
                                <TableCell isHeader className="w-[20%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Abog. Responsable
                                </TableCell>
                                <TableCell isHeader className="w-[15%] px-4 py-3 text-sm font-semibold text-gray-700 text-left">
                                    Miembro
                                </TableCell>
                                <TableCell isHeader className="w-[10%] px-4 py-3 text-sm font-semibold text-gray-700 text-right">
                                    Acción
                                </TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lead.crmMeetings.map((meeting, index) => (
                                <TableRow key={index}>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {new Date(meeting.date).toLocaleDateString("es-AR", {
                                            year: "numeric",
                                            month: "numeric",
                                            day: "2-digit",
                                        })}{" "}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {new Date(meeting.date).toLocaleTimeString("es-AR", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: false,
                                            timeZone: "UTC",
                                        })}{" "}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {meeting.note || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {MEETING_TYPES.find((mt) => mt.id === meeting.type)?.name ?? meeting.type}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {meeting.responsibleLawyer?.name || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                                        {meeting.user?.name || "-"}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 text-sm text-gray-700 text-center space-x-2">
                                        <div className="flex flex-row text-center">
                                            {/* <Button variant="outline" size="sm" className="text-sm text-blue-600 hover:underline">
                                                <Edit className="h-4 w-4" />
                                            </Button> */}
                                            <Button variant="outline" size="sm" className="text-sm text-red-600 hover:underline" disabled={isDeleting === meeting.id} onClick={() => handleDeleted(meeting.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-6">
                        <Clock className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No hay actividades pendientes</p>
                    </div>
                )}
            </div>
        </div>
    );
}
