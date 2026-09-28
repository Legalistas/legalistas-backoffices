"use client";

import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { exportarExcel, exportarPdf, type TablaInforme } from "@/lib/exportar";
import { cn } from "@/lib/utils";
import type { Proyeccion } from "@/types/caja";
import { cajaFetch, formatARS } from "./api";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const nombreMes = (mes: string) => {
	const [y, m] = mes.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long" });
};

const saldoDelMes = (m: Proyeccion["meses"][number]) => m.saldoProyectado ?? m.saldoReal;

/**
 * Caja General del año, mes a mes: lo real (movimientos de la Caja
 * Contable) y lo previsto (pendiente de Gastos e Ingresos, con las cuotas de
 * tarjetas y los cobros de cierres), con el saldo real y el proyectado.
 */
export default function ProyeccionPanel({
	anio,
	token,
	version,
}: {
	anio: number;
	token: string | undefined;
	version: number;
}) {
	const [data, setData] = useState<Proyeccion | null>(null);
	const [exportando, setExportando] = useState<"xlsx" | "pdf" | null>(null);

	useEffect(() => {
		if (!token) return;
		setData(null);
		cajaFetch<{ data: Proyeccion }>(`/proyeccion?anio=${anio}`, token)
			.then((r) => setData(r.data))
			.catch((e) => toast.error((e as Error).message));
	}, [token, anio, version]);

	const grafico = useMemo(() => {
		if (!data) return null;
		const ingresos = data.meses.map((m) =>
			Math.round(m.real.ingresos + (m.estado === "pasado" ? 0 : m.previsto.ingresos)),
		);
		const egresos = data.meses.map((m) =>
			Math.round(m.real.egresos + (m.estado === "pasado" ? 0 : m.previsto.egresos)),
		);
		return {
			series: [
				{ name: "Ingresos", type: "column", data: ingresos },
				{ name: "Egresos", type: "column", data: egresos },
				{ name: "Saldo", type: "line", data: data.meses.map((m) => Math.round(saldoDelMes(m))) },
			],
			options: {
				chart: { type: "line" as const, toolbar: { show: false }, fontFamily: "inherit" },
				colors: ["#10b981", "#ef4444", "#09a4b5"],
				stroke: { width: [0, 0, 3] },
				plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
				dataLabels: { enabled: false },
				xaxis: { categories: data.meses.map((m) => nombreMes(m.mes).slice(0, 3)) },
				yaxis: {
					labels: {
						formatter: (v: number) =>
							new Intl.NumberFormat("es-AR", { notation: "compact" }).format(v),
					},
				},
				tooltip: { y: { formatter: (v: number) => formatARS(v) } },
				legend: { position: "top" as const },
				// Los meses que vienen son proyección: se marcan con una franja.
				annotations: {
					xaxis: data.meses.some((m) => m.estado !== "pasado")
						? [
								{
									x: nombreMes(
										data.meses.find((m) => m.estado !== "pasado")?.mes ?? data.meses[0].mes,
									).slice(0, 3),
									x2: nombreMes(data.meses[11].mes).slice(0, 3),
									fillColor: "#09a4b5",
									opacity: 0.06,
									label: { text: "Proyección", style: { color: "#0e7490" } },
								},
							]
						: [],
				},
			},
		};
	}, [data]);

	const informe = (): TablaInforme | null =>
		data && {
			titulo: `Proyección ${data.anio}`,
			columnas: [
				"Mes",
				"Estado",
				"Ingresos reales",
				"Egresos reales",
				"A cobrar",
				"A pagar",
				"Saldo real",
				"Saldo proyectado",
			],
			filas: data.meses.map((m) => [
				nombreMes(m.mes),
				m.estado === "pasado" ? "Cerrado" : m.estado === "actual" ? "En curso" : "Proyectado",
				m.real.ingresos,
				m.real.egresos,
				m.previsto.ingresos,
				m.previsto.egresos,
				m.saldoReal,
				m.saldoProyectado,
			]),
			totales: [
				"Total",
				"",
				data.totales.real.ingresos,
				data.totales.real.egresos,
				data.totales.previsto.ingresos,
				data.totales.previsto.egresos,
				"",
				"",
			],
			montos: [2, 3, 4, 5, 6, 7],
		};

	const exportar = async (formato: "xlsx" | "pdf") => {
		const tabla = informe();
		if (!tabla) return;
		setExportando(formato);
		try {
			const archivo = `Proyeccion Caja General ${anio}`;
			if (formato === "xlsx") await exportarExcel(archivo, [tabla]);
			else
				await exportarPdf(archivo, {
					titulo: `Caja General — Proyección ${anio}`,
					subtitulo: `Saldo al 1/1: ${formatARS(data?.saldoInicioAnio ?? 0)}`,
					tablas: [tabla],
					horizontal: true,
				});
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setExportando(null);
		}
	};

	if (!data || !grafico) return <Skeleton className="h-96 w-full" />;

	const cierre = data.meses[11];
	const pendiente = data.meses.reduce(
		(s, m) => (m.estado === "pasado" ? s : s + m.previsto.ingresos - m.previsto.egresos),
		data.arrastre.ingresos - data.arrastre.egresos,
	);

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Resumen titulo="Saldo al 1 de enero" valor={data.saldoInicioAnio} />
				<Resumen
					titulo={`Resultado real ${anio}`}
					valor={data.totales.real.ingresos - data.totales.real.egresos}
				/>
				<Resumen titulo="Pendiente neto (a cobrar − a pagar)" valor={pendiente} />
				<Resumen titulo="Saldo proyectado al 31/12" valor={saldoDelMes(cierre)} />
			</div>

			<Card>
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
					<div>
						<CardTitle className="text-base">Caja General {anio}</CardTitle>
						<CardDescription>
							Los meses que vienen suman lo pendiente de Gastos e Ingresos (cobros de cierres,
							gastos y cuotas de tarjetas).
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => exportar("xlsx")}
							disabled={!!exportando}
						>
							{exportando === "xlsx" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<FileSpreadsheet className="mr-2 h-4 w-4" />
							)}
							Excel
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => exportar("pdf")}
							disabled={!!exportando}
						>
							{exportando === "pdf" ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<FileDown className="mr-2 h-4 w-4" />
							)}
							PDF
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<ReactApexChart
						options={grafico.options}
						series={grafico.series}
						type="line"
						height={300}
					/>

					<Table>
						<TableHeader className="bg-muted/50">
							<TableRow>
								<TableHead>Mes</TableHead>
								<TableHead className="text-right">Ingresos</TableHead>
								<TableHead className="text-right">Egresos</TableHead>
								<TableHead className="text-right">A cobrar</TableHead>
								<TableHead className="text-right">A pagar</TableHead>
								<TableHead className="text-right">Saldo</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.meses.map((m) => (
								<TableRow key={m.mes} className={cn(m.estado === "actual" && "bg-primary/5")}>
									<TableCell className="capitalize">
										{nombreMes(m.mes)}
										{m.estado === "actual" && (
											<Badge variant="outline" className="ml-2 text-[10px]">
												En curso
											</Badge>
										)}
									</TableCell>
									<TableCell className="text-right tabular-nums text-emerald-600">
										{m.real.ingresos ? formatARS(m.real.ingresos) : "—"}
									</TableCell>
									<TableCell className="text-right tabular-nums text-red-600">
										{m.real.egresos ? formatARS(m.real.egresos) : "—"}
									</TableCell>
									<TableCell
										className={cn(
											"text-right tabular-nums text-emerald-700/80",
											m.estado === "pasado" && m.previsto.ingresos > 0 && "text-amber-600",
										)}
										title={m.estado === "pasado" ? "Vencido sin cobrar" : undefined}
									>
										{m.previsto.ingresos ? formatARS(m.previsto.ingresos) : "—"}
									</TableCell>
									<TableCell
										className={cn(
											"text-right tabular-nums text-red-700/80",
											m.estado === "pasado" && m.previsto.egresos > 0 && "text-amber-600",
										)}
										title={m.estado === "pasado" ? "Vencido sin pagar" : undefined}
									>
										{m.previsto.egresos ? formatARS(m.previsto.egresos) : "—"}
									</TableCell>
									<TableCell
										className={cn(
											"text-right font-medium tabular-nums",
											saldoDelMes(m) < 0 && "text-red-600",
											m.saldoProyectado !== null && "italic",
										)}
									>
										{formatARS(saldoDelMes(m))}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
						<TableFooter>
							<TableRow>
								<TableCell className="font-semibold">Total {anio}</TableCell>
								<TableCell className="text-right font-semibold tabular-nums">
									{formatARS(data.totales.real.ingresos)}
								</TableCell>
								<TableCell className="text-right font-semibold tabular-nums">
									{formatARS(data.totales.real.egresos)}
								</TableCell>
								<TableCell className="text-right font-semibold tabular-nums">
									{formatARS(data.totales.previsto.ingresos)}
								</TableCell>
								<TableCell className="text-right font-semibold tabular-nums">
									{formatARS(data.totales.previsto.egresos)}
								</TableCell>
								<TableCell />
							</TableRow>
						</TableFooter>
					</Table>
					<p className="text-xs text-muted-foreground">
						Saldo en cursiva = proyectado (real + lo pendiente que vence hasta ese mes). En ámbar,
						lo que venció y sigue sin cobrar o pagar.
						{data.arrastre.ingresos + data.arrastre.egresos > 0 &&
							` De años anteriores quedan pendientes ${formatARS(data.arrastre.ingresos)} a cobrar y ${formatARS(data.arrastre.egresos)} a pagar.`}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function Resumen({ titulo, valor }: { titulo: string; valor: number }) {
	return (
		<Card className="py-4">
			<CardContent className="px-5">
				<p className="text-sm text-muted-foreground">{titulo}</p>
				<p className={cn("text-xl font-semibold tabular-nums", valor < 0 && "text-red-600")}>
					{formatARS(valor)}
				</p>
			</CardContent>
		</Card>
	);
}
