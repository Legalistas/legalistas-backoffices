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
import { CRM_COLUMNS, type LostReasonValue } from "@/constant/crm";
import { sendStageEmail } from "@/lib/send-stage-email";
import { moveLeadFolderOnColumnChange } from "@/lib/storage-move";
import type { Lead } from "@/types/crm";
import LostReasonDialog from "./LostReasonDialog";

/** Columna "Perdida" — el backend exige lostReason para este id. */
const LOST_COLUMN_ID = 10;
/** Columna "Ganado - Trajo Poder". */
const WON_COLUMN_ID = 9;

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
	// Perdida requiere motivo — no se commitea hasta que se confirma el diálogo.
	const [pendingLoss, setPendingLoss] = useState(false);

	const currentValue = lead.columnId ? String(lead.columnId) : undefined;

	const commitColumnChange = async (
		newColumnId: number,
		status: "WON" | "LOST" | "IN_PROGRESS",
		lostReason?: LostReasonValue,
		lostReasonNotes?: string,
	) => {
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
					status,
					userId: session?.user?.id,
					...(lostReason && { lostReason, lostReasonNotes }),
				}),
			});

			const payload = await response.json().catch(() => null);

			if (!response.ok) {
				toast.error(
					payload?.message || payload?.error || "No se pudo actualizar la etapa",
				);
				return;
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

			onLeadUpdate({ ...lead, columnId: newColumnId, status });
			toast.success("Etapa actualizada");
		} catch (error) {
			console.error("Error updating lead stage:", error);
			toast.error("Error de conexión al actualizar la etapa");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChange = (value: string) => {
		const newColumnId = Number(value);
		if (!newColumnId || newColumnId === lead.columnId) return;

		if (newColumnId === LOST_COLUMN_ID) {
			setPendingLoss(true);
			return;
		}

		commitColumnChange(
			newColumnId,
			newColumnId === WON_COLUMN_ID ? "WON" : "IN_PROGRESS",
		);
	};

	const handleConfirmLoss = async (reason: LostReasonValue, notes: string) => {
		await commitColumnChange(LOST_COLUMN_ID, "LOST", reason, notes);
		setPendingLoss(false);
	};

	return (
		<>
			<Select
				value={currentValue}
				onValueChange={handleChange}
				disabled={isSubmitting}
			>
				<SelectTrigger className="w-auto min-w-44 shrink-0 rounded-md shadow-sm">
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

			<LostReasonDialog
				open={pendingLoss}
				leadName={lead.name || lead.user?.name}
				onCancel={() => setPendingLoss(false)}
				onConfirm={handleConfirmLoss}
			/>
		</>
	);
}
