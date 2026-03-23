"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { LEADS_ENDPOINT } from "@/constant/api-endpoints";
import { MEETING_TYPES } from "@/constant/crm";
import moment from "moment";
import "moment/locale/es";
import type { Lead } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface ScheduleMeetingModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function ScheduleMeetingModal({
	open,
	onOpenChange,
	lead,
	onLeadUpdate,
}: ScheduleMeetingModalProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [meetingType, setMeetingType] = useState<string>("VIDEO_CALL");
	const [selectedLawyer, setSelectedLawyer] = useState<string>(
		String(lead.responsibleLawyerId || lead.internalLawyerId || ""),
	);
	const [meetingDateTime, setMeetingDateTime] = useState("");
	const [notes, setNotes] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const availableLawyers = [
		...(lead.responsibleLawyer ? [lead.responsibleLawyer] : []),
		...(lead.internalLawyer &&
		lead.internalLawyer.id !== lead.responsibleLawyerId
			? [lead.internalLawyer]
			: []),
	];

	const handleScheduleMeeting = async () => {
		if (!meetingDateTime || !selectedLawyer || !meetingType) {
			toast.error("Por favor complete todos los campos requeridos");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch(`${LEADS_ENDPOINT}/${lead.id}/meetings`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					leadId: lead.id,
					meetingType,
					lawyerId: Number(selectedLawyer),
					scheduledAt: meetingDateTime,
					userId: Number(session?.user?.id),
					customerId: lead.userId,
					notes,
				}),
			});

			if (!response.ok) {
				throw new Error(`Error: ${response.status} ${response.statusText}`);
			}

			const data = await response.json();

			// Enviar email con datos de la reunión al cliente
			const email = lead.email || lead.user?.email;
			if (email) {
				const meetingDate = moment.utc(data.meeting.date);
				const meetingLabel = MEETING_TYPES.find((t) => t.id === meetingType)?.name || meetingType;
				fetch("/api/notifications/email", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						to: email,
						leadId: Number(lead.id),
						template: "crm-reunion-concretar",
						variables: {
							leadName: lead.name || lead.user?.name,
							meetingType: meetingLabel,
							date: meetingDate.format("dddd D [de] MMMM [de] YYYY"),
							hours: meetingDate.format("HH:mm"),
							phoneNumber: lead.phone || lead.user?.userProfile?.phone,
							confirmationUrl: data.confirmationUrl,
						},
					}),
				}).catch((err) => console.error("[Meeting Email]", err));
			}

			onLeadUpdate({
				...lead,
				crmMeetings: [...(lead.crmMeetings || []), data],
			});
			router.push(`/admin/crm/leads/${lead.id}`);
			toast.success("Reunión programada correctamente");
			onOpenChange(false);
		} catch (error) {
			console.error("Error scheduling meeting:", error);
			toast.error("Error al programar la reunión");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Programar reunión</DialogTitle>
					<DialogDescription>
						Programa una reunión con{" "}
						<span className="font-medium text-foreground">
							{lead.user?.name}
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="meeting-type">Tipo de actividad</Label>
						<Select value={meetingType} onValueChange={setMeetingType}>
							<SelectTrigger>
								<SelectValue placeholder="Seleccionar tipo" />
							</SelectTrigger>
							<SelectContent>
								{MEETING_TYPES.map((type) => (
									<SelectItem key={type.id} value={type.id}>
										{type.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="lawyer">Abogado responsable</Label>
						<Select value={selectedLawyer} onValueChange={setSelectedLawyer}>
							<SelectTrigger>
								<SelectValue placeholder="Seleccionar abogado" />
							</SelectTrigger>
							<SelectContent>
								{availableLawyers.map((lawyer) => (
									<SelectItem key={lawyer.id} value={String(lawyer.id)}>
										{lawyer.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="meeting-datetime">Fecha y hora</Label>
						<Input
							id="meeting-datetime"
							type="datetime-local"
							value={meetingDateTime}
							onChange={(e) => setMeetingDateTime(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="notes">Notas</Label>
						<Textarea
							id="notes"
							placeholder="Agregar notas sobre la reunión..."
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={4}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancelar
					</Button>
					<Button onClick={handleScheduleMeeting} disabled={isSubmitting}>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Programando...
							</>
						) : (
							"Programar reunión"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
