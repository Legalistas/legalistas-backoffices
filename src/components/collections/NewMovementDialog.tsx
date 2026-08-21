"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SCHEDULED_TX_ENDPOINT } from "@/constant/api-endpoints";
import type { ScheduledType } from "@/types/scheduled-transaction";

// =============================================================================
// Alta de un movimiento. El tipo lo define el botón que lo abrió — "Nuevo
// cobro" o "Nuevo gasto" — así que no se elige acá.
// =============================================================================

const EMPTY = { dueDate: "", concept: "", detail: "", amount: "" };

export default function NewMovementDialog({
	type,
	onClose,
	onCreated,
}: {
	/** `null` = cerrado. */
	type: ScheduledType | null;
	onClose: () => void;
	onCreated: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [form, setForm] = useState(EMPTY);
	const [saving, setSaving] = useState(false);

	// Cada apertura arranca limpia, con la fecha de hoy propuesta.
	useEffect(() => {
		if (type) {
			setForm({ ...EMPTY, dueDate: new Date().toLocaleDateString("en-CA") });
		}
	}, [type]);

	const isIncome = type === "income";

	const handleSave = async () => {
		if (!token || !type) return;
		if (!form.concept.trim()) {
			toast.error("Falta el concepto");
			return;
		}
		const amount = Number(form.amount);
		if (!amount || amount <= 0) {
			toast.error("El monto tiene que ser mayor a cero");
			return;
		}

		setSaving(true);
		try {
			const res = await fetch(SCHEDULED_TX_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					type,
					dueDate: form.dueDate,
					concept: form.concept.trim(),
					detail: form.detail.trim() || null,
					amount,
				}),
			});
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				throw new Error(e.error || "No se pudo crear el movimiento");
			}
			toast.success(isIncome ? "Cobro programado" : "Gasto programado");
			onCreated();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={type !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isIncome ? "Nuevo cobro" : "Nuevo gasto"}</DialogTitle>
				</DialogHeader>

				<div className="space-y-3 py-2">
					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">
							{isIncome ? "Cliente / Concepto" : "Concepto"}
						</Label>
						<Input
							value={form.concept}
							onChange={(e) => setForm({ ...form, concept: e.target.value })}
							placeholder={isIncome ? "HP Pérez Juan" : "Indemnización"}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Fecha de vencimiento
							</Label>
							<Input
								type="date"
								value={form.dueDate}
								onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Monto</Label>
							<Input
								type="number"
								inputMode="decimal"
								value={form.amount}
								onChange={(e) => setForm({ ...form, amount: e.target.value })}
								placeholder="0,00"
							/>
						</div>
					</div>

					<div className="space-y-1.5">
						<Label className="text-xs text-muted-foreground">
							Detalle (opcional)
						</Label>
						<Textarea
							rows={2}
							value={form.detail}
							onChange={(e) => setForm({ ...form, detail: e.target.value })}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button onClick={handleSave} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Guardar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
