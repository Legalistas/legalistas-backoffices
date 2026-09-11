"use client";

import { ArrowRight, Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Caja } from "@/types/caja";
import { cajaFetch, formatARS, hoyISO } from "./api";

interface TransferenciaDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	cajas: { caja: Caja; label: string }[];
	onSaved: () => void;
}

function CajaSelect({
	value,
	onChange,
	cajas,
	excluir,
	placeholder,
}: {
	value: string;
	onChange: (v: string) => void;
	cajas: { caja: Caja; label: string }[];
	excluir: string;
	placeholder: string;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-full">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{cajas
					.filter(({ caja }) => String(caja.id) !== excluir)
					.map(({ caja, label }) => (
						<SelectItem key={caja.id} value={String(caja.id)}>
							{label}
						</SelectItem>
					))}
			</SelectContent>
		</Select>
	);
}

export default function TransferenciaDialog({
	open,
	onOpenChange,
	token,
	cajas,
	onSaved,
}: TransferenciaDialogProps) {
	const [origenId, setOrigenId] = useState("");
	const [destinoId, setDestinoId] = useState("");
	const [monto, setMonto] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [descripcion, setDescripcion] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setOrigenId("");
		setDestinoId("");
		setMonto("");
		setFecha(hoyISO());
		setDescripcion("");
	}, [open]);

	const origen = cajas.find((c) => String(c.caja.id) === origenId)?.caja;
	const montoNum = Number(monto.replace(",", "."));
	const quedaNegativo = origen && montoNum > 0 && origen.saldo - montoNum < 0;

	const guardar = async () => {
		if (!origenId || !destinoId || !fecha || !(montoNum > 0)) {
			toast.error("Completá origen, destino, monto y fecha");
			return;
		}
		setSaving(true);
		try {
			await cajaFetch("/transferencias", token, {
				method: "POST",
				json: {
					origenId: Number(origenId),
					destinoId: Number(destinoId),
					monto: montoNum,
					fecha,
					descripcion,
				},
			});
			toast.success("Transferencia registrada");
			onOpenChange(false);
			onSaved();
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
					<DialogTitle>Transferencia entre cajas</DialogTitle>
					<DialogDescription>
						Saca el monto de una caja y lo suma en otra. No cuenta como ingreso ni egreso en la Caja
						General.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
						<div className="space-y-2">
							<Label>Desde</Label>
							<CajaSelect
								value={origenId}
								onChange={setOrigenId}
								cajas={cajas}
								excluir={destinoId}
								placeholder="Origen"
							/>
						</div>
						<ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground" />
						<div className="space-y-2">
							<Label>Hacia</Label>
							<CajaSelect
								value={destinoId}
								onChange={setDestinoId}
								cajas={cajas}
								excluir={origenId}
								placeholder="Destino"
							/>
						</div>
					</div>
					{origen && (
						<p className="text-xs text-muted-foreground">
							Saldo de {origen.nombre}:{" "}
							<span className="tabular-nums">{formatARS(origen.saldo)}</span>
						</p>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="tr-monto">Monto</Label>
							<Input
								id="tr-monto"
								inputMode="decimal"
								placeholder="0,00"
								value={monto}
								onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="tr-fecha">Fecha</Label>
							<Input
								id="tr-fecha"
								type="date"
								value={fecha}
								onChange={(e) => setFecha(e.target.value)}
							/>
						</div>
					</div>
					{quedaNegativo && (
						<p className="text-xs text-amber-600">Ojo: {origen.nombre} queda con saldo negativo.</p>
					)}

					<div className="space-y-2">
						<Label htmlFor="tr-desc">Descripción (opcional)</Label>
						<Textarea
							id="tr-desc"
							rows={2}
							value={descripcion}
							onChange={(e) => setDescripcion(e.target.value)}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Transferir
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
