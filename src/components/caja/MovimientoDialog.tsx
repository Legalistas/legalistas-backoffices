"use client";

import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Caja, CajaMovimientoTipo } from "@/types/caja";
import { cajaFetch, formatARS, hoyISO } from "./api";
import { useRubros } from "./useCajas";

const SIN_SUBRUBRO = "none";

interface MovimientoDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	token: string | undefined;
	/** Cajas donde se puede cargar (ver `cajasOperables`). */
	cajas: { caja: Caja; label: string }[];
	defaultCajaId?: number | null;
	onSaved: () => void;
}

export default function MovimientoDialog({
	open,
	onOpenChange,
	token,
	cajas,
	defaultCajaId,
	onSaved,
}: MovimientoDialogProps) {
	const { rubros, loading: loadingRubros } = useRubros(token, open);
	const [cajaId, setCajaId] = useState("");
	const [tipo, setTipo] = useState<CajaMovimientoTipo>("INGRESO");
	const [monto, setMonto] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [rubroId, setRubroId] = useState("");
	const [subRubroId, setSubRubroId] = useState(SIN_SUBRUBRO);
	const [descripcion, setDescripcion] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open) return;
		const inicial = cajas.find((c) => c.caja.id === defaultCajaId) ?? cajas[0];
		setCajaId(inicial ? String(inicial.caja.id) : "");
		setTipo("INGRESO");
		setMonto("");
		setFecha(hoyISO());
		setRubroId("");
		setSubRubroId(SIN_SUBRUBRO);
		setDescripcion("");
	}, [open, defaultCajaId, cajas]);

	const rubrosDelTipo = useMemo(
		() => rubros.filter((r) => r.tipo === "AMBOS" || r.tipo === tipo),
		[rubros, tipo],
	);
	const rubro = rubrosDelTipo.find((r) => String(r.id) === rubroId);
	const cajaSel = cajas.find((c) => String(c.caja.id) === cajaId)?.caja;

	const cambiarTipo = (t: CajaMovimientoTipo) => {
		setTipo(t);
		setRubroId("");
		setSubRubroId(SIN_SUBRUBRO);
	};

	const guardar = async () => {
		const montoNum = Number(monto.replace(",", "."));
		if (!cajaId || !rubroId || !fecha || !(montoNum > 0)) {
			toast.error("Completá caja, monto, fecha y rubro");
			return;
		}
		setSaving(true);
		try {
			await cajaFetch("/movimientos", token, {
				method: "POST",
				json: {
					cajaId: Number(cajaId),
					tipo,
					monto: montoNum,
					fecha,
					rubroId: Number(rubroId),
					subRubroId: subRubroId === SIN_SUBRUBRO ? null : Number(subRubroId),
					descripcion,
				},
			});
			toast.success(`${tipo === "INGRESO" ? "Ingreso" : "Egreso"} registrado`);
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
					<DialogTitle>Registrar movimiento</DialogTitle>
					<DialogDescription>Ingreso o egreso de una caja.</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-2">
						{(["INGRESO", "EGRESO"] as const).map((t) => (
							<Button
								key={t}
								type="button"
								variant="outline"
								onClick={() => cambiarTipo(t)}
								className={cn(
									tipo === t &&
										(t === "INGRESO"
											? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40"
											: "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40"),
								)}
							>
								{t === "INGRESO" ? (
									<TrendingUp className="mr-2 h-4 w-4" />
								) : (
									<TrendingDown className="mr-2 h-4 w-4" />
								)}
								{t === "INGRESO" ? "Ingreso" : "Egreso"}
							</Button>
						))}
					</div>

					<div className="space-y-2">
						<Label>Caja</Label>
						<Select value={cajaId} onValueChange={setCajaId} disabled={cajas.length <= 1}>
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
						{cajaSel && (
							<p className="text-xs text-muted-foreground">
								Saldo actual: <span className="tabular-nums">{formatARS(cajaSel.saldo)}</span>
							</p>
						)}
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<Label htmlFor="caja-monto">Monto</Label>
							<Input
								id="caja-monto"
								inputMode="decimal"
								placeholder="0,00"
								value={monto}
								onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="caja-fecha">Fecha</Label>
							<Input
								id="caja-fecha"
								type="date"
								value={fecha}
								onChange={(e) => setFecha(e.target.value)}
							/>
						</div>
					</div>

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
								<SelectValue placeholder={loadingRubros ? "Cargando…" : "Seleccionar rubro"} />
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

					<div className="space-y-2">
						<Label htmlFor="caja-desc">Descripción</Label>
						<Textarea
							id="caja-desc"
							rows={3}
							placeholder="Detalle del movimiento…"
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
						Registrar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
