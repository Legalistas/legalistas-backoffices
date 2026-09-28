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
import type { Tarjeta } from "@/types/caja";
import { cajaFetch } from "./api";

// Alta o edición de una tarjeta: el día de cierre decide en qué resumen cae
// la primera cuota de cada compra; el de vencimiento, cuándo se paga.

export default function TarjetaEditDialog({
	open,
	onOpenChange,
	token,
	tarjeta,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	/** null = tarjeta nueva. */
	tarjeta: Tarjeta | null;
	onSaved: () => void;
}) {
	const [nombre, setNombre] = useState("");
	const [diaCierre, setDiaCierre] = useState("");
	const [diaVencimiento, setDiaVencimiento] = useState("");
	const [activa, setActiva] = useState(true);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setNombre(tarjeta?.nombre ?? "");
		setDiaCierre(tarjeta?.diaCierre ? String(tarjeta.diaCierre) : "");
		setDiaVencimiento(tarjeta?.diaVencimiento ? String(tarjeta.diaVencimiento) : "");
		setActiva(tarjeta?.activa ?? true);
	}, [open, tarjeta]);

	const dia = (v: string) => (v.trim() ? Number(v) : null);

	const guardar = async () => {
		if (!nombre.trim()) return toast.error("El nombre es obligatorio");
		for (const v of [diaCierre, diaVencimiento]) {
			const d = dia(v);
			if (d !== null && !(Number.isInteger(d) && d >= 1 && d <= 31)) {
				return toast.error("Los días van del 1 al 31");
			}
		}
		setSaving(true);
		try {
			const json = {
				nombre: nombre.trim(),
				diaCierre: dia(diaCierre),
				diaVencimiento: dia(diaVencimiento),
				...(tarjeta ? { activa } : {}),
			};
			const res = await cajaFetch<{ message: string }>(
				tarjeta ? `/tarjetas/${tarjeta.id}` : "/tarjetas",
				token,
				{ method: tarjeta ? "PUT" : "POST", json },
			);
			toast.success(res.message);
			onSaved();
			onOpenChange(false);
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{tarjeta ? "Editar tarjeta" : "Nueva tarjeta"}</DialogTitle>
					<DialogDescription>
						El día de cierre define en qué resumen cae la primera cuota de cada compra. Los cambios
						valen para las compras nuevas.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="tarjeta-nombre">Nombre</Label>
						<Input
							id="tarjeta-nombre"
							placeholder="Ej.: T.C Patagonia VISA"
							value={nombre}
							onChange={(e) => setNombre(e.target.value)}
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="tarjeta-cierre">Día de cierre</Label>
							<Input
								id="tarjeta-cierre"
								type="number"
								min={1}
								max={31}
								placeholder="Ej.: 25"
								value={diaCierre}
								onChange={(e) => setDiaCierre(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tarjeta-vencimiento">Día de vencimiento</Label>
							<Input
								id="tarjeta-vencimiento"
								type="number"
								min={1}
								max={31}
								placeholder="Ej.: 5"
								value={diaVencimiento}
								onChange={(e) => setDiaVencimiento(e.target.value)}
							/>
						</div>
					</div>
					{tarjeta && (
						<Label className="flex items-center gap-2 font-normal">
							<Checkbox checked={activa} onCheckedChange={(v) => setActiva(v === true)} />
							Activa (se pueden cargar compras)
						</Label>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
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
