"use client";

import { Loader2, Tag } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LEADS_ENDPOINT } from "@/constant/api-endpoints";
import { CRM_COLUMNS } from "@/constant/crm";
import { sendStageEmail } from "@/lib/send-stage-email";
import { moveLeadFolderOnColumnChange } from "@/lib/storage-move";
import type { Lead } from "@/types/crm";

interface ChangeStageDropdownProps {
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function ChangeStageDropdown({
	lead,
	onLeadUpdate,
}: ChangeStageDropdownProps) {
	const { data: session } = useSession();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const currentValue = lead.columnId ? String(lead.columnId) : undefined;

	const handleChange = async (value: string) => {
		const newColumnId = Number(value);
		if (!newColumnId || newColumnId === lead.columnId) return;

		setIsSubmitting(true);

		try {
			const response = await fetch(`${LEADS_ENDPOINT}/${lead.id}/column`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					columnId: newColumnId,
					status: "IN_PROGRESS",
					userId: session?.user?.id,
				}),
			});

			if (!response.ok) {
				throw new Error(`Error: ${response.status} ${response.statusText}`);
			}

			// Email de notificación al cliente (no bloquea el flujo)
			sendStageEmail({
				email: lead.email || lead.user?.email,
				leadName: lead.name || lead.user?.name,
				leadId: Number(lead.id),
				columnId: newColumnId,
				phoneNumber: lead.phone || lead.user?.userProfile?.phone,
				accessToken: session?.user?.accessToken,
			});

			// Mover la carpeta del lead en MinIO al nuevo prefix de etapa
			// (o a casos/documentacion/ si se marcó como Ganado).
			moveLeadFolderOnColumnChange({
				folderName: lead.folderName,
				fromColumnId: lead.columnId,
				toColumnId: newColumnId,
			});

			onLeadUpdate({ ...lead, columnId: newColumnId, status: "IN_PROGRESS" });
			toast.success("Etapa actualizada");
		} catch (error) {
			console.error("Error updating lead stage:", error);
			toast.error("Error al actualizar la etapa");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Select
			value={currentValue}
			onValueChange={handleChange}
			disabled={isSubmitting}
		>
			<SelectTrigger className="h-9 min-w-50">
				{isSubmitting ? (
					<span className="flex items-center gap-2 text-sm">
						<Loader2 className="h-4 w-4 animate-spin" />
						Actualizando...
					</span>
				) : (
					<span className="flex items-center gap-2 text-sm">
						<Tag className="h-4 w-4 text-muted-foreground" />
						<SelectValue placeholder="Cambiar etapa" />
					</span>
				)}
			</SelectTrigger>
			<SelectContent>
				{CRM_COLUMNS.map((column) => (
					<SelectItem key={column.id} value={column.id}>
						{column.title}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
