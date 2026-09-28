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
import type { CajasResponse, ProgramadoACobrar } from "@/types/caja";
import { CajaApiError, cajaFetch, cajasOperables, formatARS, hoyISO } from "./api";
import { useRubros } from "./useCajas";

// Gastos e Ingresos → Caja Contable: cobrar o pagar una fila pendiente la
// registra como ingreso/egreso en la caja elegida y la deja pagada (vinculada
// al movimiento). Las filas de un cierre van por RegistrarCobroDialog.

const SIN_SUBRUBRO = "none";

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
	const [saving, setSaving] = useState(false);
	const { rubros } = useRubros(token, open);

	useEffect(() => {
		if (!open || !token) return;
		setFila(null);
		setError(null);
		setCajaId("");
		setFecha(hoyISO());
		Promise.all([
			cajaFetch<{ data: ProgramadoACobrar }>(`/programados/${programadoId}`, token),
			cajaFetch<{ data: CajasResponse }>("/cajas", token),
		])
			.then(([f, c]) => {
				setFila(f.data);
				setCajas(c.data);
				setRubroId(f.data.rubroId ? String(f.data.rubroId) : "");
				setSubRubroId(f.data.subRubroId ? String(f.data.subRubroId) : SIN_SUBRUBRO);
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

	const confirmar = async () => {
		if (!cajaId)
			return toast.error(ingreso ? "Elegí la caja donde entra" : "Elegí de qué caja sale");
		if (!rubroId) return toast.error("Elegí el rubro");
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
							? `${fila.concept} · ${formatARS(fila.montoPesos)}. Queda registrado como ${ingreso ? "ingreso" : "egreso"} en la caja que elijas.`
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
									{!ingreso && cajaSel.saldo < fila.montoPesos && (
										<span className="text-amber-600"> · queda en negativo</span>
									)}
								</p>
							)}
						</div>
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
