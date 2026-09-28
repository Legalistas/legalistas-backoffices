"use client";

import { CreditCard, Loader2 } from "lucide-react";
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
import { parseMonto } from "@/lib/monto";
import type { CajasResponse, TarjetaDetalle, TarjetaResumen } from "@/types/caja";
import { CajaApiError, cajaFetch, cajasOperables, formatARS, formatFecha, hoyISO } from "./api";
import { nombreResumen } from "./cuotas";

// Pago del resumen de una tarjeta desde una caja: sale como egreso (rubro
// "Tarjetas de crédito") y las cuotas del resumen quedan pagas, en la caja y en
// la sección de la tarjeta. Se puede pagar más que las cuotas (intereses o
// cargos del resumen), nunca menos.

export default function PagarResumenDialog({
	resumen,
	onClose,
	onPaid,
}: {
	/** null = cerrado. */
	resumen: { tarjetaId: number; periodo: string } | null;
	onClose: () => void;
	onPaid: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const open = resumen !== null;

	const [detalle, setDetalle] = useState<TarjetaDetalle | null>(null);
	const [cajas, setCajas] = useState<CajasResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cajaId, setCajaId] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [monto, setMonto] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!resumen || !token) return;
		setDetalle(null);
		setError(null);
		setCajaId("");
		setFecha(hoyISO());
		Promise.all([
			cajaFetch<{ data: TarjetaDetalle }>(`/tarjetas/${resumen.tarjetaId}`, token),
			cajaFetch<{ data: CajasResponse }>("/cajas", token),
		])
			.then(([d, c]) => {
				setDetalle(d.data);
				setCajas(c.data);
				const r = d.data.resumenes.find((x) => x.periodo === resumen.periodo);
				setMonto(r ? r.pendiente.toFixed(2).replace(".", ",") : "");
			})
			.catch((err) =>
				setError(
					err instanceof CajaApiError && err.status === 403
						? "Tu usuario no tiene acceso a las tarjetas de la Caja."
						: (err as Error).message,
				),
			);
	}, [token, resumen]);

	const r: TarjetaResumen | undefined = detalle?.resumenes.find(
		(x) => x.periodo === resumen?.periodo,
	);
	const pendientes = r?.cuotas.filter((c) => c.estado === "PENDIENTE") ?? [];
	const operables = useMemo(() => (cajas ? cajasOperables(cajas.cajas) : []), [cajas]);
	const valor = parseMonto(monto);
	const cargos = r && valor ? Math.round((valor - r.pendiente) * 100) / 100 : 0;

	const pagar = async () => {
		if (!r || !resumen) return;
		if (!cajaId) return toast.error("Elegí de qué caja sale el pago");
		if (!valor || valor < r.pendiente - 0.01) {
			return toast.error(
				`El pago tiene que cubrir las cuotas del resumen (${formatARS(r.pendiente)})`,
			);
		}
		setSaving(true);
		try {
			const res = await cajaFetch<{ message: string }>(
				`/tarjetas/${resumen.tarjetaId}/resumenes/${resumen.periodo}/pagar`,
				token,
				{ method: "POST", json: { cajaId: Number(cajaId), fecha, monto: valor } },
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
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" />
						Pagar resumen
					</DialogTitle>
					<DialogDescription>
						{detalle && resumen
							? `${detalle.tarjeta.nombre} · resumen de ${nombreResumen(resumen.periodo)}${r ? ` · vence ${formatFecha(r.vencimiento)}` : ""}`
							: "Cargando…"}
					</DialogDescription>
				</DialogHeader>

				{error ? (
					<p className="rounded-md bg-muted p-3 text-sm">{error}</p>
				) : !detalle ? (
					<Skeleton className="h-48 w-full" />
				) : !r || pendientes.length === 0 ? (
					<p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40">
						Este resumen no tiene cuotas pendientes.
					</p>
				) : (
					<div className="space-y-4">
						<div className="max-h-44 overflow-y-auto rounded-md border text-sm">
							<table className="w-full">
								<tbody>
									{pendientes.map((c) => (
										<tr key={c.id} className="border-b last:border-0">
											<td className="px-3 py-1.5">{c.descripcion}</td>
											<td className="px-3 py-1.5 text-muted-foreground">
												{c.de === 1 ? "1 pago" : `Cuota ${c.numero}/${c.de}`}
											</td>
											<td className="px-3 py-1.5 text-right tabular-nums">{formatARS(c.monto)}</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="bg-muted/50 font-medium">
										<td className="px-3 py-1.5" colSpan={2}>
											Cuotas del resumen
										</td>
										<td className="px-3 py-1.5 text-right tabular-nums">
											{formatARS(r.pendiente)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>

						<div className="space-y-2">
							<Label>Caja de la que sale</Label>
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
								<Label htmlFor="resumen-monto">Monto pagado</Label>
								<Input
									id="resumen-monto"
									inputMode="decimal"
									value={monto}
									onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
								/>
								{cargos > 0 && (
									<p className="text-xs text-muted-foreground">
										Incluye {formatARS(cargos)} de intereses o cargos del resumen.
									</p>
								)}
							</div>
							<div className="space-y-2">
								<Label htmlFor="resumen-fecha">Fecha de pago</Label>
								<Input
									id="resumen-fecha"
									type="date"
									value={fecha}
									onChange={(e) => setFecha(e.target.value)}
								/>
							</div>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={saving}>
						Cancelar
					</Button>
					{r && pendientes.length > 0 && !error && (
						<Button onClick={pagar} disabled={saving}>
							{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Pagar resumen
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
