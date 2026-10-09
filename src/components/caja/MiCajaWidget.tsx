"use client";

import { ArrowRight, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Caja, CajaMovimiento, CajaMovimientosResponse } from "@/types/caja";
import {
	aplanarCajas,
	cajaFetch,
	formatARS,
	formatFecha,
	formatMonto,
	formatUSD,
	MESES,
} from "./api";
import MovimientoDialog from "./MovimientoDialog";
import { useCajas } from "./useCajas";

const CANTIDAD = 5;

/** "Transferencia desde Banco Patagonia" o el rubro del movimiento. */
const tituloMovimiento = (m: CajaMovimiento) =>
	m.transferenciaId
		? `Transferencia ${m.tipo === "EGRESO" ? "a" : "desde"} ${m.cajaContraparte?.nombre ?? "otra caja"}`
		: (m.rubro?.nombre ?? "—");

// Cada movimiento en un renglón: fecha, de qué es y el monto, juntos.
function UltimosMovimientos({
	cajaId,
	token,
	version,
}: {
	cajaId: number;
	token: string | undefined;
	version: number;
}) {
	const [movs, setMovs] = useState<CajaMovimiento[] | null>(null);

	useEffect(() => {
		if (!token) return;
		cajaFetch<CajaMovimientosResponse>(`/movimientos?cajaId=${cajaId}&limit=${CANTIDAD}`, token)
			.then((r) => setMovs(r.data))
			.catch(() => setMovs([]));
	}, [cajaId, token, version]);

	// Mismo alto que la lista cargada, para que la tarjeta no salte.
	if (!movs) return <div className="h-46 animate-pulse rounded-md bg-muted/50" />;
	if (movs.length === 0)
		return <p className="py-6 text-sm text-muted-foreground">Todavía no hay movimientos.</p>;

	return (
		<ul className="divide-y divide-border/70 text-sm">
			{movs.map((m) => (
				<li key={m.id} className="flex items-baseline gap-3 py-2">
					<span className="w-10 shrink-0 text-xs text-muted-foreground tabular-nums">
						{formatFecha(m.fecha).slice(0, 5)}
					</span>
					<span className="min-w-0 flex-1 truncate" title={tituloMovimiento(m)}>
						{tituloMovimiento(m)}
					</span>
					<span
						className={cn(
							"shrink-0 font-medium tabular-nums",
							m.tipo === "INGRESO"
								? "text-emerald-700 dark:text-emerald-400"
								: "text-red-600 dark:text-red-400",
						)}
					>
						{m.tipo === "INGRESO" ? "+" : "−"}
						{formatMonto(m.monto, m.moneda)}
					</span>
				</li>
			))}
		</ul>
	);
}

// Una caja propia en la home, como una billetera: una tarjeta con el azul del
// menú (saldo, lo del mes y el botón para cargar) y al lado los últimos
// movimientos. Se acomoda según el ancho disponible, no el de la pantalla; a lo
// ancho usa las mismas tres columnas que el resto de la home, así los bordes
// quedan alineados con la columna principal y la lateral.
function CajaPropiaCard({
	caja,
	token,
	onSaved,
	version,
}: {
	caja: Caja;
	token: string | undefined;
	onSaved: () => void;
	version: number;
}) {
	const [open, setOpen] = useState(false);
	const operable = useMemo(() => [{ caja, label: caja.nombre }], [caja]);
	const mes = MESES[new Date().getMonth()].toLowerCase();

	return (
		<div className="@container">
			<div className="grid h-full gap-6 @2xl:grid-cols-2 @5xl:grid-cols-3">
				{/* En modo oscuro el azul del menú es el del fondo: va un tono más claro. */}
				<section
					aria-labelledby={`caja-${caja.id}`}
					className="flex min-w-0 flex-col justify-between gap-6 rounded-xl border border-sidebar-border bg-sidebar p-6 text-white shadow-sm @5xl:col-span-2 dark:bg-sidebar-accent"
				>
					<h2 id={`caja-${caja.id}`} className="flex items-center gap-2 text-base font-semibold">
						<Wallet className="size-5 text-primary" aria-hidden="true" />
						{caja.nombre}
					</h2>

					<dl>
						<dt className="text-sm text-white/65">Saldo</dt>
						<dd
							className={cn(
								"mt-1 text-4xl font-semibold tracking-tight tabular-nums @5xl:text-5xl",
								caja.saldo < 0 && "text-red-400",
							)}
						>
							{formatARS(caja.saldo)}
						</dd>
						{!!caja.saldoUsd && (
							<dd className="mt-1 text-sm font-medium text-white/65 tabular-nums">
								{formatUSD(caja.saldoUsd)}
							</dd>
						)}
					</dl>

					<div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-t border-white/10 pt-5">
						<dl className="flex flex-wrap gap-x-10 gap-y-3">
							<div>
								<dt className="text-sm text-white/65">Ingresos de {mes}</dt>
								<dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-400">
									+{formatARS(caja.ingresosMes)}
								</dd>
							</div>
							<div>
								<dt className="text-sm text-white/65">Egresos de {mes}</dt>
								<dd className="mt-1 text-lg font-semibold tabular-nums text-red-400">
									−{formatARS(caja.egresosMes)}
								</dd>
							</div>
						</dl>
						<Button size="sm" onClick={() => setOpen(true)}>
							<Plus className="mr-1 size-4" />
							Registrar movimiento
						</Button>
					</div>
				</section>

				<Card className="min-w-0 gap-1 p-6">
					<div className="flex items-baseline justify-between gap-3">
						<h3 className="text-sm font-medium">Últimos movimientos</h3>
						<Link
							href={`/admin/caja?cajaId=${caja.id}`}
							className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							Ver todos <ArrowRight className="size-4" />
						</Link>
					</div>
					<UltimosMovimientos cajaId={caja.id} token={token} version={version} />
				</Card>
			</div>

			<MovimientoDialog
				open={open}
				onOpenChange={setOpen}
				token={token}
				cajas={operable}
				defaultCajaId={caja.id}
				onSaved={onSaved}
			/>
		</div>
	);
}

/**
 * Dashboard: caja(s) de las que el usuario es dueño (Caja Agustín,
 * Monotributo Julieta/Marilen/Candela). No renderiza nada si no tiene.
 */
export default function MiCajaWidget() {
	const { data, reload, token, userId } = useCajas();
	const [version, setVersion] = useState(0);

	const propias = useMemo(
		() =>
			data && userId
				? aplanarCajas(data.cajas).filter((c) => c.ownerUserId === userId && !c.esContenedora)
				: [],
		[data, userId],
	);

	if (propias.length === 0) return null;

	const onSaved = () => {
		reload();
		setVersion((v) => v + 1);
	};

	return (
		<div className={cn("grid gap-6", propias.length > 1 && "xl:grid-cols-2")}>
			{propias.map((c) => (
				<CajaPropiaCard key={c.id} caja={c} token={token} onSaved={onSaved} version={version} />
			))}
		</div>
	);
}
