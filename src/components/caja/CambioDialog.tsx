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
import type { Caja } from "@/types/caja";
import { cajaFetch, formatARS, formatUSD, hoyISO, leerNumero } from "./api";
import { type CampoCambio, recalcularCambio, type ValoresCambio } from "./cambio";
import CotizacionSelect, { A_MANO, aTexto, type LadoCotizacion } from "./CotizacionSelect";
import { useCotizaciones } from "./useCajas";

// Compra o venta de dólares. La misma caja tiene pesos y dólares: lo habitual
// es que la plata cambie de moneda dentro de la misma cuenta (Mercado Pago) y
// después los dólares se transfieran a otra. No es un ingreso ni un egreso.
// Se elige con qué dólar se hace la cuenta (MEP, blue… o uno a mano) y con
// los pesos se calculan los dólares, o al revés (ver cambio.ts).

type Operacion = "COMPRA" | "VENTA";
const MISMA = "misma";
const CASA_INICIAL = "bolsa"; // MEP: el dólar que vende Mercado Pago.
const VACIO: ValoresCambio = { pesos: "", dolares: "", cotizacion: "" };

/** Quien compra dólares paga el precio de "venta"; quien vende recibe el de "compra". */
const ladoDe = (operacion: Operacion): LadoCotizacion =>
	operacion === "COMPRA" ? "venta" : "compra";

interface CambioDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	cajas: { caja: Caja; label: string }[];
	defaultCajaId?: number | null;
	onSaved: () => void;
}

export default function CambioDialog({
	open,
	onOpenChange,
	token,
	cajas,
	defaultCajaId,
	onSaved,
}: CambioDialogProps) {
	const cotizaciones = useCotizaciones(token, open);
	const [operacion, setOperacion] = useState<Operacion>("COMPRA");
	const [cajaPesosId, setCajaPesosId] = useState("");
	const [cajaDolaresId, setCajaDolaresId] = useState(MISMA);
	const [valores, setValores] = useState<ValoresCambio>(VACIO);
	// Qué campos se tocaron, del más viejo al más nuevo: los dos últimos
	// quedan fijos y el tercero se calcula.
	const [editados, setEditados] = useState<CampoCambio[]>([]);
	const [casa, setCasa] = useState(CASA_INICIAL);
	const [fecha, setFecha] = useState(hoyISO());
	const [descripcion, setDescripcion] = useState("");
	const [saving, setSaving] = useState(false);

	// Al abrir: compra, con el MEP propuesto si las cotizaciones ya están
	// cargadas (si llegan después, las toma el efecto de más abajo).
	// biome-ignore lint/correctness/useExhaustiveDependencies: se arma solo al abrir
	useEffect(() => {
		if (!open) return;
		const inicial = cajas.find((c) => c.caja.id === defaultCajaId) ?? cajas[0];
		const mep = cotizaciones.find((c) => c.casa === CASA_INICIAL) ?? cotizaciones[0];
		setOperacion("COMPRA");
		setCajaPesosId(inicial ? String(inicial.caja.id) : "");
		setCajaDolaresId(MISMA);
		setValores(mep ? { ...VACIO, cotizacion: aTexto(mep[ladoDe("COMPRA")]) } : VACIO);
		setEditados(mep ? ["cotizacion"] : []);
		setCasa(mep ? mep.casa : CASA_INICIAL);
		setFecha(hoyISO());
		setDescripcion("");
	}, [open, defaultCajaId, cajas]);

	const compra = operacion === "COMPRA";
	const lado = ladoDe(operacion);

	const aplicar = (campo: CampoCambio, texto: string, base = valores, orden = editados) => {
		const r = recalcularCambio(base, orden, campo, texto);
		setValores(r.valores);
		setEditados(r.editados);
		// Si la cotización salió de los dos montos, ya no es la del selector.
		if (r.calculado === "cotizacion") setCasa(A_MANO);
	};

	/** Toma la cotización de un tipo de dólar, del lado que corresponde a la operación. */
	const usarCasa = (nueva: string, op: Operacion = operacion) => {
		setCasa(nueva);
		const elegida = cotizaciones.find((c) => c.casa === nueva);
		if (elegida) aplicar("cotizacion", aTexto(elegida[ladoDe(op)]));
	};

	// Las cotizaciones llegaron con el diálogo ya abierto: se propone el MEP
	// si todavía no hay valor cargado.
	// biome-ignore lint/correctness/useExhaustiveDependencies: solo cuando llegan las cotizaciones
	useEffect(() => {
		if (!open || cotizaciones.length === 0 || valores.cotizacion) return;
		const elegida = cotizaciones.find((c) => c.casa === casa) ?? cotizaciones[0];
		setCasa(elegida.casa);
		aplicar("cotizacion", aTexto(elegida[lado]));
	}, [cotizaciones]);

	const cambiarOperacion = (op: Operacion) => {
		setOperacion(op);
		// Comprar y vender tienen precios distintos del mismo dólar.
		if (casa !== A_MANO) usarCasa(casa, op);
	};

	const cajaPesos = cajas.find((c) => String(c.caja.id) === cajaPesosId)?.caja;
	const cajaDolares =
		cajaDolaresId === MISMA
			? cajaPesos
			: cajas.find((c) => String(c.caja.id) === cajaDolaresId)?.caja;
	const pesosNum = leerNumero(valores.pesos);
	const dolaresNum = leerNumero(valores.dolares);
	const valida = pesosNum > 0 && dolaresNum > 0;
	// A cuánto sale cada dólar. Si la diferencia con la cotización elegida es
	// solo el redondeo a centavos de los dólares, se muestra la elegida.
	const cotizacionNum = leerNumero(valores.cotizacion);
	const efectiva = valida ? pesosNum / dolaresNum : 0;
	const porDolar = Math.abs(efectiva - cotizacionNum) <= 0.011 ? cotizacionNum : efectiva;

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

	const soloNumero = (texto: string) => texto.replace(/[^\d.,]/g, "");
	const campoPesos = (
		<div className="space-y-2">
			<Label htmlFor="cambio-pesos">{compra ? "Pesos que salen" : "Pesos que entran"}</Label>
			<Input
				id="cambio-pesos"
				inputMode="decimal"
				placeholder="0,00"
				value={valores.pesos}
				onChange={(e) => aplicar("pesos", soloNumero(e.target.value))}
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
				value={valores.dolares}
				onChange={(e) => aplicar("dolares", soloNumero(e.target.value))}
			/>
		</div>
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-md">
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
								variant={operacion === op ? "default" : "outline"}
								onClick={() => cambiarOperacion(op)}
								aria-pressed={operacion === op}
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
									<span className="tabular-nums">{formatUSD(cajaDolares.saldoUsd ?? 0)}</span>
								</>
							)}
						</p>
					)}

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label>Cotización</Label>
							<CotizacionSelect
								cotizaciones={cotizaciones}
								value={casa}
								onChange={usarCasa}
								lado={lado}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="cambio-cotizacion">Valor del dólar</Label>
							<Input
								id="cambio-cotizacion"
								inputMode="decimal"
								placeholder="0,00"
								value={valores.cotizacion}
								onChange={(e) => {
									setCasa(A_MANO);
									aplicar("cotizacion", soloNumero(e.target.value));
								}}
							/>
						</div>
					</div>
					<p className="-mt-2 text-xs text-muted-foreground">
						{compra
							? "Lo que pagás por cada dólar que comprás."
							: "Lo que te pagan por cada dólar que vendés."}{" "}
						Podés elegir otro dólar o escribir el valor a mano.
					</p>

					<div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
						{compra ? campoPesos : campoDolares}
						<ArrowRight className="mb-2.5 h-4 w-4 text-muted-foreground" />
						{compra ? campoDolares : campoPesos}
					</div>
					<div
						className={cn(
							"rounded-md px-3 py-2 text-sm",
							valida ? "bg-primary/10 text-foreground" : "bg-muted/50 text-muted-foreground",
						)}
					>
						{valida ? (
							<>
								{compra ? "Comprás" : "Vendés"}{" "}
								<span className="font-semibold tabular-nums">{formatUSD(dolaresNum)}</span>{" "}
								{compra ? "con" : "y recibís"}{" "}
								<span className="font-semibold tabular-nums">{formatARS(pesosNum)}</span>, a{" "}
								<span className="font-semibold tabular-nums">{formatARS(porDolar)}</span>{" "}
								por dólar.
							</>
						) : (
							"Escribí los pesos o los dólares: el otro monto se calcula con la cotización. Si escribís los dos, se calcula la cotización."
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
