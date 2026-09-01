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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	CREDIT_CARDS_ENDPOINT,
	SCHEDULED_TX_BY_ID_ENDPOINT,
	SCHEDULED_TX_ENDPOINT,
} from "@/constant/api-endpoints";
import {
	CREDIT_CARD_CATEGORY,
	EXPENSE_CATEGORIES,
	FIXED_SUBCATEGORIES,
	INCOME_CATEGORIES,
	PAYMENT_METHOD_OPTIONS,
} from "@/constant/scheduled-categories";
import type {
	ScheduledCurrency,
	ScheduledPaymentMethod,
	ScheduledTransaction,
	ScheduledType,
} from "@/types/scheduled-transaction";

// =============================================================================
// Alta y edición de un movimiento.
//
// En el alta, el tipo lo define el botón que lo abrió —"Nuevo cobro" o "Nuevo
// gasto"— así que no se elige acá. En la edición viene del propio registro.
// =============================================================================

const EMPTY = {
	dueDate: "",
	concept: "",
	detail: "",
	amount: "",
	category: "",
	subcategory: "",
	currency: "ARS" as ScheduledCurrency,
	exchangeRate: "",
	paymentMethod: "cash" as ScheduledPaymentMethod,
	offBooksEnabled: false,
	offBooksAmount: "",
};

export default function NewMovementDialog({
	type,
	editing,
	onClose,
	onCreated,
}: {
	/** `null` = cerrado. */
	type: ScheduledType | null;
	/** Presente al editar; ausente en el alta. */
	editing?: ScheduledTransaction | null;
	onClose: () => void;
	onCreated: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [form, setForm] = useState(EMPTY);
	const [saving, setSaving] = useState(false);
	const [fetchingRate, setFetchingRate] = useState(false);
	const [creditCards, setCreditCards] = useState<{ id: number; name: string }[]>([]);

	// Al abrir: los datos del registro si se está editando, o un formulario
	// limpio con la fecha de hoy propuesta si es un alta.
	useEffect(() => {
		if (!type) return;
		setForm(
			editing
				? {
						dueDate: editing.dueDate.slice(0, 10),
						concept: editing.concept,
						detail: editing.detail ?? "",
						amount: String(editing.amount),
						category: editing.category,
						subcategory: editing.subcategory ?? "",
						currency: editing.currency,
						exchangeRate:
							editing.exchangeRate != null ? String(editing.exchangeRate) : "",
						paymentMethod: editing.paymentMethod,
						offBooksEnabled: editing.offBooksAmount != null,
						offBooksAmount:
							editing.offBooksAmount != null ? String(editing.offBooksAmount) : "",
					}
				: { ...EMPTY, dueDate: new Date().toLocaleDateString("en-CA") },
		);
	}, [type, editing]);

	// Tarjetas para la subcategoría de "Créditos / Tarjetas" — mismas que Mi Caja.
	useEffect(() => {
		if (!type || !token) return;
		fetch(CREDIT_CARDS_ENDPOINT, { headers: { Authorization: `Bearer ${token}` } })
			.then((res) => (res.ok ? res.json() : null))
			.then((res) => {
				const cards = (res?.data ?? []) as { id: number; name: string; isActive: boolean }[];
				setCreditCards(cards.filter((c) => c.isActive));
			})
			.catch(() => {});
	}, [type, token]);

	const isIncome = type === "income";
	const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
	const fixedSubcategories = FIXED_SUBCATEGORIES[form.category];
	const isCreditCardCategory = form.category === CREDIT_CARD_CATEGORY;
	const subcategoryOptions = fixedSubcategories ?? creditCards.map((c) => c.name);
	const showSubcategory = Boolean(fixedSubcategories) || isCreditCardCategory;

	const handleCurrencyChange = async (value: string) => {
		const currency = value as ScheduledCurrency;
		setForm((f) => ({ ...f, currency }));
		if (currency !== "USD" || form.exchangeRate) return;
		setFetchingRate(true);
		try {
			const res = await fetch("https://dolarapi.com/v1/dolares/blue");
			if (res.ok) {
				const data = await res.json();
				if (data?.venta) {
					setForm((f) => (f.exchangeRate ? f : { ...f, exchangeRate: String(data.venta) }));
				}
			}
		} catch {
			// La cotización queda vacía y editable a mano.
		} finally {
			setFetchingRate(false);
		}
	};

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
		if (!form.category) {
			toast.error("Falta la categoría");
			return;
		}

		let exchangeRate: number | null = null;
		if (form.currency === "USD") {
			exchangeRate = Number(form.exchangeRate);
			if (!exchangeRate || exchangeRate <= 0) {
				toast.error("Falta la cotización del dólar");
				return;
			}
		}

		let offBooksAmount: number | null = null;
		if (form.offBooksEnabled) {
			offBooksAmount = Number(form.offBooksAmount);
			if (!offBooksAmount || offBooksAmount <= 0 || offBooksAmount > amount) {
				toast.error("El monto en negro tiene que ser mayor a cero y no superar el monto total");
				return;
			}
		}

		setSaving(true);
		try {
			const res = await fetch(
				editing ? SCHEDULED_TX_BY_ID_ENDPOINT(editing.id) : SCHEDULED_TX_ENDPOINT,
				{
					method: editing ? "PUT" : "POST",
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
						category: form.category,
						subcategory: form.subcategory || null,
						currency: form.currency,
						exchangeRate,
						paymentMethod: form.paymentMethod,
						offBooksAmount,
					}),
				},
			);
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				throw new Error(e.error || e.message || "No se pudo crear el movimiento");
			}
			toast.success(
				editing
					? "Movimiento actualizado"
					: isIncome
						? "Cobro programado"
						: "Gasto programado",
			);
			onCreated();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={type !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{editing
							? "Editar movimiento"
							: isIncome
								? "Nuevo cobro"
								: "Nuevo gasto"}
					</DialogTitle>
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

					<div className={showSubcategory ? "grid grid-cols-2 gap-3" : ""}>
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Categoría</Label>
							<Select
								value={form.category}
								onValueChange={(v) => setForm({ ...form, category: v, subcategory: "" })}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Elegir categoría" />
								</SelectTrigger>
								<SelectContent>
									{categories.map((c) => (
										<SelectItem key={c} value={c}>
											{c}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{showSubcategory && (
							<div className="space-y-1.5">
								<Label className="text-xs text-muted-foreground">Subcategoría</Label>
								<Select
									value={form.subcategory}
									onValueChange={(v) => setForm({ ...form, subcategory: v })}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Elegir subcategoría" />
									</SelectTrigger>
									<SelectContent>
										{subcategoryOptions.map((s) => (
											<SelectItem key={s} value={s}>
												{s}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>

					<div className="grid grid-cols-3 gap-3">
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
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Moneda</Label>
							<Select value={form.currency} onValueChange={handleCurrencyChange}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="ARS">$ ARS</SelectItem>
									<SelectItem value="USD">US$ USD</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{form.currency === "USD" && (
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Cotización blue (ARS por USD){fetchingRate && " — buscando..."}
							</Label>
							<Input
								type="number"
								inputMode="decimal"
								value={form.exchangeRate}
								onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
								placeholder="0,00"
							/>
						</div>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">Medio de pago</Label>
							<Select
								value={form.paymentMethod}
								onValueChange={(v) =>
									setForm({ ...form, paymentMethod: v as ScheduledPaymentMethod })
								}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PAYMENT_METHOD_OPTIONS.map((p) => (
										<SelectItem key={p.value} value={p.value}>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-center justify-between rounded-lg border border-input px-3">
							<Label htmlFor="off-books" className="text-xs text-muted-foreground">
								Pago en negro
							</Label>
							<Switch
								id="off-books"
								checked={form.offBooksEnabled}
								onCheckedChange={(checked) =>
									setForm({
										...form,
										offBooksEnabled: checked,
										offBooksAmount: checked ? form.offBooksAmount : "",
									})
								}
							/>
						</div>
					</div>

					{form.offBooksEnabled && (
						<div className="space-y-1.5">
							<Label className="text-xs text-muted-foreground">
								Monto en negro (dentro del total)
							</Label>
							<Input
								type="number"
								inputMode="decimal"
								value={form.offBooksAmount}
								onChange={(e) => setForm({ ...form, offBooksAmount: e.target.value })}
								placeholder="0,00"
							/>
						</div>
					)}

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
