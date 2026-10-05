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
import { cn } from "@/lib/utils";
import type { Caja, CotizacionDolar } from "@/types/caja";
import { cajaFetch, formatARS, formatUSD, hoyISO, leerNumero } from "./api";

// Compra o venta de dólares. La misma caja tiene pesos y dólares: lo habitual
// es que la plata cambie de moneda dentro de la misma cuenta (Mercado Pago) y
// después los dólares se transfieran a otra. No es un ingreso ni un egreso.

type Operacion = "COMPRA" | "VENTA";
const MISMA = "misma";

interface CambioDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	cajas: { caja: Caja; label: string }[];
	/** MEP del día, solo como referencia: la cotización es la de la operación. */
	cotizacion: CotizacionDolar | null;
	defaultCajaId?: number | null;
	onSaved: () => void;
}

export default function CambioDialog({
	open,
	onOpenChange,
	token,
	cajas,
	cotizacion,
	defaultCajaId,
	onSaved,
}: CambioDialogProps) {
	const [operacion, setOperacion] = useState<Operacion>("COMPRA");
	const [cajaPesosId, setCajaPesosId] = useState("");
	const [cajaDolaresId, setCajaDolaresId] = useState(MISMA);
	const [pesos, setPesos] = useState("");
	const [dolares, setDolares] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [descripcion, setDescripcion] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		const inicial = cajas.find((c) => c.caja.id === defaultCajaId) ?? cajas[0];
		setOperacion("COMPRA");
		setCajaPesosId(inicial ? String(inicial.caja.id) : "");
		setCajaDolaresId(MISMA);
		setPesos("");
		setDolares("");
		setFecha(hoyISO());
		setDescripcion("");
	}, [open, defaultCajaId, cajas]);

	const compra = operacion === "COMPRA";
	const cajaPesos = cajas.find((c) => String(c.caja.id) === cajaPesosId)?.caja;
	const cajaDolares =
		cajaDolaresId === MISMA
			? cajaPesos
			: cajas.find((c) => String(c.caja.id) === cajaDolaresId)?.caja;
	const pesosNum = leerNumero(pesos);
	const dolaresNum = leerNumero(dolares);
	const valida = pesosNum > 0 && dolaresNum > 0;
	const porDolar = valida ? pesosNum / dolaresNum : null;

	const aviso =
		compra && cajaPesos && pesosNum > cajaPesos.saldo
			? `Ojo: ${cajaPesos.nombre} queda con saldo negativo en pesos.`
			: !compra && cajaDolares && dolaresNum > cajaDolares.saldoUsd
				? `Ojo: ${cajaDolares.nombre} no tiene tantos dólares (${formatUSD(cajaDolares.saldoUsd)}).`
				: null;

	const guardar = async () => {
		if (!cajaPesos || !cajaDolares || !fecha || !valida) {
			toast.error("Completá la caja, los pesos, los dólares y la fecha");
			return;
		}
		setSaving(true);
		try {
			const res = await cajaFetch<{ message: string }>("/cambios", token, {
				method: "POST",
				json: {
					operacion,
					cajaPesosId: cajaPesos.id,
					cajaDolaresId: cajaDolares.id,
					pesos: pesosNum,
					dolares: dolaresNum,
					fecha,
					descripcion,
				},
			});
			toast.success(res.message);
			onOpenChange(false);
			onSaved();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	const campoPesos = (
		<div className="space-y-2">
			<Label htmlFor="cambio-pesos">{compra ? "Pesos que salen" : "Pesos que entran"}</Label>
			<Input
				id="cambio-pesos"
				inputMode="decimal"
				placeholder="0,00"
				value={pesos}
				onChange={(e) => setPesos(e.target.value.replace(/[^\d.,]/g, ""))}
			/>
		</div>
	);
	const campoDolares = (
		<div className="space-y-2">
			<Label htmlFor="cambio-dolares">{compra ? "Dólares que entran" : "Dólares que salen"}</Label>
			<Input
				id="cambio-dolares"
				inputMode="decimal"
				placeholder="0,00"
				value={dolares}
				onChange={(e) => setDolares(e.target.value.replace(/[^\d.,]/g, ""))}
			/>
		</div>
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Comprar o vender dólares</DialogTitle>
					<DialogDescription>
						La plata cambia de moneda, no sale de la empresa: no cuenta como ingreso ni como egreso.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-2">
						{(["COMPRA", "VENTA"] as const).map((op) => (
							<Button
								key={op}
								type="button"
								variant="outline"
								onClick={() => setOperacion(op)}
								className={cn(operacion === op && "border-primary bg-primary/10 text-primary")}
							>
								{op === "COMPRA" ? "Comprar dólares" : "Vender dólares"}
							</Button>
						))}
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label>Caja de los pesos</Label>
							<Select value={cajaPesosId} onValueChange={setCajaPesosId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Seleccionar caja" />
								</SelectTrigger>
								<SelectContent>
									{cajas.map(({ caja, label }) => (
										<SelectItem key={caja.id} value={String(caja.id)}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Caja de los dólares</Label>
							<Select value={cajaDolaresId} onValueChange={setCajaDolaresId}>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={MISMA}>La misma</SelectItem>
									{cajas
										.filter(({ caja }) => String(caja.id) !== cajaPesosId)
										.map(({ caja, label }) => (
											<SelectItem key={caja.id} value={String(caja.id)}>
												{label}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
					</div>
					{cajaPesos && (
						<p className="text-xs text-muted-foreground">
							{cajaPesos.nombre}: <span className="tabular-nums">{formatARS(cajaPesos.saldo)}</span>
							{cajaDolares && (
								<>
									{" · "}
									{cajaDolares.id !== cajaPesos.id && `${cajaDolares.nombre}: `}
									<span className="tabular-nums">{formatUSD(cajaDolares.saldoUsd)}</span>
								</>
							)}
						</p>
					)}

					<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
						{compra ? campoPesos : campoDolares}
						<ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground" />
						{compra ? campoDolares : campoPesos}
					</div>
					<div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
						<p>
							Cotización de la operación:{" "}
							<span className="font-medium tabular-nums">
								{porDolar ? `${formatARS(porDolar)} por dólar` : "—"}
							</span>
						</p>
						{cotizacion && (
							<p className="text-xs text-muted-foreground">
								Dólar MEP de referencia: compra {formatARS(cotizacion.compra)} · venta{" "}
								{formatARS(cotizacion.venta)}
							</p>
						)}
					</div>
					{aviso && <p className="text-xs text-amber-600">{aviso}</p>}

					<div className="space-y-2">
						<Label htmlFor="cambio-fecha">Fecha</Label>
						<Input
							id="cambio-fecha"
							type="date"
							value={fecha}
							onChange={(e) => setFecha(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="cambio-desc">Descripción (opcional)</Label>
						<Textarea
							id="cambio-desc"
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
						{compra ? "Registrar compra" : "Registrar venta"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
