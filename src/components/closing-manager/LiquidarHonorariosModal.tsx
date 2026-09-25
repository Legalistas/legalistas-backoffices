"use client";

import { Copy, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
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
import { CLOSING_LIQUIDACION_ENDPOINT } from "@/constant/api-endpoints";
import { gastoCategoriaLabel } from "@/constant/gastos";
import { apiErrorMessage } from "@/lib/api-error";

interface GastoLiquidacion {
	id: number;
	fecha: string | null;
	descripcion: string | null;
	categoria: string | null;
	monto: number;
	pagadoPor: "ESTUDIO" | "ABOGADO_EXTERNO" | null;
	expediente: string | null;
}

interface Liquidacion {
	closingId: number;
	caso: { id: number; number: string | null; title: string | null };
	cliente: string | null;
	abogadoExterno: string | null;
	capital: number;
	honorarios: { porcentaje: number; monto: number };
	pcl: { porcentaje: number; monto: number } | null;
	gastos: GastoLiquidacion[];
	totalGastos: number;
	adelantadoAbogado: number;
	total: number;
	cobradoHonorarios: number;
}

interface LiquidarHonorariosModalProps {
	closingId: number | null;
	onClose: () => void;
}

const formatARS = (n: number) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

const formatPct = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;

/** "2026-09-25" → "25/09/2026" (fecha literal, sin zona horaria). */
const formatFecha = (iso: string) => iso.split("-").reverse().join("/");

const conceptoGasto = (g: GastoLiquidacion) =>
	g.descripcion || gastoCategoriaLabel(g.categoria) || "Gasto";

/** Texto para pegar en un mensaje al cliente o a Contable. */
function textoLiquidacion(l: Liquidacion): string {
	const lineas = [
		`Liquidación — ${l.cliente ?? "Cliente"}${l.caso.number ? ` (causa ${l.caso.number})` : ""}`,
		`Honorarios: ${formatPct(l.honorarios.porcentaje)} — ${formatARS(l.honorarios.monto)}`,
	];
	if (l.pcl) lineas.push(`PCL: ${formatPct(l.pcl.porcentaje)} — ${formatARS(l.pcl.monto)}`);
	if (l.gastos.length > 0) {
		lineas.push(`Gastos: ${formatARS(l.totalGastos)}`);
		for (const g of l.gastos) lineas.push(`  • ${conceptoGasto(g)}: ${formatARS(g.monto)}`);
	}
	lineas.push(`Total a cobrar: ${formatARS(l.total)}`);
	return lineas.join("\n");
}

/**
 * "Liquidar honorarios" (relevamiento 11): el total a cobrarle al cliente —
 * honorarios (HP), PCL y los gastos de la causa desglosados — sin entrar al
 * expediente.
 */
export default function LiquidarHonorariosModal({ closingId, onClose }: LiquidarHonorariosModalProps) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [loading, setLoading] = useState(false);
	const [data, setData] = useState<Liquidacion | null>(null);

	useEffect(() => {
		if (!closingId || !token) return;
		const controller = new AbortController();
		setLoading(true);
		setData(null);
		fetch(CLOSING_LIQUIDACION_ENDPOINT(closingId), {
			headers: { Authorization: `Bearer ${token}` },
			signal: controller.signal,
		})
			.then(async (res) => {
				if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al liquidar honorarios"));
				return res.json();
			})
			.then((json) => setData(json.data))
			.catch((err) => {
				if ((err as Error).name === "AbortError") return;
				toast.error((err as Error).message);
				onClose();
			})
			.finally(() => setLoading(false));
		return () => controller.abort();
	}, [closingId, token, onClose]);

	const copiar = async () => {
		if (!data) return;
		try {
			await navigator.clipboard.writeText(textoLiquidacion(data));
			toast.success("Liquidación copiada");
		} catch {
			toast.error("No se pudo copiar");
		}
	};

	return (
		<Dialog open={closingId !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>Liquidar honorarios</DialogTitle>
					<DialogDescription>
						{data
							? `${data.cliente ?? "Cliente"}${data.caso.number ? ` · causa ${data.caso.number}` : ""}`
							: "Honorarios y gastos a cobrarle al cliente"}
					</DialogDescription>
				</DialogHeader>

				{loading || !data ? (
					<div className="flex items-center justify-center py-10">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<div className="space-y-4 overflow-y-auto pr-1 text-sm">
						<div className="rounded-lg border divide-y">
							<div className="flex justify-between px-3 py-2">
								<span>
									Honorarios{" "}
									<span className="text-muted-foreground">
										({formatPct(data.honorarios.porcentaje)} de {formatARS(data.capital)})
									</span>
								</span>
								<span className="font-medium tabular-nums">{formatARS(data.honorarios.monto)}</span>
							</div>
							{data.pcl && (
								<div className="flex justify-between px-3 py-2">
									<span>
										PCL <span className="text-muted-foreground">({formatPct(data.pcl.porcentaje)})</span>
									</span>
									<span className="font-medium tabular-nums">{formatARS(data.pcl.monto)}</span>
								</div>
							)}
							<div className="px-3 py-2">
								<div className="flex justify-between">
									<span>Gastos de la causa</span>
									<span className="font-medium tabular-nums">{formatARS(data.totalGastos)}</span>
								</div>
								{data.gastos.length === 0 ? (
									<p className="mt-1 text-xs text-muted-foreground">No hay gastos cargados en la causa.</p>
								) : (
									<ul className="mt-1.5 space-y-1">
										{data.gastos.map((g) => (
											<li key={g.id} className="flex justify-between gap-3 text-xs">
												<span className="min-w-0">
													<span className="text-foreground">{conceptoGasto(g)}</span>
													<span className="text-muted-foreground">
														{g.fecha ? ` · ${formatFecha(g.fecha)}` : ""}
														{g.expediente ? ` · ${g.expediente}` : ""}
														{g.pagadoPor === "ABOGADO_EXTERNO" ? " · lo adelantó el abogado externo" : ""}
													</span>
												</span>
												<span className="shrink-0 tabular-nums">{formatARS(g.monto)}</span>
											</li>
										))}
									</ul>
								)}
							</div>
							<div className="flex justify-between bg-primary/5 px-3 py-2.5 text-base font-semibold text-primary">
								<span>Total a cobrar</span>
								<span className="tabular-nums">{formatARS(data.total)}</span>
							</div>
						</div>

						{data.adelantadoAbogado > 0 && (
							<p className="text-xs text-muted-foreground">
								De los gastos, {formatARS(data.adelantadoAbogado)} los adelantó el abogado externo
								{data.abogadoExterno ? ` (${data.abogadoExterno})` : ""}: hay que reintegrárselos.
							</p>
						)}
						{data.cobradoHonorarios > 0 && (
							<p className="text-xs text-muted-foreground">
								Ya se registraron en Caja {formatARS(data.cobradoHonorarios)} de honorarios/PCL.
							</p>
						)}
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cerrar
					</Button>
					<Button onClick={copiar} disabled={!data} className="gap-1.5">
						<Copy className="size-4" />
						Copiar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
