"use client";

import { Loader2, ShoppingCart } from "lucide-react";
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
import { parseMonto } from "@/lib/monto";
import type { Tarjeta } from "@/types/caja";
import { cajaFetch, formatARS, formatFecha, hoyISO } from "./api";
import { nombreResumen, periodoPrimeraCuota, sumarMeses, vencimientoResumen } from "./cuotas";
import { useRubros } from "./useCajas";

// Compra con tarjeta en una o más cuotas. No mueve plata al cargarla: cada
// cuota cae en un resumen (según el día de cierre de la tarjeta) y se paga con
// el resumen. Muestra antes de guardar en qué resumen cae cada cuota.

const SIN_RUBRO = "none";
const AUTOMATICO = "auto";

export default function NuevaCompraDialog({
	open,
	onOpenChange,
	token,
	tarjetas,
	tarjetaIdInicial,
	onSaved,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	tarjetas: Tarjeta[];
	tarjetaIdInicial?: number | null;
	onSaved: () => void;
}) {
	const { rubros } = useRubros(token, open);
	const [tarjetaId, setTarjetaId] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [descripcion, setDescripcion] = useState("");
	const [monto, setMonto] = useState("");
	const [cuotas, setCuotas] = useState("1");
	const [rubroId, setRubroId] = useState(SIN_RUBRO);
	const [subRubroId, setSubRubroId] = useState(SIN_RUBRO);
	const [primerPeriodo, setPrimerPeriodo] = useState(AUTOMATICO);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTarjetaId(tarjetaIdInicial ? String(tarjetaIdInicial) : "");
		setFecha(hoyISO());
		setDescripcion("");
		setMonto("");
		setCuotas("1");
		setRubroId(SIN_RUBRO);
		setSubRubroId(SIN_RUBRO);
		setPrimerPeriodo(AUTOMATICO);
	}, [open, tarjetaIdInicial]);

	const tarjeta = tarjetas.find((t) => String(t.id) === tarjetaId);
	const total = parseMonto(monto) ?? 0;
	const n = Math.max(1, Math.min(60, Number(cuotas) || 1));
	const rubrosEgreso = rubros.filter((r) => r.activo && r.tipo !== "INGRESO");
	const rubro = rubros.find((r) => String(r.id) === rubroId);

	// Resumen de la primera cuota según el cierre de la tarjeta (o el elegido a mano).
	const automatico = tarjeta && fecha ? periodoPrimeraCuota(fecha, tarjeta.diaCierre) : null;
	const primero = primerPeriodo === AUTOMATICO ? automatico : primerPeriodo;
	const opcionesPeriodo = automatico ? [-1, 0, 1].map((d) => sumarMeses(automatico, d)) : [];

	const plan = useMemo(() => {
		if (!tarjeta || !primero || total <= 0) return [];
		const base = Math.round((total / n) * 100) / 100;
		return Array.from({ length: n }, (_, i) => {
			const periodo = sumarMeses(primero, i);
			return {
				numero: i + 1,
				monto: i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base,
				periodo,
				vence: vencimientoResumen(periodo, tarjeta.diaCierre, tarjeta.diaVencimiento),
			};
		});
	}, [tarjeta, primero, total, n]);

	const guardar = async () => {
		if (!tarjetaId) return toast.error("Elegí la tarjeta");
		if (!descripcion.trim()) return toast.error("Contá qué se compró");
		if (total <= 0) return toast.error("Indicá el monto total");
		setSaving(true);
		try {
			const res = await cajaFetch<{ message: string }>(`/tarjetas/${tarjetaId}/compras`, token, {
				method: "POST",
				json: {
					fecha,
					descripcion: descripcion.trim(),
					montoTotal: total,
					cuotas: n,
					...(rubroId !== SIN_RUBRO ? { rubroId: Number(rubroId) } : {}),
					...(rubroId !== SIN_RUBRO && subRubroId !== SIN_RUBRO
						? { subRubroId: Number(subRubroId) }
						: {}),
					...(primerPeriodo !== AUTOMATICO ? { primerPeriodo } : {}),
				},
			});
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
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<ShoppingCart className="h-5 w-5" />
						Compra con tarjeta
					</DialogTitle>
					<DialogDescription>
						Cada cuota se proyecta en Gastos e Ingresos con su resumen. La plata sale de la caja
						cuando se paga el resumen.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label>Tarjeta</Label>
							<Select value={tarjetaId} onValueChange={setTarjetaId}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Seleccionar" />
								</SelectTrigger>
								<SelectContent>
									{tarjetas
										.filter((t) => t.activa)
										.map((t) => (
											<SelectItem key={t.id} value={String(t.id)}>
												{t.nombre}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="compra-fecha">Fecha de compra</Label>
							<Input
								id="compra-fecha"
								type="date"
								value={fecha}
								onChange={(e) => setFecha(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="compra-desc">Qué se compró</Label>
						<Input
							id="compra-desc"
							placeholder="Ej.: notebook para el estudio"
							value={descripcion}
							onChange={(e) => setDescripcion(e.target.value)}
							maxLength={255}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="compra-monto">Monto total</Label>
							<Input
								id="compra-monto"
								inputMode="decimal"
								placeholder="0,00"
								value={monto}
								onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="compra-cuotas">Cuotas</Label>
							<Input
								id="compra-cuotas"
								type="number"
								min={1}
								max={60}
								value={cuotas}
								onChange={(e) => setCuotas(e.target.value)}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label>Rubro (opcional)</Label>
							<Select
								value={rubroId}
								onValueChange={(v) => {
									setRubroId(v);
									setSubRubroId(SIN_RUBRO);
								}}
							>
								<SelectTrigger className="w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={SIN_RUBRO}>Sin rubro</SelectItem>
									{rubrosEgreso.map((r) => (
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
										<SelectItem value={SIN_RUBRO}>Sin sub-rubro</SelectItem>
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

					<div className="space-y-2">
						<Label>Primera cuota en el resumen de</Label>
						<Select value={primerPeriodo} onValueChange={setPrimerPeriodo} disabled={!automatico}>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={AUTOMATICO}>
									{automatico
										? `Según el cierre de la tarjeta (${nombreResumen(automatico)})`
										: "Según el cierre de la tarjeta"}
								</SelectItem>
								{opcionesPeriodo.map((p) => (
									<SelectItem key={p} value={p}>
										{nombreResumen(p)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{tarjeta && !tarjeta.diaCierre && (
						<p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40">
							{tarjeta.nombre} no tiene día de cierre cargado: la primera cuota va al mes siguiente
							a la compra. Cargalo en la tarjeta para que sea exacto.
						</p>
					)}

					{plan.length > 0 && (
						<div className="max-h-40 overflow-y-auto rounded-md border text-sm">
							<table className="w-full">
								<thead className="bg-muted/50 text-xs text-muted-foreground">
									<tr>
										<th className="px-3 py-1.5 text-left font-medium">Cuota</th>
										<th className="px-3 py-1.5 text-left font-medium">Resumen</th>
										<th className="px-3 py-1.5 text-left font-medium">Vence</th>
										<th className="px-3 py-1.5 text-right font-medium">Monto</th>
									</tr>
								</thead>
								<tbody>
									{plan.map((c) => (
										<tr key={c.numero} className="border-t">
											<td className="px-3 py-1">
												{c.numero}/{n}
											</td>
											<td className="px-3 py-1">{nombreResumen(c.periodo)}</td>
											<td className="px-3 py-1 tabular-nums">{formatFecha(c.vence)}</td>
											<td className="px-3 py-1 text-right tabular-nums">{formatARS(c.monto)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
						Cancelar
					</Button>
					<Button onClick={guardar} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Cargar compra
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
