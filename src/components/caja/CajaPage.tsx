"use client";

import {
	ArrowLeftRight,
	DollarSign,
	FileDown,
	FileSpreadsheet,
	Landmark,
	Loader2,
	Lock,
	Plus,
	Scale,
	TrendingDown,
	TrendingUp,
	UserPlus,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CAJA_GRUPO_LABEL } from "@/constant/caja";
import { cn } from "@/lib/utils";
import type { Caja, CajaGrupo } from "@/types/caja";
import {
	aplanarCajas,
	cajasOperables,
	formatARS,
	formatUSD,
	MESES,
	mesParam,
	rangoPeriodo,
} from "./api";
import CajaEditDialog from "./CajaEditDialog";
import CajaGeneralPanel from "./CajaGeneralPanel";
import CajasGrid from "./CajasGrid";
import CambioDialog from "./CambioDialog";
import { exportarInformeCaja } from "./informes";
import MovimientoDialog from "./MovimientoDialog";
import MovimientosPanel from "./MovimientosPanel";
import BrixarPanel from "./BrixarPanel";
import NuevaCajaMonotributoDialog from "./NuevaCajaMonotributoDialog";
import ProyeccionPanel from "./ProyeccionPanel";
import RubrosManager from "./RubrosManager";
import TarjetasPanel from "./TarjetasPanel";
import TransferenciaDialog from "./TransferenciaDialog";
import { useCajas } from "./useCajas";

type Tab = CajaGrupo | "GENERAL" | "PROYECCION" | "TARJETAS" | "RUBROS";

function Kpi({
	titulo,
	valor,
	icon: Icon,
	color,
	detalle,
}: {
	titulo: string;
	valor: number;
	icon: typeof Landmark;
	color: string;
	/** Aclaración debajo del monto (cómo se compone). */
	detalle?: string;
}) {
	return (
		<Card className={cn("border-l-4 py-4", color)}>
			<CardContent className="flex items-center justify-between px-5">
				<div>
					<p className="text-sm text-muted-foreground">{titulo}</p>
					<p className={cn("text-2xl font-semibold tabular-nums", valor < 0 && "text-red-600")}>
						{formatARS(valor)}
					</p>
					{detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
				</div>
				<Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
			</CardContent>
		</Card>
	);
}

/** Selector de período: un mes o el año completo (month0 = -1). Define los totales de las tarjetas, la Caja General y la lista de movimientos. */
function SelectorMes({
	year,
	month0,
	onChange,
	loading,
}: {
	year: number;
	month0: number;
	onChange: (year: number, month0: number) => void;
	loading: boolean;
}) {
	const actual = new Date().getFullYear();
	const years = Array.from({ length: 4 }, (_, i) => actual - 3 + i);
	if (!years.includes(year)) years.unshift(year);

	return (
		<div className="flex items-center gap-2">
			{loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
			<Select value={String(month0)} onValueChange={(v) => onChange(year, Number(v))}>
				<SelectTrigger className="w-40" aria-label="Mes">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="-1">Año completo</SelectItem>
					{MESES.map((m, i) => (
						<SelectItem key={m} value={String(i)}>
							{m}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select value={String(year)} onValueChange={(v) => onChange(Number(v), month0)}>
				<SelectTrigger className="w-24" aria-label="Año">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{years.map((y) => (
						<SelectItem key={y} value={String(y)}>
							{y}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

/** La Caja Agustín muestra además sus cajas de Brixar (solo lectura). */
const CAJA_BRIXAR_SLUG = "caja-agustin";

/** Cajas de un grupo + movimientos de la caja elegida. */
function VistaCajas({
	cajas,
	selectedId,
	onSelect,
	mesLabel,
	token,
	esAdmin,
	operables,
	version,
	onChanged,
	rango,
}: {
	cajas: Caja[];
	selectedId: number | null;
	onSelect: (id: number) => void;
	mesLabel: string;
	token: string | undefined;
	esAdmin: boolean;
	operables: { caja: Caja; label: string }[];
	version: number;
	onChanged: () => void;
	rango: { desde: string; hasta: string };
}) {
	const seleccionada = aplanarCajas(cajas).find((c) => c.id === selectedId) ?? cajas[0];
	const [editando, setEditando] = useState<Caja | null>(null);

	return (
		<div className="space-y-6">
			<CajasGrid
				cajas={cajas}
				selectedId={seleccionada?.id ?? null}
				onSelect={onSelect}
				mesLabel={mesLabel}
				onEdit={esAdmin ? setEditando : undefined}
			/>
			{esAdmin && (
				<CajaEditDialog
					caja={editando}
					onClose={() => setEditando(null)}
					token={token}
					onSaved={onChanged}
				/>
			)}
			{seleccionada && (
				<MovimientosPanel
					token={token}
					cajaId={seleccionada.id}
					titulo={`Movimientos · ${seleccionada.nombre}`}
					mostrarCaja={seleccionada.esContenedora}
					esAdmin={esAdmin}
					cajas={operables}
					version={version}
					onChanged={onChanged}
					rango={rango}
					periodoLabel={mesLabel}
				/>
			)}
			{seleccionada?.slug === CAJA_BRIXAR_SLUG && (
				<BrixarPanel token={token} rango={rango} periodoLabel={mesLabel} />
			)}
		</div>
	);
}

export default function CajaPage() {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month0, setMonth0] = useState(now.getMonth());
	// month0 = -1: año completo. `mes` queda "YYYY-MM" o "YYYY".
	const anual = month0 < 0;
	const mes = anual ? String(year) : mesParam(year, month0);
	const mesLabel = anual ? `año ${year}` : `${MESES[month0].toLowerCase()} ${year}`;
	const rango = useMemo(() => rangoPeriodo(mes), [mes]);

	const { data, loading, fetching, error, reload, token } = useCajas(mes);
	const searchParams = useSearchParams();
	const cajaIdParam = Number(searchParams.get("cajaId")) || null;

	const [tab, setTab] = useState<Tab>("PRINCIPAL");
	const [selectedId, setSelectedId] = useState<number | null>(cajaIdParam);
	const [version, setVersion] = useState(0);
	const [movOpen, setMovOpen] = useState(false);
	const [trOpen, setTrOpen] = useState(false);
	const [cambioOpen, setCambioOpen] = useState(false);
	const [monoOpen, setMonoOpen] = useState(false);
	const [exportando, setExportando] = useState<"xlsx" | "pdf" | null>(null);

	const refrescar = () => {
		reload();
		setVersion((v) => v + 1);
	};

	// Link de una notificación (?cajaId=X): abrir la solapa de esa caja.
	useEffect(() => {
		if (!data || !cajaIdParam) return;
		const caja = aplanarCajas(data.cajas).find((c) => c.id === cajaIdParam);
		if (caja) {
			setTab(caja.grupo);
			setSelectedId(caja.id);
		}
	}, [data, cajaIdParam]);

	// Informe general del período elegido (totales, saldos, rubros y movimientos).
	const exportar = async (formato: "xlsx" | "pdf") => {
		if (!data) return;
		setExportando(formato);
		try {
			await exportarInformeCaja(formato, { token, datos: data, periodo: mes, rango });
		} catch (e) {
			toast.error((e as Error).message || "No se pudo exportar el informe");
		} finally {
			setExportando(null);
		}
	};

	const operables = useMemo(() => (data ? cajasOperables(data.cajas) : []), [data]);
	const operableSel = operables.some((o) => o.caja.id === selectedId) ? selectedId : null;

	if (loading) {
		return (
			<div className="space-y-6">
				<Skeleton className="h-10 w-64" />
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					{Array.from({ length: 4 }, (_, i) => (
						<Skeleton key={i} className="h-28" />
					))}
				</div>
				<Skeleton className="h-80" />
			</div>
		);
	}

	if (!data) {
		return (
			<Card className="mx-auto mt-10 max-w-md">
				<CardContent className="flex flex-col items-center gap-3 py-10 text-center">
					<Lock className="h-10 w-10 text-muted-foreground" />
					<p className="font-medium">
						{error?.status === 403 ? "No tenés acceso a la Caja" : "No se pudo cargar la Caja"}
					</p>
					<p className="text-sm text-muted-foreground">{error?.message}</p>
				</CardContent>
			</Card>
		);
	}

	const { esAdmin, cajas, general, cotizacion } = data;
	// Dólares de todas las cajas, pasados a pesos al MEP del día. Si no hay
	// cotización, la Caja General muestra solo los pesos y los dólares aparte.
	const dolares = general?.saldoUsd ?? 0;
	const dolaresEnPesos = cotizacion ? dolares * cotizacion.venta : 0;
	const detalleGeneral =
		general && dolares !== 0
			? cotizacion
				? `${formatARS(general.saldo)} + ${formatUSD(dolares)} a ${formatARS(cotizacion.venta)} (MEP)`
				: `Más ${formatUSD(dolares)} (sin cotización para pasarlos a pesos)`
			: undefined;
	const cajasDe = (g: CajaGrupo) => cajas.filter((c) => c.grupo === g);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Caja</h1>
					<p className="text-sm text-muted-foreground">
						{esAdmin
							? "Cajas, transferencias y Caja General."
							: "Tu caja: saldo, movimientos y carga de ingresos y egresos."}
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<SelectorMes
						year={year}
						month0={month0}
						loading={fetching}
						onChange={(y, m) => {
							setYear(y);
							setMonth0(m);
						}}
					/>
					<Button
						variant="outline"
						onClick={() => exportar("xlsx")}
						disabled={!!exportando || fetching}
						title="Informe del período en Excel"
					>
						{exportando === "xlsx" ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<FileSpreadsheet className="mr-2 h-4 w-4" />
						)}
						Exportar Excel
					</Button>
					<Button
						variant="outline"
						onClick={() => exportar("pdf")}
						disabled={!!exportando || fetching}
						title="Informe del período en PDF"
					>
						{exportando === "pdf" ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<FileDown className="mr-2 h-4 w-4" />
						)}
						Exportar PDF
					</Button>
					{esAdmin && (
						<>
							<Button variant="outline" onClick={() => setCambioOpen(true)}>
								<DollarSign className="mr-2 h-4 w-4" />
								Comprar / vender dólares
							</Button>
							<Button variant="outline" onClick={() => setTrOpen(true)}>
								<ArrowLeftRight className="mr-2 h-4 w-4" />
								Transferencia
							</Button>
						</>
					)}
					<Button onClick={() => setMovOpen(true)} disabled={operables.length === 0}>
						<Plus className="mr-2 h-4 w-4" />
						Registrar movimiento
					</Button>
				</div>
			</div>

			{esAdmin && general && (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<Kpi
						titulo="Caja General"
						valor={general.saldo + dolaresEnPesos}
						icon={Landmark}
						color="border-l-primary"
						detalle={detalleGeneral}
					/>
					<Kpi
						titulo={anual ? `Ingresos ${year}` : "Ingresos del mes"}
						valor={general.ingresosMes}
						icon={TrendingUp}
						color="border-l-emerald-500"
					/>
					<Kpi
						titulo={anual ? `Egresos ${year}` : "Egresos del mes"}
						valor={general.egresosMes}
						icon={TrendingDown}
						color="border-l-red-500"
					/>
					<Kpi
						titulo={anual ? `Diferencia ${year}` : "Diferencia del mes"}
						valor={general.ingresosMes - general.egresosMes}
						icon={Scale}
						color="border-l-sky-500"
					/>
				</div>
			)}

			{esAdmin ? (
				<Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
					<TabsList>
						<TabsTrigger value="PRINCIPAL">{CAJA_GRUPO_LABEL.PRINCIPAL}</TabsTrigger>
						<TabsTrigger value="MONOTRIBUTO">{CAJA_GRUPO_LABEL.MONOTRIBUTO}</TabsTrigger>
						<TabsTrigger value="GENERAL">Caja General</TabsTrigger>
						<TabsTrigger value="PROYECCION">Proyección</TabsTrigger>
						<TabsTrigger value="TARJETAS">Tarjetas</TabsTrigger>
						<TabsTrigger value="RUBROS">Rubros</TabsTrigger>
					</TabsList>

					{(["PRINCIPAL", "MONOTRIBUTO"] as const).map((g) => (
						<TabsContent key={g} value={g} className="mt-4 space-y-4">
							{g === "MONOTRIBUTO" && (
								<div className="flex justify-end">
									<Button variant="outline" size="sm" onClick={() => setMonoOpen(true)}>
										<UserPlus className="mr-2 h-4 w-4" />
										Nueva caja monotributo
									</Button>
								</div>
							)}
							<VistaCajas
								cajas={cajasDe(g)}
								selectedId={selectedId}
								onSelect={setSelectedId}
								mesLabel={mesLabel}
								token={token}
								esAdmin
								operables={operables}
								version={version}
								onChanged={refrescar}
								rango={rango}
							/>
						</TabsContent>
					))}

					<TabsContent value="GENERAL" className="mt-4 space-y-6">
						{general && (
							<CajaGeneralPanel
								cajas={cajas}
								general={general}
								mes={mes}
								token={token}
								version={version}
							/>
						)}
						<MovimientosPanel
							token={token}
							titulo="Todos los movimientos"
							mostrarCaja
							esAdmin
							cajas={operables}
							version={version}
							onChanged={refrescar}
							rango={rango}
							periodoLabel={mesLabel}
						/>
					</TabsContent>

					<TabsContent value="PROYECCION" className="mt-4">
						<ProyeccionPanel anio={year} token={token} version={version} />
					</TabsContent>

					<TabsContent value="TARJETAS" className="mt-4">
						<TarjetasPanel token={token} version={version} onChanged={refrescar} />
					</TabsContent>

					<TabsContent value="RUBROS" className="mt-4">
						<RubrosManager token={token} />
					</TabsContent>
				</Tabs>
			) : (
				<VistaCajas
					cajas={cajas}
					selectedId={selectedId}
					onSelect={setSelectedId}
					mesLabel={mesLabel}
					token={token}
					esAdmin={false}
					operables={operables}
					version={version}
					onChanged={refrescar}
					rango={rango}
				/>
			)}

			<MovimientoDialog
				open={movOpen}
				onOpenChange={setMovOpen}
				token={token}
				cajas={operables}
				defaultCajaId={operableSel}
				onSaved={refrescar}
			/>
			{esAdmin && (
				<>
					<CambioDialog
						open={cambioOpen}
						onOpenChange={setCambioOpen}
						token={token}
						cajas={operables}
						defaultCajaId={operableSel}
						onSaved={refrescar}
					/>
					<TransferenciaDialog
						open={trOpen}
						onOpenChange={setTrOpen}
						token={token}
						cajas={operables}
						onSaved={refrescar}
					/>
					<NuevaCajaMonotributoDialog
						open={monoOpen}
						onOpenChange={setMonoOpen}
						token={token}
						dueniosActuales={cajasDe("MONOTRIBUTO")
							.map((c) => c.ownerUserId)
							.filter((id): id is number => id !== null)}
						onSaved={refrescar}
					/>
				</>
			)}
		</div>
	);
}
