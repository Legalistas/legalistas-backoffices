"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CONCEPTO_LABEL, type ConceptoTipo } from "@/constant/rrhh";
import { nombreMesCorto } from "./tablas";
import type { PersonaReporte } from "./types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const COLORES: Record<ConceptoTipo, string> = {
	REMUNERACION: "#3b82f6",
	CARGAS_SOCIALES: "#f59e0b",
	OBRA_SOCIAL: "#10b981",
	MONOTRIBUTO: "#8b5cf6",
	IIBB: "#ef4444",
	OTRO: "#94a3b8",
};

const corto = (v: number) =>
	Math.abs(v) >= 1_000_000
		? `$${(v / 1_000_000).toFixed(1)}M`
		: Math.abs(v) >= 1_000
			? `$${(v / 1_000).toFixed(0)}K`
			: `$${v.toFixed(0)}`;

/** Costo laboral por mes, apilado por concepto (lo cargado en los recibos). */
export function CostosPorMesChart({
	personas,
	periodos,
}: {
	personas: PersonaReporte[];
	periodos: string[];
}) {
	const { series, hayDatos } = useMemo(() => {
		const conceptos = Object.keys(CONCEPTO_LABEL) as ConceptoTipo[];
		const series = conceptos
			.map((c) => ({
				name: CONCEPTO_LABEL[c],
				color: COLORES[c],
				data: periodos.map((p) =>
					personas.reduce((s, x) => s + (x.costos?.porMes[p]?.[c] ?? 0), 0),
				),
			}))
			.filter((s) => s.data.some((v) => v > 0));
		return { series, hayDatos: series.length > 0 };
	}, [personas, periodos]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Costo laboral por mes</CardTitle>
				<CardDescription>
					Remuneración, cargas, obra social, monotributo e IIBB de los recibos
				</CardDescription>
			</CardHeader>
			<CardContent className="h-[320px]">
				{hayDatos ? (
					<Chart
						type="bar"
						height="100%"
						series={series}
						options={{
							chart: { stacked: true, background: "transparent", toolbar: { show: false } },
							colors: series.map((s) => s.color),
							plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
							dataLabels: { enabled: false },
							xaxis: {
								categories: periodos.map(nombreMesCorto),
								labels: { style: { colors: "#94a3b8", fontSize: "12px" } },
							},
							yaxis: {
								labels: { formatter: corto, style: { colors: "#94a3b8", fontSize: "12px" } },
							},
							grid: { borderColor: "#334155", strokeDashArray: 3 },
							legend: { position: "top", labels: { colors: "#cbd5e1" } },
							tooltip: {
								theme: "dark",
								y: {
									formatter: (v: number) =>
										v.toLocaleString("es-AR", { style: "currency", currency: "ARS" }),
								},
							},
						}}
					/>
				) : (
					<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
						Sin recibos cargados en el período
					</div>
				)}
			</CardContent>
		</Card>
	);
}
