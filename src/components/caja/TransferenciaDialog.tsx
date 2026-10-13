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
import type { Caja, CajaMoneda } from "@/types/caja";
import { cajaFetch, formatMonto, hoyISO, leerNumero, MONEDA_LABEL } from "./api";

// Una caja de Brixar como destino: es una "transferencia externa". Sale de la
// caja de acá y Brixar registra sola la entrada en la suya. Solo en pesos.
const BRIXAR = "brixar:";
type CajaBrixar = { id: string; nombre: string };

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
	brixar = [],
}: {
	value: string;
	onChange: (v: string) => void;
	cajas: { caja: Caja; label: string }[];
	excluir: string;
	placeholder: string;
	brixar?: CajaBrixar[];
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
				{brixar.map((c) => (
					<SelectItem key={c.id} value={`${BRIXAR}${c.id}`}>
						Brixar · {c.nombre}
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
	const [moneda, setMoneda] = useState<CajaMoneda>("ARS");
	const [fecha, setFecha] = useState(hoyISO());
	const [descripcion, setDescripcion] = useState("");
	const [saving, setSaving] = useState(false);
	const [cajasBrixar, setCajasBrixar] = useState<CajaBrixar[]>([]);
	const [avisoBrixar, setAvisoBrixar] = useState("");

	// Las cajas de Brixar como destino. Si no se pueden traer, no se ofrecen y
	// se dice por qué (antes faltaban sin explicación).
	useEffect(() => {
		if (!open || !token) return;
		setAvisoBrixar("");
		cajaFetch<{ configurado: boolean; cajas: CajaBrixar[] }>("/brixar", token)
			.then((r) => {
				setCajasBrixar(r.cajas);
				if (!r.configurado) setAvisoBrixar("la integración con Brixar no está configurada");
				else if (r.cajas.length === 0) setAvisoBrixar("Brixar no devolvió ninguna caja");
			})
			.catch((e) => {
				setCajasBrixar([]);
				setAvisoBrixar((e as Error).message);
			});
	}, [open, token]);

	useEffect(() => {
		if (!open) return;
		setMoneda("ARS");
		setOrigenId("");
		setDestinoId("");
		setMonto("");
		setFecha(hoyISO());
		setDescripcion("");
	}, [open]);

	const aBrixar = destinoId.startsWith(BRIXAR);
	const origen = cajas.find((c) => String(c.caja.id) === origenId)?.caja;
	const montoNum = leerNumero(monto);
	// Cada caja tiene un saldo por moneda: se mira el de la moneda elegida.
	const saldoOrigen = origen ? (moneda === "USD" ? origen.saldoUsd : origen.saldo) : 0;
	const quedaNegativo = origen && montoNum > 0 && saldoOrigen - montoNum < 0;

	const guardar = async () => {
		if (!origenId || !destinoId || !fecha || !(montoNum > 0)) {
			toast.error("Completá origen, destino, monto y fecha");
			return;
		}
		setSaving(true);
		try {
			if (aBrixar) {
				await cajaFetch("/transferencias-externas", token, {
					method: "POST",
					json: {
						origenId: Number(origenId),
						cajaBrixarId: destinoId.slice(BRIXAR.length),
						monto: montoNum,
						fecha,
						descripcion,
					},
				});
			} else {
				await cajaFetch("/transferencias", token, {
					method: "POST",
					json: {
						origenId: Number(origenId),
						destinoId: Number(destinoId),
						monto: montoNum,
						moneda,
						fecha,
						descripcion,
					},
				});
			}
			toast.success(
				aBrixar ? "Transferencia registrada acá y en Brixar" : "Transferencia registrada",
			);
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
						Saca el monto de una caja y lo suma en otra, en pesos o en dólares. No cuenta como
						ingreso ni egreso en la Caja General.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-2">
						{(["ARS", "USD"] as const).map((m) => (
							<Button
								key={m}
								type="button"
								variant={moneda === m ? "default" : "outline"}
								aria-pressed={moneda === m}
								disabled={aBrixar && m === "USD"}
								onClick={() => setMoneda(m)}
							>
								{MONEDA_LABEL[m]}
							</Button>
						))}
					</div>
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
								onChange={(v) => {
									setDestinoId(v);
									if (v.startsWith(BRIXAR)) setMoneda("ARS");
								}}
								cajas={cajas}
								excluir={origenId}
								placeholder="Destino"
								brixar={cajasBrixar}
							/>
						</div>
					</div>
					{avisoBrixar && (
						<p className="text-xs text-amber-600">
							No se pueden ofrecer las cajas de Brixar como destino: {avisoBrixar}.
						</p>
					)}
					{aBrixar && (
						<p className="rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
							Transferencia externa: la plata sale de esta caja y entra sola en la caja de Brixar.
							No hay que cargarla allá.
						</p>
					)}
					{origen && (
						<p className="text-xs text-muted-foreground">
							Saldo de {origen.nombre}:{" "}
							<span className="tabular-nums">{formatMonto(saldoOrigen, moneda)}</span>
						</p>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="tr-monto">{moneda === "USD" ? "Monto en dólares" : "Monto"}</Label>
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
						<p className="text-xs text-amber-600">
							Ojo: {origen.nombre} queda con saldo negativo{moneda === "USD" ? " en dólares" : ""}.
						</p>
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
