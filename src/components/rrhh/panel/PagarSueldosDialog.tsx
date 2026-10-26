"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CajaApiError, cajaFetch, cajasOperables, formatARS, hoyISO } from "@/components/caja/api";
import { formatPeriodo } from "@/components/rrhh/api";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CajasResponse } from "@/types/caja";
import type { EmpleadoPanel, ResumenPago } from "@/lib/panel-rrhh";

/**
 * Pays every pending row of the marked people from one cash box and date,
 * through the same endpoint as Gastos e Ingresos (the category picks the rubro).
 */
export default function PagarSueldosDialog({
	filas,
	periodo,
	onClose,
	onDone,
}: {
	/** null = closed. */
	filas: { e: EmpleadoPanel; pago: ResumenPago }[] | null;
	periodo: string;
	onClose: () => void;
	onDone: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const open = !!filas;
	const [cajas, setCajas] = useState<CajasResponse | null>(null);
	const [cajaId, setCajaId] = useState("");
	const [fecha, setFecha] = useState(hoyISO());
	const [error, setError] = useState<string | null>(null);
	const [pagando, setPagando] = useState(false);
	const [fallidos, setFallidos] = useState<Record<number, string>>({});
	// Rows already paid in this dialog: a retry after a failure skips them.
	const [hechas, setHechas] = useState<Set<number>>(new Set());
	const huboPagos = hechas.size > 0;

	useEffect(() => {
		if (!open || !token) return;
		setError(null);
		setFallidos({});
		setHechas(new Set());
		setFecha(hoyISO());
		cajaFetch<{ data: CajasResponse }>("/cajas", token)
			.then((r) => setCajas(r.data))
			.catch((err) =>
				setError(
					err instanceof CajaApiError && err.status === 403
						? "Tu usuario no tiene acceso a la Caja."
						: (err as Error).message,
				),
			);
	}, [open, token]);

	const operables = useMemo(() => (cajas ? cajasOperables(cajas.cajas) : []), [cajas]);
	const falta = (pago: ResumenPago) =>
		pago.pendientes.filter((p) => !hechas.has(p.id)).reduce((acc, p) => acc + p.monto, 0);
	const total = (filas ?? []).reduce((acc, f) => acc + falta(f.pago), 0);
	const cerrar = () => (huboPagos ? onDone() : onClose());

	const pagar = async () => {
		if (!filas || !cajaId) return;
		setPagando(true);
		const errores: Record<number, string> = {};
		const pagadas = new Set(hechas);
		let personas = 0;
		for (const { e, pago } of filas) {
			const resto = pago.pendientes.filter((p) => !pagadas.has(p.id));
			if (!resto.length) continue;
			for (const p of resto) {
				try {
					await cajaFetch(`/programados/${p.id}/pagar`, token, {
						method: "POST",
						json: { cajaId: Number(cajaId), fecha },
					});
					pagadas.add(p.id);
				} catch (err) {
					// One failed row (for example, not enough balance) stops that person only.
					errores[e.userId] = (err as Error).message;
					break;
				}
			}
			if (!errores[e.userId]) personas++;
		}
		setPagando(false);
		setHechas(pagadas);
		if (personas) toast.success(personas === 1 ? "Sueldo pagado" : `${personas} sueldos pagados`);
		if (!Object.keys(errores).length) {
			onDone();
			return;
		}
		setFallidos(errores);
	};

	return (
		<Dialog open={open} onOpenChange={(o) => !o && !pagando && cerrar()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Pagar sueldos de {formatPeriodo(periodo)}</DialogTitle>
					<DialogDescription>
						Se registran como egresos de la caja elegida y quedan pagados en Gastos e Ingresos.
					</DialogDescription>
				</DialogHeader>

				{error ? (
					<p className="text-sm text-destructive">{error}</p>
				) : (
					<div className="space-y-4">
						<ul className="divide-y divide-border rounded-md border border-border text-sm">
							{(filas ?? []).map(({ e, pago }) => (
								<li key={e.userId} className="px-3 py-2">
									<div className="flex items-center justify-between gap-3">
										<span className="text-foreground">{e.name}</span>
										<span className="tabular-nums">
											{falta(pago) ? formatARS(falta(pago)) : "Pagado ✓"}
										</span>
									</div>
									{fallidos[e.userId] && (
										<p className="mt-0.5 text-xs text-destructive">{fallidos[e.userId]}</p>
									)}
								</li>
							))}
							<li className="flex items-center justify-between gap-3 bg-muted/40 px-3 py-2 font-medium">
								<span>Total</span>
								<span className="tabular-nums">{formatARS(total)}</span>
							</li>
						</ul>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="space-y-1">
								<Label>Caja</Label>
								<Select value={cajaId} onValueChange={setCajaId} disabled={!cajas}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={cajas ? "Elegí la caja" : "Cargando…"} />
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
							<div className="space-y-1">
								<Label htmlFor="pago-sueldos-fecha">Fecha</Label>
								<Input id="pago-sueldos-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
							</div>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={cerrar} disabled={pagando}>
						{huboPagos ? "Cerrar" : "Cancelar"}
					</Button>
					<Button onClick={pagar} disabled={pagando || !cajaId || !fecha || !!error || total <= 0}>
						{pagando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Pagar {formatARS(total)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
