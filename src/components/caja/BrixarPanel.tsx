"use client";

import { FileSpreadsheet, Link2Off, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportarExcel, type TablaInforme } from "@/lib/exportar";
import { cn } from "@/lib/utils";
import { cajaFetch, formatARS, formatFecha } from "./api";

// Caja Agustín ↔ Brixar: saldo y movimientos de "Agustín — Blanca" y
// "Agustín — Negra" en Brixar, del mismo período que la caja. Solo lectura:
// los movimientos se cargan en Brixar.

interface MovimientoBrixar {
	id: string;
	fecha: string;
	tipo: "ingreso" | "egreso";
	categoria?: string | null;
	proveedor?: string | null;
	detalle?: string | null;
	monto: number;
	proyecto?: string | null;
}

interface CajaBrixar {
	id: string;
	nombre: string;
	linea: "BLANCA" | "NEGRA" | null;
	saldo: number;
	ingresos: number;
	egresos: number;
	movimientos: MovimientoBrixar[];
}

interface RespuestaBrixar {
	configurado: boolean;
	rango: { desde: string; hasta: string };
	generadoEn: string | null;
	cajas: CajaBrixar[];
}

const LINEA_LABEL = { BLANCA: "Blanca", NEGRA: "Negra" } as const;

function Movimientos({ caja }: { caja: CajaBrixar }) {
	if (caja.movimientos.length === 0) {
		return (
			<p className="py-6 text-center text-sm text-muted-foreground">
				Sin movimientos en el período
			</p>
		);
	}
	return (
		<div className="max-h-[420px] overflow-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-24">Fecha</TableHead>
						<TableHead>Categoría</TableHead>
						<TableHead>Proveedor / detalle</TableHead>
						<TableHead>Proyecto</TableHead>
						<TableHead className="text-right">Monto</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{caja.movimientos.map((m) => (
						<TableRow key={m.id}>
							<TableCell className="whitespace-nowrap text-xs">{formatFecha(m.fecha)}</TableCell>
							<TableCell className="text-xs">{m.categoria || "—"}</TableCell>
							<TableCell className="max-w-[320px] text-xs">
								<span className="block truncate">{m.proveedor || "—"}</span>
								{m.detalle && (
									<span className="block truncate text-muted-foreground">{m.detalle}</span>
								)}
							</TableCell>
							<TableCell className="text-xs">{m.proyecto || "—"}</TableCell>
							<TableCell
								className={cn(
									"whitespace-nowrap text-right text-xs font-medium tabular-nums",
									m.tipo === "ingreso" ? "text-emerald-600" : "text-rose-600",
								)}
							>
								{m.tipo === "ingreso" ? "+" : "−"}
								{formatARS(m.monto)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

export default function BrixarPanel({
	token,
	rango,
	periodoLabel,
}: {
	token: string | undefined;
	rango: { desde: string; hasta: string };
	periodoLabel: string;
}) {
	const [datos, setDatos] = useState<RespuestaBrixar | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [cargando, setCargando] = useState(false);

	const cargar = useCallback(async () => {
		if (!token) return;
		setCargando(true);
		setError(null);
		try {
			const r = await cajaFetch<RespuestaBrixar>(
				`/brixar?desde=${rango.desde}&hasta=${rango.hasta}`,
				token,
			);
			setDatos(r);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setCargando(false);
		}
	}, [token, rango.desde, rango.hasta]);

	useEffect(() => {
		cargar();
	}, [cargar]);

	const exportar = async () => {
		if (!datos) return;
		const tablas: TablaInforme[] = datos.cajas.map((c) => ({
			titulo: c.nombre,
			columnas: ["Fecha", "Tipo", "Categoría", "Proveedor", "Detalle", "Proyecto", "Monto"],
			filas: c.movimientos.map((m) => [
				formatFecha(m.fecha),
				m.tipo === "ingreso" ? "Ingreso" : "Egreso",
				m.categoria ?? "",
				m.proveedor ?? "",
				m.detalle ?? "",
				m.proyecto ?? "",
				m.tipo === "ingreso" ? m.monto : -m.monto,
			]),
			totales: ["Neto del período", "", "", "", "", "", c.ingresos - c.egresos],
			montos: [6],
		}));
		try {
			await exportarExcel(`Brixar cajas Agustín ${periodoLabel}`, tablas);
		} catch (err) {
			toast.error((err as Error).message || "No se pudo exportar");
		}
	};

	const encabezado = (
		<CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
			<div>
				<CardTitle className="flex items-center gap-2 text-base">
					Brixar · cajas de Agustín
					<Badge variant="outline" className="text-[10px] font-normal">
						Solo lectura
					</Badge>
				</CardTitle>
				<CardDescription>
					Saldo actual y movimientos de {periodoLabel}. Se cargan en Brixar.
					{datos?.generadoEn &&
						` Actualizado a las ${new Date(datos.generadoEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`}
				</CardDescription>
			</div>
			<div className="flex shrink-0 gap-2">
				{datos?.configurado && datos.cajas.length > 0 && (
					<Button variant="outline" size="sm" onClick={exportar}>
						<FileSpreadsheet className="mr-1 h-4 w-4" />
						Excel
					</Button>
				)}
				<Button variant="ghost" size="icon" onClick={cargar} disabled={cargando} title="Actualizar">
					<RefreshCw className={cn("h-4 w-4", cargando && "animate-spin")} />
				</Button>
			</div>
		</CardHeader>
	);

	if (cargando && !datos) {
		return (
			<Card>
				{encabezado}
				<CardContent className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-24" />
					<Skeleton className="h-24" />
				</CardContent>
			</Card>
		);
	}

	if (error || (datos && !datos.configurado)) {
		return (
			<Card>
				{encabezado}
				<CardContent>
					<div className="flex items-start gap-3 rounded-md border border-dashed p-4 text-sm">
						<Link2Off className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
						<div>
							<p className="font-medium">
								{error ? "No se pudo leer Brixar" : "La conexión con Brixar todavía no está activa"}
							</p>
							<p className="text-muted-foreground">
								{error ??
									"Falta configurar la clave compartida entre Legalistas y Brixar en el servidor."}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!datos) return null;

	if (datos.cajas.length === 0) {
		return (
			<Card>
				{encabezado}
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Brixar no devolvió ninguna caja de Agustín (revisar que se llamen "Agustín — Blanca" y
						"Agustín — Negra").
					</p>
				</CardContent>
			</Card>
		);
	}

	const primera = datos.cajas[0];
	return (
		<Card>
			{encabezado}
			<CardContent className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-2">
					{datos.cajas.map((c) => (
						<div
							key={c.id}
							className={cn(
								"rounded-lg border p-3",
								c.linea === "NEGRA"
									? "border-l-4 border-l-zinc-700"
									: "border-l-4 border-l-sky-400",
							)}
						>
							<p className="text-sm font-medium">{c.nombre}</p>
							<p
								className={cn(
									"mt-1 text-xl font-bold tabular-nums",
									c.saldo < 0 ? "text-rose-600" : "text-foreground",
								)}
							>
								{formatARS(c.saldo)}
							</p>
							<p className="text-xs text-muted-foreground">
								Saldo actual · en {periodoLabel}:{" "}
								<span className="text-emerald-600">+{formatARS(c.ingresos)}</span>{" "}
								<span className="text-rose-600">−{formatARS(c.egresos)}</span>
							</p>
						</div>
					))}
				</div>

				<Tabs defaultValue={primera.id}>
					<TabsList>
						{datos.cajas.map((c) => (
							<TabsTrigger key={c.id} value={c.id}>
								{c.linea ? LINEA_LABEL[c.linea] : c.nombre}
								<Badge variant="secondary" className="ml-2">
									{c.movimientos.length}
								</Badge>
							</TabsTrigger>
						))}
					</TabsList>
					{datos.cajas.map((c) => (
						<TabsContent key={c.id} value={c.id} className="mt-3">
							<Movimientos caja={c} />
						</TabsContent>
					))}
				</Tabs>
			</CardContent>
		</Card>
	);
}
