"use client";

import { Info, Loader2, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Autocomplete } from "@/components/shared/Autocomplete";
import Select from "@/components/shared/SelectSimple";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CASH_ENDPOINT } from "@/constant/api-endpoints";
import { MOVEMENTS } from "@/constant/cash";
import { apiErrorMessage } from "@/lib/api-error";
import type { Transaction } from "@/types/cash";
import type { User } from "@/types/users";
import type { CreditCardWithPending } from "./CreditCardsPanel";

interface EditTransactionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	transaction: Transaction | null;
	/** Para pasar el movimiento a la caja de otra persona. Sin lista, no se muestra el campo (Mi Caja). */
	users?: User[];
	creditCards: CreditCardWithPending[];
	onSaved: () => void;
}

/** "2026-09-25" o "2026-09-25T15:30:00.000Z" → "2026-09-25" (día UTC, como el resto de Caja). */
const toISODate = (value: string) => value.slice(0, 10);

const TYPE_OPTIONS = MOVEMENTS.filter((m) => m.value !== "transfer").map((m) => ({
	value: m.value,
	label: m.label,
}));

/**
 * Edita un movimiento de Caja Principal (PUT /cash/movements/:id). El backend
 * ajusta el saldo por la diferencia y recalcula el cobro del cierre si
 * corresponde; acá solo se bloquea en la UI lo que el backend rechazaría.
 */
export default function EditTransactionDialog({
	open,
	onOpenChange,
	token,
	transaction: t,
	users,
	creditCards,
	onSaved,
}: EditTransactionDialogProps) {
	const [type, setType] = useState("");
	const [subtype, setSubtype] = useState("");
	const [userId, setUserId] = useState<number | null>(null);
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState("");
	const [description, setDescription] = useState("");
	// "cash" o el id de la tarjeta (mismo criterio que el alta).
	const [payment, setPayment] = useState("cash");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open || !t) return;
		setType(t.type);
		setSubtype(t.subtype ?? "");
		setUserId(t.userId);
		setAmount(String(t.amount));
		setDate(toISODate(t.date));
		setDescription(t.description ?? "");
		setPayment(t.paymentMethod === "card" && t.creditCardId ? String(t.creditCardId) : "cash");
	}, [open, t]);

	const isTransfer = t?.type === "transfer";
	const isClosingPayment =
		!!t?.closingId && t.type === "income" && (t.subtype === "fee" || t.subtype === "pcl");
	// Pago de resumen: en efectivo pero con tarjeta asociada.
	const isCardSettlement = !!t && t.paymentMethod !== "card" && !!t.creditCardId;
	const isSettledPurchase = t?.paymentMethod === "card" && !!t.settledByTransactionId;
	const lockAmountAndPayment = isTransfer || isCardSettlement || isSettledPurchase;
	const lockType = lockAmountAndPayment || isClosingPayment;

	const subMovements = MOVEMENTS.find((m) => m.value === type)?.subMovements ?? [];

	const subtypeOptions = useMemo(() => {
		const all = MOVEMENTS.find((m) => m.value === type)?.subMovements ?? [];
		// Subtipos con `restrictedToUserId` (ej. "Alquiler") solo para ese usuario.
		const options = all
			.filter((s) => !s.restrictedToUserId || s.restrictedToUserId === userId)
			.map((s) => ({ value: s.value, label: s.label }));
		// Un subtipo viejo que ya no existe en la lista se conserva.
		if (t && type === t.type && t.subtype && !all.some((s) => s.value === t.subtype)) {
			options.push({ value: t.subtype, label: t.subtype });
		}
		return options;
	}, [type, userId, t]);

	const selectUser = (id: number | null) => {
		setUserId(id);
		const current = subMovements.find((s) => s.value === subtype);
		if (current?.restrictedToUserId && current.restrictedToUserId !== id) setSubtype("");
	};

	const paymentOptions = useMemo(() => {
		const cards = creditCards.filter(
			(c) => c.isActive || (t?.paymentMethod === "card" && c.id === t.creditCardId),
		);
		return [
			{ value: "cash", label: "Efectivo / Transferencia" },
			...cards.map((c) => ({ value: String(c.id), label: c.name })),
		];
	}, [creditCards, t]);

	const changeType = (value: string) => {
		setType(value);
		setSubtype("");
		if (value !== "expense") setPayment("cash");
	};

	const save = async () => {
		if (!t) return;
		const amountNum = Number.parseFloat(amount);
		if (!date || (!isTransfer && (!type || !subtype || !(amountNum > 0)))) {
			toast.error("Completá tipo, subtipo, monto y fecha");
			return;
		}

		// La fecha va solo si cambió: los movimientos creados desde otros
		// módulos traen hora y reenviarla la pisaría con 00:00.
		const payload: Record<string, unknown> = { description };
		if (date !== toISODate(t.date)) payload.date = date;
		if (!isTransfer) {
			payload.type = type;
			payload.subtype = subtype;
			payload.amount = amountNum;
			if (users && userId) payload.userId = userId;
			if (type === "expense" && payment !== "cash") {
				payload.paymentMethod = "card";
				payload.creditCardId = Number(payment);
			} else {
				payload.paymentMethod = "cash";
			}
		}

		setSaving(true);
		try {
			const res = await fetch(`${CASH_ENDPOINT}/movements/${t.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				toast.error(await apiErrorMessage(res, "Error al editar el movimiento"));
				return;
			}
			const result = await res.json();
			toast.success(result.message ?? "Movimiento actualizado.");
			onOpenChange(false);
			onSaved();
		} catch {
			toast.error("Error al editar el movimiento");
		} finally {
			setSaving(false);
		}
	};

	const note = isTransfer
		? "En una transferencia solo se puede cambiar la fecha y la descripción."
		: isCardSettlement
			? "Es el pago del resumen de una tarjeta: el monto sale de las compras que liquida."
			: isSettledPurchase
				? "Esta compra con tarjeta ya se liquidó: no se puede cambiar el monto, el tipo ni el medio de pago."
				: isClosingPayment
					? `Cobro vinculado al cierre #${t?.closingId}: al cambiar el monto se recalcula el estado del cobro.`
					: null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[460px]">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
							<Pencil className="size-5 text-cyan-600 dark:text-cyan-400" />
						</div>
						<div>
							<DialogTitle>Editar movimiento</DialogTitle>
							<DialogDescription>El saldo de la caja se ajusta por la diferencia.</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{note && (
					<div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
						<Info className="mt-0.5 size-4 shrink-0" />
						<p>{note}</p>
					</div>
				)}

				<div className="grid grid-cols-2 gap-4 py-2">
					{!isTransfer && (
						<>
							<div className="space-y-2">
								<Label htmlFor="edit-movement-type">Tipo</Label>
								<Select
									id="edit-movement-type"
									value={type}
									onValueChange={changeType}
									options={TYPE_OPTIONS}
									disabled={lockType}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="edit-movement-subtype">Subtipo</Label>
								<Select
									id="edit-movement-subtype"
									value={subtype}
									onValueChange={setSubtype}
									options={subtypeOptions}
									placeholder="Selecciona subtipo"
									disabled={isClosingPayment}
								/>
							</div>
							{users && (
								<div className="col-span-2 space-y-2">
									<Label htmlFor="edit-movement-user">Usuario</Label>
									<Autocomplete
										id="edit-movement-user"
										value={userId}
										onSelect={selectUser}
										options={users}
										placeholder={t?.user?.name ?? "Nombre del usuario"}
									/>
								</div>
							)}
						</>
					)}
					<div className="space-y-2">
						<Label htmlFor="edit-movement-amount">Monto</Label>
						<Input
							id="edit-movement-amount"
							type="number"
							value={amount}
							onChange={(e) => setAmount(e.target.value)}
							disabled={lockAmountAndPayment}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-movement-date">Fecha</Label>
						<Input
							id="edit-movement-date"
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
						/>
					</div>
					{type === "expense" && !isCardSettlement && (
						<div className="col-span-2 space-y-2">
							<Label htmlFor="edit-movement-payment">Medio de pago</Label>
							<Select
								id="edit-movement-payment"
								value={payment}
								onValueChange={setPayment}
								options={paymentOptions}
								disabled={lockAmountAndPayment}
							/>
						</div>
					)}
					<div className="col-span-2 space-y-2">
						<Label htmlFor="edit-movement-description">Descripción / Detalle</Label>
						<textarea
							id="edit-movement-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={3}
							className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={save} disabled={saving} className="gap-1.5">
						{saving && <Loader2 className="size-4 animate-spin" />}
						Guardar cambios
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
