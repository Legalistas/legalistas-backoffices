"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Caja } from "@/types/caja";
import { cajaFetch, leerNumero } from "./api";

/** Admins: nombre, saldo inicial en pesos y en dólares (con los que arranca la caja) y activa. */
export default function CajaEditDialog({
	caja,
	onClose,
	token,
	onSaved,
}: {
	caja: Caja | null;
	onClose: () => void;
	token: string | undefined;
	onSaved: () => void;
}) {
	const [nombre, setNombre] = useState("");
	const [saldoInicial, setSaldoInicial] = useState("");
	const [saldoInicialUsd, setSaldoInicialUsd] = useState("");
	const [activa, setActiva] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!caja) return;
		setNombre(caja.nombre);
		setSaldoInicial(String(caja.saldoInicial).replace(".", ","));
		setSaldoInicialUsd(String(caja.saldoInicialUsd).replace(".", ","));
		setActiva(caja.activa);
	}, [caja]);

	const guardar = async () => {
		if (!caja || !nombre.trim()) {
			toast.error("El nombre es obligatorio");
			return;
		}
		// Igual que el monto: coma o punto como decimal, sin separador de miles.
		const saldo = leerNumero(saldoInicial || "0");
		const saldoUsd = leerNumero(saldoInicialUsd || "0");
		if (!Number.isFinite(saldo) || !Number.isFinite(saldoUsd)) {
			toast.error("Saldo inicial inválido");
			return;
		}
		setSaving(true);
		try {
			await cajaFetch(`/cajas/${caja.id}`, token, {
				method: "PUT",
				json: caja.esContenedora
					? { nombre, activa }
					: { nombre, activa, saldoInicial: saldo, saldoInicialUsd: saldoUsd },
			});
			toast.success("Caja actualizada");
			onClose();
			onSaved();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={!!caja} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Editar caja</DialogTitle>
					{caja?.esContenedora && (
						<DialogDescription>
							Su saldo es la suma de las sub-cajas; el saldo inicial se carga en cada una.
						</DialogDescription>
					)}
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="caja-nombre">Nombre</Label>
						<Input id="caja-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
					</div>
					{!caja?.esContenedora && (
						<div className="space-y-2">
							<Label htmlFor="caja-saldo-inicial">Saldo inicial</Label>
							<Input
								id="caja-saldo-inicial"
								inputMode="decimal"
								value={saldoInicial}
								onChange={(e) => setSaldoInicial(e.target.value.replace(/[^\d.,-]/g, ""))}
							/>
							<p className="text-xs text-muted-foreground">
								El saldo con el que arranca la caja. Se suma a los movimientos.
							</p>
						</div>
					)}
					{!caja?.esContenedora && (
						<div className="space-y-2">
							<Label htmlFor="caja-saldo-inicial-usd">Saldo inicial en dólares</Label>
							<Input
								id="caja-saldo-inicial-usd"
								inputMode="decimal"
								value={saldoInicialUsd}
								onChange={(e) => setSaldoInicialUsd(e.target.value.replace(/[^d.,-]/g, ""))}
							/>
							<p className="text-xs text-muted-foreground">
								Los dólares que ya había en la cuenta. Dejalo en 0 si no tenía.
							</p>
						</div>
					)}
					<Label className="flex items-center gap-2 font-normal">
						<Checkbox checked={activa} onCheckedChange={(v) => setActiva(v === true)} />
						Activa (las inactivas no se muestran ni reciben movimientos)
					</Label>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Guardar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
