"use client";

import { CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react";
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
	const [isMarking, setIsMarking] = useState<number | null>(null);

	const formatWhatsAppPhone = (phone: string): string => {
		let clean = phone.replace(/[\s\-()+ ]/g, "");
		if (clean.startsWith("0")) clean = "54" + clean.substring(1);
		if (!clean.startsWith("54")) clean = "54" + clean;
		return clean;
	};

	const handleWhatsApp = (meeting: NonNullable<Lead["crmMeetings"]>[number]) => {
		const phone = lead.phone || lead.user?.userProfile?.phone || "";
		if (!phone) {
			toast.error("Este lead no tiene número de teléfono registrado");
			return;
		}
		const cleanPhone = formatWhatsAppPhone(phone);
		const nombre = lead.user?.name?.split(" ")[0] || lead.name?.split(" ")[0] || "cliente";
		const tipoReunion = MEETING_TYPES.find((t) => t.id === meeting.type)?.name || meeting.type;
		const meetingDate = new Date(meeting.date);
		const fecha = meetingDate.toLocaleDateString("es-AR", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
			timeZone: "UTC",
		});
		const hora = meetingDate.toLocaleTimeString("es-AR", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
			timeZone: "UTC",
		});
		const confirmationUrl = meeting.token
			? `https://legalistas.ar/confirmacion-reunion/${meeting.token}`
			: "";

		const msg = `Hola *${nombre}*,\n\n*${tipoReunion}*\n${fecha} a las ${hora} hs\nLugar: Alem 80\n${confirmationUrl ? `\nSi confirmás asistencia, tocá el siguiente link:\n${confirmationUrl}\n` : ""}\n_Equipo Legalistas_`;

		window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
	};

	const handleMarkDone = async (meetId: number) => {
		setIsMarking(meetId);
		try {
			const response = await fetch(
				`${LEADS_ENDPOINT}/${lead.id}/meetings/${meetId}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					// `realizada` es el dato que cuenta en el KPI (asistencia
					// real); COMPLETED se mantiene por el flujo de confirmación.
					body: JSON.stringify({
						confirmationStatus: "COMPLETED",
						realizada: true,
					}),
				},
			);
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `Error: ${response.status}`);
			}
			toast.success("Reunión marcada como realizada");
			router.refresh();
		} catch (error) {
			console.error("Error al marcar realizada:", error);
			toast.error(
				error instanceof Error ? error.message : "Error al marcar realizada",
			);
		} finally {
			setIsMarking(null);
		}
	};

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
								<TableCell className="text-right flex items-center justify-end gap-1">
									{meeting.realizada ? (
										<span
											className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700"
											title="Reunión ya marcada como realizada — cuenta en el KPI"
										>
											<CheckCircle2 className="h-3 w-3" />
											Realizada
										</span>
									) : (
										<Button
											variant="ghost"
											size="icon"
											className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
											disabled={isMarking === meeting.id}
											onClick={() => handleMarkDone(meeting.id)}
											title="Marcar como realizada (cuenta en KPI de videollamadas)"
										>
											{isMarking === meeting.id ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<CheckCircle2 className="h-4 w-4" />
											)}
										</Button>
									)}
									<Button
										variant="ghost"
										size="icon"
										className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
										onClick={() => handleWhatsApp(meeting)}
										title="Enviar WhatsApp"
									>
										<svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
											<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
										</svg>
									</Button>
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
