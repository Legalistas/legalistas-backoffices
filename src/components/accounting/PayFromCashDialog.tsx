"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	SCHEDULED_TX_MARK_PAID_ENDPOINT,
	USERS_ENDPOINT,
} from "@/constant/api-endpoints";
import type { ScheduledTransaction } from "@/types/scheduled-transaction";

// =============================================================================
// Confirmación de pago de un gasto.
//
// El movimiento se descuenta de la Caja de alguien, así que hay que elegir de
// quién: el endpoint de marcar pagado recibe ese `userId`. Los cobros no pasan
// por acá — se marcan de un click.
// =============================================================================

const money = (n: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 2,
	}).format(n);

export default function PayFromCashDialog({
	item,
	onClose,
	onPaid,
}: {
	/** `null` = cerrado. */
	item: ScheduledTransaction | null;
	onClose: () => void;
	onPaid: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;

	const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
	const [userId, setUserId] = useState<string>("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!token || !item) return;
		setUserId("");
		(async () => {
			try {
				const res = await fetch(`${USERS_ENDPOINT}?limit=1000000`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok) return;
				const json = await res.json();
				const list = Array.isArray(json) ? json : (json.data ?? []);
				setUsers(
					list.map((u: { id: number; name: string }) => ({
						id: u.id,
						name: u.name,
					})),
				);
			} catch {
				// El diálogo queda sin lista; el usuario ve el select vacío.
			}
		})();
	}, [token, item]);

	const handleConfirm = async () => {
		if (!token || !item || !userId) return;
		setSaving(true);
		try {
			const res = await fetch(SCHEDULED_TX_MARK_PAID_ENDPOINT(item.id), {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ userId: Number(userId) }),
			});
			if (!res.ok) {
				const e = await res.json().catch(() => ({}));
				throw new Error(e.message || "No se pudo registrar el pago");
			}
			toast.success("Pago registrado");
			onPaid();
		} catch (err) {
			toast.error((err as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Confirmar pago</DialogTitle>
					<DialogDescription>
						Se va a descontar {money(Number(item?.amount || 0))} de la Caja del
						usuario que elijas, como un movimiento más.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2 py-2">
					<Label className="text-xs text-muted-foreground">
						Caja de la que sale el pago
					</Label>
					<Select value={userId} onValueChange={setUserId}>
						<SelectTrigger>
							<SelectValue placeholder="Seleccionar usuario" />
						</SelectTrigger>
						<SelectContent>
							{users.map((u) => (
								<SelectItem key={u.id} value={String(u.id)}>
									{u.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancelar
					</Button>
					<Button onClick={handleConfirm} disabled={!userId || saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Confirmar pago
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
