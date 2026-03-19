"use client";

import { CheckCircle2, ChevronRight, Circle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { LEADS_ENDPOINT } from "@/constant/api-endpoints";
import { CRM_COLUMNS } from "@/constant/crm";
import type { Lead } from "@/types/crm";

interface ChangeStageModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	lead: Lead;
	onLeadUpdate: (updatedLead: Lead) => void;
}

export default function ChangeStageModal({
	open,
	onOpenChange,
	lead,
	onLeadUpdate,
}: ChangeStageModalProps) {
	const { data: session } = useSession();
	const [selectedColumnId, setSelectedColumnId] = useState<number | undefined>(
		lead.columnId,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleStageChange = async () => {
		if (!selectedColumnId || selectedColumnId === lead.columnId) {
			onOpenChange(false);
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch(`${LEADS_ENDPOINT}/${lead.id}/column`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					columnId: selectedColumnId,
					status: "IN_PROGRESS",
					userId: session?.user?.id,
				}),
			});

			if (!response.ok) {
				throw new Error(`Error: ${response.status} ${response.statusText}`);
			}

			window.location.reload();
			toast.success("Etapa actualizada correctamente");
			onOpenChange(false);
		} catch (error) {
			console.error("Error updating lead stage:", error);
			toast.error("Error al actualizar la etapa");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Cambiar etapa</DialogTitle>
					<DialogDescription>
						Selecciona la nueva etapa para{" "}
						<span className="font-medium text-foreground">{lead?.name}</span>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2 max-h-100 overflow-y-auto pr-2">
					{CRM_COLUMNS.map((column) => (
						<button
							key={column.id}
							className={`w-full flex items-center justify-between rounded-lg p-3 text-left transition-colors ${
								selectedColumnId === Number(column.id)
									? "bg-primary/10 border border-primary"
									: "hover:bg-muted border border-transparent"
							}`}
							onClick={() => setSelectedColumnId(Number(column.id))}
						>
							<div className="flex items-center">
								<div className="mr-3">
									{selectedColumnId === Number(column.id) ? (
										<CheckCircle2 className="h-5 w-5 text-primary" />
									) : (
										<Circle className="h-5 w-5 text-muted-foreground" />
									)}
								</div>
								<div>
									<div className="font-medium">{column.title}</div>
									<div className="text-sm text-muted-foreground">
										{getColumnDescription(column.id)}
									</div>
								</div>
							</div>
							<ChevronRight className="h-5 w-5 text-muted-foreground" />
						</button>
					))}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button
						onClick={handleStageChange}
						disabled={isSubmitting || selectedColumnId === lead.columnId}
					>
						{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Guardar cambios
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function getColumnDescription(columnId: string | number): string {
	switch (Number(columnId)) {
		case 1:
			return "Cliente ha realizado una consulta inicial";
		case 2:
			return "Pendiente de agendar una reunión";
		case 3:
			return "Reunión agendada con el cliente";
		case 4:
			return "Caso en proceso de evaluación";
		case 5:
			return "Esperando confirmación del cliente";
		case 6:
			return "Pendiente de coordinar reunión para firma de poder";
		case 7:
			return "Reunión de firma de poder agendada";
		case 8:
			return "Esperando recepción del poder firmado";
		case 9:
			return "Cliente ha entregado el poder firmado";
		case 10:
			return "Oportunidad perdida";
		case 11:
			return "Casos archivados o inactivos";
		default:
			return "";
	}
}
