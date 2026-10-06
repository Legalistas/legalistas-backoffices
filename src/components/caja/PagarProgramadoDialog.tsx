"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { CajaMoneda, CajasResponse, ProgramadoACobrar } from "@/types/caja";
import {
	CajaApiError,
	cajaFetch,
	cajasOperables,
	formatARS,
	formatUSD,
	hoyISO,
	leerNumero,
	MONEDA_LABEL,
} from "./api";
import CotizacionSelect, { A_MANO, aTexto } from "./CotizacionSelect";
import { useCotizaciones, useRubros } from "./useCajas";

// Gastos e Ingresos → Caja Contable: cobrar o pagar una fila pendiente la
// registra como ingreso/egreso en la caja elegida y la deja pagada (vinculada
// al movimiento). Las filas de un cierre van por RegistrarCobroDialog.
// Una fila cargada en dólares se puede pagar en dólares (del saldo en dólares
// de la caja elegida) o en pesos, convertida a la cotización que se elija.

const SIN_SUBRUBRO = "none";
const CASA_MEP = "bolsa";

export default function PagarProgramadoDialog({
	programadoId,
	onClose,
	onPaid,
}: {
	/** null = cerrado. */
	programadoId: number | null;
	onClose: () => void;
	onPaid: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const open = programadoId !== null;

	const [fila, setFila] = useState<ProgramadoACobrar | null>(null);
	const [cajas, setCajas] = useState<CajasResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cajaId, setCajaId] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [rubroId, setRubroId] = useState("");
	const [subRubroId, setSubRubroId] = useState(SIN_SUBRUBRO);
	// Fila en dólares: moneda que eligió la persona (null = la que se propone).
	const [monedaElegida, setMonedaElegida] = useState<CajaMoneda | null>(null);
	const [cotizacion, setCotizacion] = useState("");
	const [casa, setCasa] = useState(A_MANO);
	const [saving, setSaving] = useState(false);
	const { rubros } = useRubros(token, open);
	const filaEnDolares = fila?.currency === "USD";
	const cotizaciones = useCotizaciones(token, open && filaEnDolares);

	useEffect(() => {
		if (!open || !token) return;
		setFila(null);
		setError(null);
		setCajaId("");
		setFecha(hoyISO());
		setMonedaElegida(null);
		setCotizacion("");
		setCasa(A_MANO);
		Promise.all([
			cajaFetch<{ data: ProgramadoACobrar }>(`/programados/${programadoId}`, token),
			cajaFetch<{ data: CajasResponse }>("/cajas", token),
		])
			.then(([f, c]) => {
				setFila(f.data);
				setCajas(c.data);
				setRubroId(f.data.rubroId ? String(f.data.rubroId) : "");
				setSubRubroId(f.data.subRubroId ? String(f.data.subRubroId) : SIN_SUBRUBRO);
				// Arranca con la cotización cargada en la fila; sin ella, el MEP.
				setCotizacion(f.data.exchangeRate ? aTexto(f.data.exchangeRate) : "");
				setCasa(f.data.exchangeRate ? A_MANO : CASA_MEP);
			})
			.catch((err) =>
				setError(
					err instanceof CajaApiError && err.status === 403
						? "Tu usuario no tiene acceso a la Caja."
						: (err as Error).message,
				),
			);
	}, [open, token, programadoId]);

	const operables = useMemo(() => (cajas ? cajasOperables(cajas.cajas) : []), [cajas]);
	const ingreso = fila?.type === "income";
	const tipo = ingreso ? "INGRESO" : "EGRESO";
	const rubrosDelTipo = rubros.filter((r) => r.activo && (r.tipo === tipo || r.tipo === "AMBOS"));
	const rubro = rubros.find((r) => String(r.id) === rubroId);
	const cajaSel = operables.find((o) => String(o.caja.id) === cajaId)?.caja;

	// La fila no traía cotización: se propone la del dólar elegido cuando llega.
	// biome-ignore lint/correctness/useExhaustiveDependencies: solo al llegar las cotizaciones
	useEffect(() => {
		if (!filaEnDolares || cotizacion || casa === A_MANO) return;
		const elegida = cotizaciones.find((c) => c.casa === casa) ?? cotizaciones[0];
		if (elegida) setCotizacion(aTexto(elegida.venta));
	}, [cotizaciones, filaEnDolares]);

	const usarCasa = (nueva: string) => {
		setCasa(nueva);
		const elegida = cotizaciones.find((c) => c.casa === nueva);
		if (elegida) setCotizacion(aTexto(elegida.venta));
	};

	const dolares = fila?.amount ?? 0;
	const cotizacionNum = leerNumero(cotizacion);
	// En qué moneda sale: la elegida o, si la caja tiene los dólares, en dólares.
	const moneda: CajaMoneda = !filaEnDolares
		? "ARS"
		: (monedaElegida ?? (cajaSel && (cajaSel.saldoUsd ?? 0) >= dolares ? "USD" : "ARS"));
	const enDolares = moneda === "USD";
	const pesos = filaEnDolares
		? Math.round(dolares * cotizacionNum * 100) / 100
		: (fila?.montoPesos ?? 0);
	const quedaNegativo =
		!!cajaSel &&
		!ingreso &&
		(enDolares ? (cajaSel.saldoUsd ?? 0) < dolares : cajaSel.saldo < pesos);

	const confirmar = async () => {
		if (!cajaId)
			return toast.error(ingreso ? "Elegí la caja donde entra" : "Elegí de qué caja sale");
		if (!rubroId) return toast.error("Elegí el rubro");
		if (filaEnDolares && !(cotizacionNum > 0)) return toast.error("Cargá a cuánto se toma el dólar");
		setSaving(true);
		try {
			const res = await cajaFetch<{ message: string }>(
				`/programados/${programadoId}/pagar`,
				token,
				{
					method: "POST",
					json: {
						cajaId: Number(cajaId),
						fecha,
						...(filaEnDolares ? { moneda, cotizacion: cotizacionNum } : {}),
						rubroId: Number(rubroId),
						subRubroId: subRubroId === SIN_SUBRUBRO ? null : Number(subRubroId),
					},
				},
			);
			toast.success(res.message);
			onPaid();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						{fila ? (ingreso ? "Registrar cobro" : "Registrar pago") : "Caja"}
					</DialogTitle>
					<DialogDescription>
						{fila
							? `${fila.concept} · ${filaEnDolares ? formatUSD(fila.amount) : formatARS(fila.montoPesos)}. Queda registrado como ${ingreso ? "ingreso" : "egreso"} en la caja que elijas.`
							: "Cargando…"}
					</DialogDescription>
				</DialogHeader>

				{error ? (
					<p className="rounded-md bg-muted p-3 text-sm">{error}</p>
				) : !fila ? (
					<Skeleton className="h-40 w-full" />
				) : (
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>{ingreso ? "Caja donde entra" : "Caja de la que sale"}</Label>
							<Select value={cajaId} onValueChange={setCajaId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Seleccionar caja" />
								</SelectTrigger>
								<SelectContent>
									{operables.map(({ caja, label }) => (
										<SelectItem key={caja.id} value={String(caja.id)}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{cajaSel && (
								<p className="text-xs text-muted-foreground">
									Saldo actual: <span className="tabular-nums">{formatARS(cajaSel.saldo)}</span>
									{(filaEnDolares || !!cajaSel.saldoUsd) && (
										<>
											{" · "}
											<span className="tabular-nums">{formatUSD(cajaSel.saldoUsd ?? 0)}</span>
										</>
									)}
									{quedaNegativo && (
										<span className="text-amber-600">
											{" "}
											· queda en negativo{enDolares ? " en dólares" : ""}
										</span>
									)}
								</p>
							)}
						</div>
						{filaEnDolares && (
							<>
								<div className="space-y-2">
									<Label>{ingreso ? "Se cobra en" : "Se paga en"}</Label>
									<div className="grid grid-cols-2 gap-2">
										{(["USD", "ARS"] as const).map((m) => (
											<Button
												key={m}
												type="button"
												variant={moneda === m ? "default" : "outline"}
												aria-pressed={moneda === m}
												onClick={() => setMonedaElegida(m)}
											>
												{MONEDA_LABEL[m]}
											</Button>
										))}
									</div>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-2">
										<Label>Cotización</Label>
										<CotizacionSelect
											cotizaciones={cotizaciones}
											value={casa}
											onChange={usarCasa}
											lado="venta"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="prog-cotizacion">Valor del dólar</Label>
										<Input
											id="prog-cotizacion"
											inputMode="decimal"
											placeholder="0,00"
											value={cotizacion}
											onChange={(e) => {
												setCasa(A_MANO);
												setCotizacion(e.target.value.replace(/[^\d.,]/g, ""));
											}}
										/>
									</div>
								</div>
								<p className="rounded-md bg-primary/10 px-3 py-2 text-sm">
									{enDolares ? (
										<>
											{ingreso ? "Entran" : "Salen"}{" "}
											<span className="font-semibold tabular-nums">{formatUSD(dolares)}</span>{" "}
											{ingreso ? "al" : "del"} saldo en dólares. En los informes cuenta como{" "}
											<span className="tabular-nums">{formatARS(pesos)}</span>.
										</>
									) : (
										<>
											{ingreso ? "Entran" : "Salen"}{" "}
											<span className="font-semibold tabular-nums">{formatARS(pesos)}</span>{" "}
											{ingreso ? "al" : "del"} saldo en pesos ({formatUSD(dolares)} a{" "}
											{formatARS(cotizacionNum)}).
										</>
									)}
								</p>
							</>
						)}
						<div className="space-y-2">
							<Label htmlFor="prog-fecha">Fecha</Label>
							<Input
								id="prog-fecha"
								type="date"
								value={fecha}
								onChange={(e) => setFecha(e.target.value)}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label>Rubro</Label>
								<Select
									value={rubroId}
									onValueChange={(v) => {
										setRubroId(v);
										setSubRubroId(SIN_SUBRUBRO);
									}}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Seleccionar" />
									</SelectTrigger>
									<SelectContent>
										{rubrosDelTipo.map((r) => (
											<SelectItem key={r.id} value={String(r.id)}>
												{r.nombre}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{rubro?.subRubros && rubro.subRubros.length > 0 && (
								<div className="space-y-2">
									<Label>Sub-rubro</Label>
									<Select value={subRubroId} onValueChange={setSubRubroId}>
										<SelectTrigger className="w-full">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={SIN_SUBRUBRO}>Sin sub-rubro</SelectItem>
											{rubro.subRubros.map((s) => (
												<SelectItem key={s.id} value={String(s.id)}>
													{s.nombre}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={saving}>
						Cancelar
					</Button>
					{fila && !error && (
						<Button onClick={confirmar} disabled={saving}>
							{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{ingreso ? "Registrar cobro" : "Registrar pago"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
