"use client";

import { Clock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { LEADS_ENDPOINT } from "@/constant/api-endpoints";
import { MEETING_TYPES } from "@/constant/crm";
import type { Lead } from "@/types/crm";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface LeadActivityProps {
	lead: Lead;
}

export default function LeadActivity({ lead }: LeadActivityProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [isDeleting, setIsDeleting] = useState<number | null>(null);

	const handleDeleted = async (meetId: number) => {
		setIsDeleting(meetId);
		try {
			const response = await fetch(
				`${LEADS_ENDPOINT}/${lead.id}/meetings/${meetId}`,
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				},
			);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Error: ${response.status}`);
			}
			toast.success("Reunión eliminada correctamente");
			router.push(`/admin/crm/leads/${lead.id}`);
		} catch (error) {
			console.error("Error al eliminar la reunión:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al eliminar la reunión",
			);
		} finally {
			setIsDeleting(null);
		}
	};

	if (!lead.crmMeetings?.length) {
		return (
			<div className="text-center py-6">
				<Clock className="h-12 w-12 mx-auto text-muted-foreground" />
				<p className="mt-2 text-muted-foreground">
					No hay actividades pendientes
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-xl border">
			<div className="w-full overflow-x-auto">
				<Table className="w-full min-w-200">
					<TableHeader>
						<TableRow>
							<TableHead className="w-[10%]">Fecha</TableHead>
							<TableHead className="w-[10%]">Hora</TableHead>
							<TableHead className="w-[25%]">Nota</TableHead>
							<TableHead className="w-[20%]">Tipo</TableHead>
							<TableHead className="w-[20%]">Abog. Responsable</TableHead>
							<TableHead className="w-[15%]">Miembro</TableHead>
							<TableHead className="w-[10%] text-right">Acción</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{lead.crmMeetings.map((meeting) => (
							<TableRow key={meeting.id}>
								<TableCell>
									{new Date(meeting.date).toLocaleDateString("es-AR", {
										year: "numeric",
										month: "numeric",
										day: "2-digit",
									})}
								</TableCell>
								<TableCell>
									{new Date(meeting.date).toLocaleTimeString("es-AR", {
										hour: "2-digit",
										minute: "2-digit",
										hour12: false,
										timeZone: "UTC",
									})}
								</TableCell>
								<TableCell>{meeting.note || "-"}</TableCell>
								<TableCell>
									{MEETING_TYPES.find((mt) => mt.id === meeting.type)?.name ??
										meeting.type}
								</TableCell>
								<TableCell>
									{meeting.responsibleLawyer?.name || "-"}
								</TableCell>
								<TableCell>{meeting.user?.name || "-"}</TableCell>
								<TableCell className="text-right">
									<Button
										variant="ghost"
										size="icon"
										className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
										disabled={isDeleting === meeting.id}
										onClick={() => handleDeleted(meeting.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
