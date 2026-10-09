"use client";

import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { parseMonto } from "@/lib/monto";
import { cn } from "@/lib/utils";
import type { CajasResponse, ConceptoCobro, EstadoCobro, SituacionCobro } from "@/types/caja";
import { CajaApiError, cajaFetch, cajasOperables, formatARS, formatFecha, hoyISO } from "./api";

// Cobro de un cierre (HP o PCL) en la Caja Contable: entra como ingreso en la
// caja elegida y el cierre queda Parcial o Cobrado (y la fila de Gastos e
// Ingresos, cobrada). Se abre desde el Gestor de Cierres y desde Gastos e
// Ingresos.
// Lo que entra por encima de la parte de Legalistas es del abogado
// representante: el backend lo deja pendiente de pago en Gastos e Ingresos.

const LABEL: Record<ConceptoCobro, string> = { fee: "HP", pcl: "PCL" };

const ESTADO_LABEL: Record<string, string> = {
	EARRINGS: "Pendiente",
	REQUESTED: "Solicitado",
	PARTIAL: "Parcial",
	CHARGED: "Cobrado",
};

const aTexto = (n: number) => (n > 0 ? n.toFixed(2).replace(".", ",") : "");

/** Ya no entra nada más: se llegó al total, o el cierre se marcó Cobrado a mano. */
const agotado = (s: SituacionCobro) =>
	s.disponible <= 0.01 || (s.estado === "CHARGED" && !s.completo);

/** Lo que falta de la parte de Legalistas o, ya cobrada, lo que queda del total. */
const montoSugerido = (s: SituacionCobro | null | undefined) =>
	s ? (s.completo ? s.disponible : s.restante) : 0;

function Situacion({
	concepto,
	s,
	activo,
	onElegir,
}: {
	concepto: ConceptoCobro;
	s: SituacionCobro;
	activo: boolean;
	onElegir: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onElegir}
			disabled={agotado(s)}
			className={cn(
				"rounded-lg border p-3 text-left transition-colors disabled:cursor-default",
				activo ? "border-primary bg-primary/5" : "hover:bg-muted/50",
				agotado(s) && "opacity-70",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="font-medium">{LABEL[concepto]}</span>
				<Badge variant={s.completo ? "default" : "secondary"} className="gap-1">
					{s.completo && <CheckCircle2 className="h-3 w-3" />}
					{ESTADO_LABEL[s.estado] ?? s.estado}
				</Badge>
			</div>
			<dl className="mt-2 space-y-0.5 text-xs text-muted-foreground">
				<div className="flex justify-between">
					<dt>Le toca a Legalistas</dt>
					<dd className="tabular-nums text-foreground">{formatARS(s.esperado)}</dd>
				</div>
				<div className="flex justify-between">
					<dt>Cobrado</dt>
					<dd className="tabular-nums">{formatARS(s.cobrado)}</dd>
				</div>
				<div className="flex justify-between font-medium">
					<dt>Falta</dt>
					<dd className="tabular-nums text-foreground">{formatARS(s.restante)}</dd>
				</div>
				{s.completo && !agotado(s) && (
					<div className="flex justify-between">
						<dt>Queda del total</dt>
						<dd className="tabular-nums">{formatARS(s.disponible)}</dd>
					</div>
				)}
			</dl>
		</button>
	);
}

export default function RegistrarCobroDialog({
	closingId,
	conceptoInicial,
	onClose,
	onSaved,
}: {
	/** null = cerrado. */
	closingId: number | null;
	conceptoInicial?: ConceptoCobro;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const open = closingId !== null;

	const [estado, setEstado] = useState<EstadoCobro | null>(null);
	const [cajas, setCajas] = useState<CajasResponse | null>(null);
	const [sinAcceso, setSinAcceso] = useState<string | null>(null);
	const [concepto, setConcepto] = useState<ConceptoCobro>("fee");
	const [cajaId, setCajaId] = useState("");
	const [monto, setMonto] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [descripcion, setDescripcion] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!open || !token) return;
		setEstado(null);
		setSinAcceso(null);
		setCajaId("");
		setFecha(hoyISO());
		setDescripcion("");
		Promise.all([
			cajaFetch<{ data: EstadoCobro }>(`/cierres/${closingId}/cobro`, token),
			cajaFetch<{ data: CajasResponse }>("/cajas", token),
		])
			.then(([e, c]) => {
				setEstado(e.data);
				setCajas(c.data);
				// Arranca en el concepto pedido o en el primero que falte cobrar.
				const { fee, pcl } = e.data.conceptos;
				// Primero lo que le falta a Legalistas; si ya está, lo que queda del total.
				const inicial =
					conceptoInicial && !e.data.conceptos[conceptoInicial]?.completo
						? conceptoInicial
						: fee && !fee.completo
							? "fee"
							: pcl && !pcl.completo
								? "pcl"
								: pcl && !agotado(pcl) && (!fee || agotado(fee))
									? "pcl"
									: "fee";
				setConcepto(inicial);
				setMonto(aTexto(montoSugerido(e.data.conceptos[inicial])));
			})
			.catch((err) =>
				setSinAcceso(
					err instanceof CajaApiError && err.status === 403
						? "Tu usuario no tiene acceso a la Caja para registrar cobros."
						: (err as Error).message,
				),
			);
	}, [open, token, closingId, conceptoInicial]);

	const operables = useMemo(() => (cajas ? cajasOperables(cajas.cajas) : []), [cajas]);
	useEffect(() => {
		if (operables.length === 1) setCajaId(String(operables[0].caja.id));
	}, [operables]);

	const sit = estado?.conceptos[concepto] ?? null;
	const todoCobrado =
		!!estado &&
		(!estado.conceptos.fee || agotado(estado.conceptos.fee)) &&
		(!estado.conceptos.pcl || agotado(estado.conceptos.pcl));

	const elegir = (c: ConceptoCobro) => {
		setConcepto(c);
		setMonto(aTexto(montoSugerido(estado?.conceptos[c])));
	};

	const guardar = async () => {
		const valor = parseMonto(monto) ?? Number.NaN;
		if (!cajaId) return toast.error("Elegí la caja donde entra el cobro");
		if (!Number.isFinite(valor) || valor <= 0) return toast.error("Indicá el monto cobrado");
		if (sit && valor > sit.disponible + 0.01) {
			return toast.error(`El monto supera lo que queda por cobrar (${formatARS(sit.disponible)})`);
		}
		setSaving(true);
		try {
			const res = await cajaFetch<{ message: string }>(`/cierres/${closingId}/cobros`, token, {
				method: "POST",
				json: {
					concepto,
					cajaId: Number(cajaId),
					monto: valor,
					fecha,
					descripcion: descripcion.trim() || undefined,
				},
			});
			toast.success(res.message);
			onSaved();
			onClose();
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Wallet className="h-5 w-5" />
						Registrar cobro
					</DialogTitle>
					<DialogDescription>
						{estado
							? estado.caseTitle
							: "El cobro entra como ingreso en la caja que elijas y el cierre queda cobrado."}
					</DialogDescription>
				</DialogHeader>

				{sinAcceso ? (
					<p className="rounded-md bg-muted p-3 text-sm">{sinAcceso}</p>
				) : !estado ? (
					<div className="space-y-3">
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : (
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-3">
							{(["fee", "pcl"] as const).map((c) => {
								const s = estado.conceptos[c];
								return s ? (
									<Situacion
										key={c}
										concepto={c}
										s={s}
										activo={concepto === c}
										onElegir={() => elegir(c)}
									/>
								) : (
									<div
										key={c}
										className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
									>
										Sin {LABEL[c]} convenido
									</div>
								);
							})}
						</div>

						{estado.cobros.length > 0 && (
							<div className="rounded-md bg-muted/50 p-3 text-xs">
								<p className="mb-1 font-medium">Cobros registrados</p>
								<ul className="space-y-0.5">
									{estado.cobros.map((c) => (
										<li key={`${c.origen}-${c.id}`} className="flex justify-between gap-2">
											<span>
												{formatFecha(c.fecha)} · {LABEL[c.concepto]} · {c.caja}
											</span>
											<span className="tabular-nums">{formatARS(c.monto)}</span>
										</li>
									))}
								</ul>
							</div>
						)}

						{todoCobrado ? (
							<p className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40">
								<CheckCircle2 className="h-4 w-4" />
								El cierre ya está cobrado.
							</p>
						) : (
							<>
								<div className="space-y-2">
									<Label>Caja donde entra</Label>
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
								</div>
								<div className="grid grid-cols-2 gap-3">
									<div className="space-y-2">
										<Label htmlFor="cobro-monto">Monto cobrado ({LABEL[concepto]})</Label>
										<Input
											id="cobro-monto"
											inputMode="decimal"
											placeholder="0,00"
											value={monto}
											onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
										/>
										{sit && !sit.completo && sit.disponible > sit.restante && (
											<p className="text-xs text-muted-foreground">
												Hasta {formatARS(sit.disponible)} si entra el total: lo que pase de la parte
												de Legalistas queda pendiente para pagarle al representante.
											</p>
										)}
									</div>
									<div className="space-y-2">
										<Label htmlFor="cobro-fecha">Fecha</Label>
										<Input
											id="cobro-fecha"
											type="date"
											value={fecha}
											onChange={(e) => setFecha(e.target.value)}
										/>
									</div>
								</div>
								{sit?.completo && (
									<p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
										La parte de Legalistas ya está cobrada. Lo que entre ahora es de la parte del
										representante y queda pendiente de pago en Gastos e Ingresos.
									</p>
								)}
								<div className="space-y-2">
									<Label htmlFor="cobro-desc">Descripción (opcional)</Label>
									<Textarea
										id="cobro-desc"
										rows={2}
										placeholder={`${LABEL[concepto]} — ${estado.caseTitle}`}
										value={descripcion}
										onChange={(e) => setDescripcion(e.target.value)}
									/>
								</div>
							</>
						)}
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={saving}>
						{todoCobrado || sinAcceso ? "Cerrar" : "Cancelar"}
					</Button>
					{estado && !todoCobrado && !sinAcceso && (
						<Button onClick={guardar} disabled={saving || !sit || agotado(sit)}>
							{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Registrar cobro
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
