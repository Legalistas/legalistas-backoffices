"use client";

import { CreditCard as CreditCardIcon, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	CREDIT_CARDS_ENDPOINT,
	CREDIT_CARD_BY_ID_ENDPOINT,
	CREDIT_CARD_SETTLE_ENDPOINT,
} from "@/constant/api-endpoints";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CreditCardWithPending {
	id: number;
	name: string;
	isActive: boolean;
	pendingAmount: number;
	pendingCount: number;
}

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
		amount,
	);

interface CreditCardsPanelProps {
	cards: CreditCardWithPending[];
	onRefetch: () => void;
	accessToken: string | undefined;
	userId: string | undefined;
}

export function CreditCardsPanel({
	cards,
	onRefetch,
	accessToken,
	userId,
}: CreditCardsPanelProps) {
	const { confirm, ConfirmationDialog } = useConfirm();
	const [isNewCardOpen, setIsNewCardOpen] = useState(false);
	const [newCardName, setNewCardName] = useState("");
	const [editingCard, setEditingCard] = useState<CreditCardWithPending | null>(
		null,
	);
	const [editCardName, setEditCardName] = useState("");
	const [settlingCard, setSettlingCard] = useState<CreditCardWithPending | null>(
		null,
	);
	const [settleDate, setSettleDate] = useState(
		new Date().toISOString().substring(0, 10),
	);
	const [saving, setSaving] = useState(false);

	const handleCreateCard = async () => {
		if (!newCardName.trim()) {
			toast.error("Ingresá un nombre para la tarjeta");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch(CREDIT_CARDS_ENDPOINT, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ name: newCardName.trim() }),
			});
			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.message);
			toast.success("Tarjeta agregada");
			setNewCardName("");
			setIsNewCardOpen(false);
			onRefetch();
		} catch (err) {
			toast.error(`Error al agregar la tarjeta: ${(err as Error).message}`);
		} finally {
			setSaving(false);
		}
	};

	const handleSettle = async () => {
		if (!settlingCard) return;
		setSaving(true);
		try {
			const res = await fetch(CREDIT_CARD_SETTLE_ENDPOINT(settlingCard.id), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ date: settleDate, userId }),
			});
			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.message);
			toast.success(result.message);
			setSettlingCard(null);
			onRefetch();
		} catch (err) {
			toast.error(`Error al liquidar el resumen: ${(err as Error).message}`);
		} finally {
			setSaving(false);
		}
	};

	// "Eliminar" = desactivar (isActive=false), no borrar de la base — la
	// tarjeta deja de listarse pero conserva el historial de gastos.
	const handleRemoveCard = async (card: CreditCardWithPending) => {
		const ok = await confirm({
			title: "Quitar tarjeta",
			description: `"${card.name}" deja de aparecer para cargar gastos nuevos. El historial de movimientos ya cargados no se toca.`,
			confirmLabel: "Quitar",
			variant: "destructive",
		});
		if (!ok) return;

		try {
			const res = await fetch(CREDIT_CARD_BY_ID_ENDPOINT(card.id), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ isActive: false }),
			});
			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.message);
			toast.success("Tarjeta quitada");
			onRefetch();
		} catch (err) {
			toast.error(`Error al quitar la tarjeta: ${(err as Error).message}`);
		}
	};

	const handleUpdateCard = async () => {
		if (!editingCard) return;
		if (!editCardName.trim()) {
			toast.error("Ingresá un nombre para la tarjeta");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch(CREDIT_CARD_BY_ID_ENDPOINT(editingCard.id), {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({ name: editCardName.trim() }),
			});
			const result = await res.json();
			if (!res.ok || !result.success) throw new Error(result.message);
			toast.success("Tarjeta actualizada");
			setEditingCard(null);
			onRefetch();
		} catch (err) {
			toast.error(`Error al actualizar la tarjeta: ${(err as Error).message}`);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card className="shadow-sm">
			<CardContent className="flex flex-wrap items-center gap-3 py-4">
				<span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
					<CreditCardIcon className="h-4 w-4" />
					Tarjetas
				</span>
				{cards
					.filter((c) => c.isActive)
					.map((c) => (
						<div
							key={c.id}
							className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5"
						>
							<span className="text-sm font-medium">{c.name}</span>
							<span
								className={`text-sm tabular-nums ${c.pendingAmount > 0 ? "text-amber-700" : "text-muted-foreground"}`}
							>
								{formatCurrency(c.pendingAmount)}
							</span>
							{c.pendingAmount > 0 && (
								<Button
									size="sm"
									variant="outline"
									className="h-7 px-2 text-xs"
									onClick={() => {
										setSettlingCard(c);
										setSettleDate(new Date().toISOString().substring(0, 10));
									}}
								>
									Liquidar resumen
								</Button>
							)}
							<button
								type="button"
								onClick={() => {
									setEditingCard(c);
									setEditCardName(c.name);
								}}
								title="Editar tarjeta"
								className="text-muted-foreground hover:text-foreground"
							>
								<Pencil className="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								onClick={() => handleRemoveCard(c)}
								disabled={c.pendingAmount > 0}
								title={
									c.pendingAmount > 0
										? "Liquidá el resumen pendiente antes de quitarla"
										: "Quitar tarjeta"
								}
								className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						</div>
					))}
				<Button
					size="sm"
					variant="ghost"
					className="h-8 gap-1 text-xs"
					onClick={() => setIsNewCardOpen(true)}
				>
					<Plus className="h-3.5 w-3.5" />
					Nueva tarjeta
				</Button>
			</CardContent>

			{/* Nueva tarjeta */}
			<Dialog open={isNewCardOpen} onOpenChange={setIsNewCardOpen}>
				<DialogContent className="sm:max-w-96">
					<DialogHeader>
						<DialogTitle>Nueva tarjeta</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="new-card-name">Nombre</Label>
						<Input
							id="new-card-name"
							value={newCardName}
							onChange={(e) => setNewCardName(e.target.value)}
							placeholder="Ej: Visa Legalistas"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setIsNewCardOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleCreateCard} disabled={saving}>
							Guardar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Editar tarjeta */}
			<Dialog
				open={!!editingCard}
				onOpenChange={(open) => !open && setEditingCard(null)}
			>
				<DialogContent className="sm:max-w-96">
					<DialogHeader>
						<DialogTitle>Editar tarjeta</DialogTitle>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="edit-card-name">Nombre</Label>
						<Input
							id="edit-card-name"
							value={editCardName}
							onChange={(e) => setEditCardName(e.target.value)}
							placeholder="Ej: Visa Legalistas"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditingCard(null)}>
							Cancelar
						</Button>
						<Button onClick={handleUpdateCard} disabled={saving}>
							Guardar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Liquidar resumen */}
			<Dialog
				open={!!settlingCard}
				onOpenChange={(open) => !open && setSettlingCard(null)}
			>
				<DialogContent className="sm:max-w-96">
					<DialogHeader>
						<DialogTitle>Liquidar resumen — {settlingCard?.name}</DialogTitle>
						<DialogDescription>
							Se va a registrar un egreso en Caja por{" "}
							{formatCurrency(settlingCard?.pendingAmount || 0)} (
							{settlingCard?.pendingCount} gasto
							{settlingCard?.pendingCount === 1 ? "" : "s"}) y esos gastos
							quedan marcados como liquidados.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label htmlFor="settle-date">Fecha de pago</Label>
						<Input
							id="settle-date"
							type="date"
							value={settleDate}
							onChange={(e) => setSettleDate(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSettlingCard(null)}>
							Cancelar
						</Button>
						<Button onClick={handleSettle} disabled={saving}>
							Confirmar pago
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{ConfirmationDialog}
		</Card>
	);
}
