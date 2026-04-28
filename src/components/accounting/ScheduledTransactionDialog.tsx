"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import type {
	ScheduledFormPayload,
	ScheduledTransaction,
	ScheduledType,
} from "@/types/scheduled-transaction";

interface Props {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	type: ScheduledType;
	editing?: ScheduledTransaction | null;
	onSubmit: (payload: ScheduledFormPayload) => Promise<void>;
}

const toDateInput = (iso: string | null | undefined): string => {
	if (!iso) return "";
	return iso.slice(0, 10);
};

export default function ScheduledTransactionDialog({
	open,
	onOpenChange,
	type,
	editing,
	onSubmit,
}: Props) {
	const [dueDate, setDueDate] = useState("");
	const [concept, setConcept] = useState("");
	const [detail, setDetail] = useState("");
	const [amount, setAmount] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		if (editing) {
			setDueDate(toDateInput(editing.dueDate));
			setConcept(editing.concept);
			setDetail(editing.detail ?? "");
			setAmount(String(editing.amount));
		} else {
			setDueDate(new Date().toISOString().slice(0, 10));
			setConcept("");
			setDetail("");
			setAmount("");
		}
	}, [open, editing]);

	const isIncome = type === "income";
	const title = editing
		? isIncome
			? "Editar cobro"
			: "Editar gasto"
		: isIncome
			? "Nuevo cobro"
			: "Nuevo gasto";
	const conceptLabel = isIncome ? "Cobro" : "Concepto";
	const conceptPlaceholder = isIncome
		? "Ej: CL ESPINDOLA BRIAN"
		: "Ej: TGI, EPE, HONORARIOS BURKETT";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const amountNum = Number(amount);
		if (!dueDate || !concept.trim() || !Number.isFinite(amountNum) || amountNum < 0) {
			return;
		}
		setSaving(true);
		try {
			await onSubmit({
				type,
				dueDate,
				concept: concept.trim(),
				detail: detail.trim() || null,
				amount: amountNum,
			});
			onOpenChange(false);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="dueDate">Fecha</Label>
						<Input
							id="dueDate"
							type="date"
							value={dueDate}
							onChange={(e) => setDueDate(e.target.value)}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="concept">{conceptLabel}</Label>
						<Input
							id="concept"
							value={concept}
							onChange={(e) => setConcept(e.target.value)}
							placeholder={conceptPlaceholder}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="detail">Detalle (opcional)</Label>
						<Textarea
							id="detail"
							value={detail}
							onChange={(e) => setDetail(e.target.value)}
							placeholder="Ej: ULTIMO PAGO, semana 20, etc."
							rows={2}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="amount">Monto</Label>
						<Input
							id="amount"
							type="number"
							inputMode="decimal"
							step="0.01"
							min="0"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							placeholder="0.00"
							required
						/>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={saving}
						>
							Cancelar
						</Button>
						<Button type="submit" disabled={saving}>
							{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{editing ? "Guardar" : "Crear"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
