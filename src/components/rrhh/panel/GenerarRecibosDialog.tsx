"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { PAYROLLS_BY_USER_ENDPOINT } from "@/constant/api-endpoints";
import { CONCEPTO_LABEL } from "@/constant/rrhh";
import { apiErrorMessage } from "@/lib/api-error";
import {
	type BorradorRecibo,
	borradorRecibo,
	type EmpleadoPanel,
	errorBorrador,
	periodoAnteriorLabel,
} from "@/lib/panel-rrhh";
import { fechaCorta } from "./shared";

const ORIGEN: Record<BorradorRecibo["origen"], string> = {
	MES_ANTERIOR: "Copiado del mes anterior",
	SUELDO_BASE: "Sin recibo anterior: desde el sueldo base",
	VACIO: "Sin recibo anterior ni sueldo base: completá los montos",
};

const n = (v: string | null) => (v === null || v === "" ? null : Number(v));

/** Creates the payslips of the month for the marked people (one request each). */
export default function GenerarRecibosDialog({
	empleados,
	periodo,
	onClose,
	onDone,
}: {
	/** null = closed. */
	empleados: EmpleadoPanel[] | null;
	periodo: string;
	onClose: () => void;
	onDone: () => void;
}) {
	const { data: session } = useSession();
	const token = session?.user?.accessToken;
	const [borradores, setBorradores] = useState<BorradorRecibo[]>([]);
	const [errores, setErrores] = useState<Record<number, string>>({});
	const [guardando, setGuardando] = useState(false);
	const [huboGuardados, setHuboGuardados] = useState(false);

	useEffect(() => {
		if (!empleados) return;
		setBorradores(empleados.map((e) => borradorRecibo(e, periodo)));
		setErrores({});
		setHuboGuardados(false);
	}, [empleados, periodo]);

	const cambiar = (userId: number, cambio: (b: BorradorRecibo) => BorradorRecibo) =>
		setBorradores((bs) => bs.map((b) => (b.userId === userId ? cambio(b) : b)));

	// The net pay is usually the "Remuneración" concept: keep them together.
	const cambiarNeto = (b: BorradorRecibo, neto: string): BorradorRecibo => ({
		...b,
		netAmount: neto,
		conceptos: b.conceptos.map((c) =>
			c.concepto === "REMUNERACION" && c.monto === b.netAmount ? { ...c, monto: neto } : c,
		),
	});

	const guardar = async () => {
		const invalidos = Object.fromEntries(
			borradores.flatMap((b) => {
				const err = errorBorrador(b);
				return err ? [[b.userId, err]] : [];
			}),
		);
		if (Object.keys(invalidos).length) {
			setErrores(invalidos);
			return;
		}

		setGuardando(true);
		const fallidos: Record<number, string> = {};
		for (const b of borradores) {
			try {
				const res = await fetch(PAYROLLS_BY_USER_ENDPOINT(b.userId), {
					method: "POST",
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
					body: JSON.stringify({
						period: periodo,
						grossAmount: Number(b.grossAmount),
						netAmount: Number(b.netAmount),
						contributions: n(b.contributions),
						deductions: n(b.deductions),
						currency: b.currency,
						conceptos: b.conceptos.map((c) => ({
							concepto: c.concepto,
							descripcion: c.descripcion,
							monto: Number(c.monto),
							vencimiento: c.vencimiento,
						})),
					}),
				});
				if (!res.ok) throw new Error(await apiErrorMessage(res, "No se pudo crear el recibo"));
			} catch (err) {
				fallidos[b.userId] = (err as Error).message;
			}
		}
		setGuardando(false);

		const ok = borradores.length - Object.keys(fallidos).length;
		if (ok) {
			toast.success(ok === 1 ? "Recibo generado" : `${ok} recibos generados`);
			setHuboGuardados(true);
		}
		if (!Object.keys(fallidos).length) {
			onDone();
			return;
		}
		// Keep only the ones that failed, with their error.
		setBorradores((bs) => bs.filter((b) => fallidos[b.userId]));
		setErrores(fallidos);
	};

	// Closing after some were saved reloads the table.
	const cerrar = () => (huboGuardados ? onDone() : onClose());

	return (
		<Dialog open={!!empleados} onOpenChange={(o) => !o && !guardando && cerrar()}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Generar recibos de {formatPeriodo(periodo)}</DialogTitle>
					<DialogDescription>
						Revisá los montos antes de guardar. Cada concepto queda pendiente en Gastos e Ingresos para
						pagarlo desde el panel. Se copian de {periodoAnteriorLabel(periodo)}.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					{borradores.map((b) => (
						<div
							key={b.userId}
							className={`rounded-lg border p-3 space-y-3 ${errores[b.userId] ? "border-destructive/50" : "border-border"}`}
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<p className="font-medium text-foreground">{b.name}</p>
								<p className="text-xs text-muted-foreground">{ORIGEN[b.origen]}</p>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<Monto
									label="Bruto"
									value={b.grossAmount}
									onChange={(v) => cambiar(b.userId, (x) => ({ ...x, grossAmount: v }))}
								/>
								<Monto
									label="Neto"
									value={b.netAmount}
									onChange={(v) => cambiar(b.userId, (x) => cambiarNeto(x, v))}
								/>
							</div>
							<div className="space-y-2">
								{b.conceptos.map((c, i) => (
									<div key={`${c.concepto}-${i}`} className="grid grid-cols-[1fr_140px] items-center gap-3">
										<p className="text-sm text-foreground">
											{CONCEPTO_LABEL[c.concepto]}
											{c.descripcion ? ` · ${c.descripcion}` : ""}
											<span className="ml-1 text-xs text-muted-foreground">vence {fechaCorta(c.vencimiento)}</span>
										</p>
										<Input
											type="number"
											min="0"
											step="0.01"
											aria-label={`Monto de ${CONCEPTO_LABEL[c.concepto]}`}
											value={c.monto}
											onChange={(e) =>
												cambiar(b.userId, (x) => ({
													...x,
													conceptos: x.conceptos.map((y, j) => (j === i ? { ...y, monto: e.target.value } : y)),
												}))
											}
										/>
									</div>
								))}
							</div>
							{errores[b.userId] && <p className="text-xs text-destructive">{errores[b.userId]}</p>}
						</div>
					))}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={cerrar} disabled={guardando}>
						{huboGuardados ? "Cerrar" : "Cancelar"}
					</Button>
					<Button onClick={guardar} disabled={guardando || !borradores.length}>
						{guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Generar {borradores.length === 1 ? "recibo" : `${borradores.length} recibos`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Monto({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	return (
		<label className="space-y-1">
			<span className="text-xs text-muted-foreground">{label}</span>
			<Input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} />
		</label>
	);
}
