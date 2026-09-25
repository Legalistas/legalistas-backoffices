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
import type { Caja, CajaMovimiento, CajaMovimientoTipo, CajaRubro } from "@/types/caja";
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
	/** Si viene, el diálogo edita ese movimiento en vez de cargar uno nuevo. */
	movimiento?: CajaMovimiento | null;
	onSaved: () => void;
}

export default function MovimientoDialog({
	open,
	onOpenChange,
	token,
	cajas,
	defaultCajaId,
	movimiento,
	onSaved,
}: MovimientoDialogProps) {
	const editando = movimiento ?? null;
	const esTransferencia = !!editando?.transferenciaId;
	const { rubros, loading: loadingRubros } = useRubros(token, open && !esTransferencia);
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
		if (editando) {
			setCajaId(String(editando.cajaId));
			setTipo(editando.tipo);
			setMonto(String(editando.monto).replace(".", ","));
			setFecha(editando.fecha);
			setRubroId(editando.rubroId ? String(editando.rubroId) : "");
			setSubRubroId(editando.subRubroId ? String(editando.subRubroId) : SIN_SUBRUBRO);
			setDescripcion(editando.descripcion ?? "");
			return;
		}
		const inicial = cajas.find((c) => c.caja.id === defaultCajaId) ?? cajas[0];
		setCajaId(inicial ? String(inicial.caja.id) : "");
		setTipo("INGRESO");
		setMonto("");
		setFecha(hoyISO());
		setRubroId("");
		setSubRubroId(SIN_SUBRUBRO);
		setDescripcion("");
	}, [open, defaultCajaId, cajas, editando]);

	// Editando: la caja del movimiento puede no estar en la lista (inactiva).
	const opcionesCaja = useMemo(() => {
		const lista = cajas.map(({ caja, label }) => ({
			id: caja.id,
			label,
			saldo: caja.saldo as number | null,
		}));
		if (editando && !lista.some((o) => o.id === editando.cajaId)) {
			lista.push({ id: editando.cajaId, label: editando.caja.nombre, saldo: null });
		}
		return lista;
	}, [cajas, editando]);

	const rubrosDelTipo = useMemo(() => {
		const lista = rubros.filter((r) => r.tipo === "AMBOS" || r.tipo === tipo);
		// Editando: el rubro o sub-rubro del movimiento puede estar desactivado
		// (la API lista solo activos). Se ofrece igual para poder conservarlo.
		if (!editando?.rubro || editando.tipo !== tipo || rubros.length === 0) return lista;
		const { rubro: r, subRubro: s } = editando;
		const conSub = (subs: CajaRubro[] = []): CajaRubro[] =>
			s && !subs.some((x) => x.id === s.id)
				? [
						...subs,
						{ id: s.id, nombre: `${s.nombre} (inactivo)`, tipo, parentId: r.id, activo: false, orden: 0 },
					]
				: subs;
		if (lista.some((x) => x.id === r.id)) {
			return lista.map((x) => (x.id === r.id ? { ...x, subRubros: conSub(x.subRubros) } : x));
		}
		return [
			...lista,
			{
				id: r.id,
				nombre: `${r.nombre} (inactivo)`,
				tipo,
				parentId: null,
				activo: false,
				orden: 0,
				subRubros: conSub(),
			},
		];
	}, [rubros, tipo, editando]);
	const rubro = rubrosDelTipo.find((r) => String(r.id) === rubroId);
	const cajaSel = opcionesCaja.find((c) => String(c.id) === cajaId);

	const cambiarTipo = (t: CajaMovimientoTipo) => {
		setTipo(t);
		setRubroId("");
		setSubRubroId(SIN_SUBRUBRO);
	};

	const guardar = async () => {
		const montoNum = Number(monto.replace(",", "."));
		if (esTransferencia ? !fecha || !(montoNum > 0) : !cajaId || !rubroId || !fecha || !(montoNum > 0)) {
			toast.error(esTransferencia ? "Completá monto y fecha" : "Completá caja, monto, fecha y rubro");
			return;
		}
		const datos = esTransferencia
			? { monto: montoNum, fecha, descripcion }
			: {
					cajaId: Number(cajaId),
					tipo,
					monto: montoNum,
					fecha,
					rubroId: Number(rubroId),
					subRubroId: subRubroId === SIN_SUBRUBRO ? null : Number(subRubroId),
					descripcion,
				};
		setSaving(true);
		try {
			if (editando) {
				await cajaFetch(`/movimientos/${editando.id}`, token, { method: "PUT", json: datos });
				toast.success(esTransferencia ? "Transferencia actualizada" : "Movimiento actualizado");
			} else {
				await cajaFetch("/movimientos", token, { method: "POST", json: datos });
				toast.success(`${tipo === "INGRESO" ? "Ingreso" : "Egreso"} registrado`);
			}
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
					<DialogTitle>
						{esTransferencia ? "Editar transferencia" : editando ? "Editar movimiento" : "Registrar movimiento"}
					</DialogTitle>
					<DialogDescription>
						{esTransferencia
							? `${editando?.tipo === "EGRESO" ? "De" : "Hacia"} ${editando?.caja.nombre}, ${editando?.tipo === "EGRESO" ? "a" : "desde"} ${editando?.cajaContraparte?.nombre ?? "otra caja"}. El monto y la fecha cambian en las dos cajas.`
							: "Ingreso o egreso de una caja."}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{!esTransferencia && (
						<>
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
								<Select value={cajaId} onValueChange={setCajaId} disabled={opcionesCaja.length <= 1}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Seleccionar caja" />
									</SelectTrigger>
									<SelectContent>
										{opcionesCaja.map(({ id, label }) => (
											<SelectItem key={id} value={String(id)}>
												{label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{cajaSel?.saldo != null && (
									<p className="text-xs text-muted-foreground">
										Saldo actual: <span className="tabular-nums">{formatARS(cajaSel.saldo)}</span>
									</p>
								)}
							</div>
						</>
					)}

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

					{!esTransferencia && (
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
					)}

					{!esTransferencia && rubro?.subRubros && rubro.subRubros.length > 0 && (
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
						{editando ? "Guardar cambios" : "Registrar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
