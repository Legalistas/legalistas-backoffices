"use client";

import { ArrowRight, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Caja, CajaMovimiento, CajaMovimientosResponse } from "@/types/caja";
import { aplanarCajas, cajaFetch, formatARS, formatFecha } from "./api";
import MovimientoDialog from "./MovimientoDialog";
import { useCajas } from "./useCajas";

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
		cajaFetch<CajaMovimientosResponse>(`/movimientos?cajaId=${cajaId}&limit=5`, token)
			.then((r) => setMovs(r.data))
			.catch(() => setMovs([]));
	}, [cajaId, token, version]);

	if (!movs) return <div className="h-24 animate-pulse rounded-md bg-muted/50" />;
	if (movs.length === 0)
		return (
			<p className="py-4 text-center text-sm text-muted-foreground">Sin movimientos todavía</p>
		);

	return (
		<ul className="divide-y text-sm">
			{movs.map((m) => (
				<li key={m.id} className="flex items-center justify-between gap-3 py-2">
					<div className="min-w-0">
						<p className="truncate">
							{m.transferenciaId
								? `Transferencia ${m.tipo === "EGRESO" ? "a" : "desde"} ${m.cajaContraparte?.nombre ?? "otra caja"}`
								: (m.rubro?.nombre ?? "—")}
						</p>
						<p className="text-xs text-muted-foreground tabular-nums">{formatFecha(m.fecha)}</p>
					</div>
					<span
						className={cn(
							"shrink-0 tabular-nums",
							m.tipo === "INGRESO" ? "text-emerald-600" : "text-red-600",
						)}
					>
						{m.tipo === "INGRESO" ? "+" : "−"}
						{formatARS(m.monto)}
					</span>
				</li>
			))}
		</ul>
	);
}

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

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					<Wallet className="h-5 w-5 text-primary" />
					{caja.nombre}
				</CardTitle>
				<Button size="sm" onClick={() => setOpen(true)}>
					<Plus className="mr-1 h-4 w-4" />
					Registrar movimiento
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<p className="text-sm text-muted-foreground">Saldo</p>
						<p
							className={cn(
								"text-3xl font-semibold tabular-nums",
								caja.saldo < 0 && "text-red-600",
							)}
						>
							{formatARS(caja.saldo)}
						</p>
					</div>
					<div className="text-right text-sm">
						<p className="text-muted-foreground">Este mes</p>
						<p className="tabular-nums">
							<span className="text-emerald-600">+{formatARS(caja.ingresosMes)}</span>{" "}
							<span className="text-red-600">−{formatARS(caja.egresosMes)}</span>
						</p>
					</div>
				</div>

				<UltimosMovimientos cajaId={caja.id} token={token} version={version} />

				<Link
					href={`/admin/caja?cajaId=${caja.id}`}
					className="flex items-center gap-1 text-sm text-primary hover:underline"
				>
					Ver todos los movimientos <ArrowRight className="h-4 w-4" />
				</Link>
			</CardContent>

			<MovimientoDialog
				open={open}
				onOpenChange={setOpen}
				token={token}
				cajas={operable}
				defaultCajaId={caja.id}
				onSaved={onSaved}
			/>
		</Card>
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
		<div className={cn("grid gap-4", propias.length > 1 && "lg:grid-cols-2")}>
			{propias.map((c) => (
				<CajaPropiaCard key={c.id} caja={c} token={token} onSaved={onSaved} version={version} />
			))}
		</div>
	);
}
