"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { LOST_REASONS, type LostReasonValue } from "@/constant/crm";

// Pop-up obligatorio al pasar una oportunidad a "Perdida"
// ("KPIs de Ventas v1.1", punto 5). Sin motivo no se guarda: el backend
// también rechaza el cambio, así que no hay forma de perder una
// oportunidad sin clasificarla.

interface LostReasonDialogProps {
	open: boolean;
	/** Nombre de la oportunidad, solo para el encabezado. */
	leadName?: string;
	/** Cancelar = la tarjeta vuelve a su columna original. */
	onCancel: () => void;
	onConfirm: (reason: LostReasonValue, notes: string) => Promise<void> | void;
}

export default function LostReasonDialog({
	open,
	leadName,
	onCancel,
	onConfirm,
}: LostReasonDialogProps) {
	const [reason, setReason] = useState<LostReasonValue | null>(null);
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);

	// Cada apertura arranca limpia — si no, hereda el motivo del lead anterior.
	useEffect(() => {
		if (open) {
			setReason(null);
			setNotes("");
			setSaving(false);
		}
	}, [open]);

	const selected = LOST_REASONS.find((r) => r.value === reason);
	const needsNotes = selected?.requiresNotes === true;
	const canSubmit = reason !== null && (!needsNotes || notes.trim().length > 0);

	const handleConfirm = async () => {
		if (!reason || !canSubmit) return;
		setSaving(true);
		try {
			await onConfirm(reason, notes.trim());
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				// Cerrar por Escape o click afuera equivale a cancelar.
				if (!next && !saving) onCancel();
			}}
		>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>¿Por qué se perdió la oportunidad?</DialogTitle>
					<DialogDescription>
						{leadName ? `${leadName} — ` : ""}
						El motivo es obligatorio: alimenta el reporte de perdidos por
						motivo del módulo de KPIs.
					</DialogDescription>
				</DialogHeader>

				<RadioGroup
					value={reason ?? ""}
					onValueChange={(v) => setReason(v as LostReasonValue)}
					className="gap-2"
				>
					{LOST_REASONS.map((r) => (
						<Label
							key={r.value}
							htmlFor={`lost-reason-${r.value}`}
							className="flex items-start gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
						>
							<RadioGroupItem
								id={`lost-reason-${r.value}`}
								value={r.value}
								className="mt-0.5"
							/>
							<span className="text-sm font-normal leading-snug">
								{r.label}
							</span>
						</Label>
					))}
				</RadioGroup>

				{needsNotes && (
					<div className="space-y-2">
						<Label htmlFor="lost-reason-notes">
							Detalle <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="lost-reason-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Contá brevemente por qué se perdió"
							rows={3}
						/>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onCancel} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={handleConfirm} disabled={!canSubmit || saving}>
						{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Marcar como perdida
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
