"use client";

import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/constant/api-endpoints";
import type { KpiResponse } from "@/types/kpi";

// ─── Types ────────────────────────────────────────────────────────────

interface Vma {
	percent: number;
	direction: "up" | "down" | "flat";
	absolute: number;
}

interface AreaSummary {
	current: Record<string, number>;
	previous: Record<string, number>;
	vma: Record<string, Vma>;
	avgVma: Vma;
	semaforo: "green" | "yellow" | "red";
}

interface SummaryData {
	legal: AreaSummary;
	sales: AreaSummary;
	marketing: AreaSummary;
	accounting: AreaSummary | null;
}

interface KpisSummaryProps {
	year: number;
	month: number;
	/** Si viene, se pide por semana ISO; si no, cae al filtro mensual clásico. */
	week?: number;
}

// ─── Formato ──────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, { label: string; format: "number" | "currency" | "percent" }> = {
	// Legal
	cierres: { label: "Cierres", format: "number" },
	capitalCerrado: { label: "Capital cerrado", format: "currency" },
	ingresos: { label: "Ingresos (casos nuevos)", format: "number" },
	negociacionesActivas: { label: "Negociaciones activas", format: "number" },
	causasSinMov60: { label: "Sin movimiento > 60 días", format: "number" },
	// Sales
	poderesFirmados: { label: "Poderes firmados", format: "number" },
	oportunidadesGanadas: { label: "Oportunidades ganadas", format: "number" },
	tasaConversion: { label: "Tasa de conversión", format: "percent" },
	videollamadasRealizadas: { label: "Videollamadas realizadas", format: "number" },
	tiempoPromedioCierre: { label: "Tiempo prom. cierre (d)", format: "number" },
	// Marketing
	consultasOrganicas: { label: "Consultas orgánicas", format: "number" },
	ventasOrganicas: { label: "Ventas orgánicas", format: "number" },
	ventasFormularios: { label: "Ventas de formularios", format: "number" },
	totalVentasMarketing: { label: "Total ventas marketing", format: "number" },
	conversionGlobal: { label: "Conversión global", format: "percent" },
	// Accounting
	ingresosOperativos: { label: "Ingresos operativos", format: "currency" },
	totalGastos: { label: "Total gastos", format: "currency" },
	resultadoEjercicio: { label: "Resultado del ejercicio", format: "currency" },
	saldoCaja: { label: "Saldo caja actual", format: "currency" },
	cobrosTotal: { label: "Cobros del período", format: "currency" },
};

const AREA_LABELS: Record<string, string> = {
	legal: "Legales",
	sales: "Ventas",
	marketing: "Marketing",
	accounting: "Contable",
};

function formatValue(v: number, format: "number" | "currency" | "percent"): string {
	if (format === "currency") {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			maximumFractionDigits: 0,
		}).format(v);
	}
	if (format === "percent") return `${v.toFixed(1)}%`;
	return new Intl.NumberFormat("es-AR").format(v);
}

const SEMAPHORE_COLORS = {
	green: "bg-green-100 border-green-400 dark:bg-green-950 dark:border-green-800",
	yellow: "bg-amber-100 border-amber-400 dark:bg-amber-950 dark:border-amber-800",
	red: "bg-red-100 border-red-400 dark:bg-red-950 dark:border-red-800",
};

const SEMAPHORE_DOT = {
	green: "bg-green-500",
	yellow: "bg-amber-500",
	red: "bg-red-500",
};

export default function KpiSummary({ year, month, week }: KpisSummaryProps) {
	const { data: session } = useSession();
	const [data, setData] = useState<SummaryData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;
		setLoading(true);
		setError(null);
		try {
			const qs =
				week != null
					? `week=${week}&year=${year}`
					: `month=${month}&year=${year}`;
			const res = await fetch(`${API_BASE_URL}/kpis/summary?${qs}`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = (await res.json()) as KpiResponse<SummaryData>;
			setData(json.data);
		} catch (err) {
			console.error(err);
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, month, year, week]);

	useEffect(() => {
		load();
	}, [load]);

	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="h-8 w-8 animate-spin" />
			</div>
		);
	}
	if (error) {
		return (
			<div className="text-center py-16 text-destructive">
				Error al cargar resumen: {error}
			</div>
		);
	}
	if (!data) return null;

	const areas: Array<{ key: keyof SummaryData; label: string }> = [
		{ key: "legal", label: "Legales" },
		{ key: "sales", label: "Ventas" },
		{ key: "marketing", label: "Marketing" },
		{ key: "accounting", label: "Contable" },
	];

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{areas.map(({ key, label }) => {
					const area = data[key];
					if (!area) {
						return (
							<div
								key={key}
								className="rounded-lg border p-6 bg-muted/30 text-center text-sm text-muted-foreground"
							>
								<div className="font-medium mb-1">{label}</div>
								Sin permiso para ver esta sección.
							</div>
						);
					}
					const semaforoClass = SEMAPHORE_COLORS[area.semaforo];
					const dotClass = SEMAPHORE_DOT[area.semaforo];
					return (
						<div
							key={key}
							className={`rounded-lg border-2 p-5 ${semaforoClass}`}
						>
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-semibold flex items-center gap-2">
									<span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
									{AREA_LABELS[key]}
								</h3>
								<div className="flex items-center gap-1 text-sm font-medium">
									{area.avgVma.direction === "up" && (
										<TrendingUp className="h-4 w-4 text-green-600" />
									)}
									{area.avgVma.direction === "down" && (
										<TrendingDown className="h-4 w-4 text-red-600" />
									)}
									<span
										className={
											area.avgVma.direction === "up"
												? "text-green-700 dark:text-green-400"
												: area.avgVma.direction === "down"
													? "text-red-700 dark:text-red-400"
													: "text-muted-foreground"
										}
									>
										{area.avgVma.percent > 0 ? "+" : ""}
										{area.avgVma.percent.toFixed(1)}%
									</span>
								</div>
							</div>
							<div className="space-y-2">
								{Object.entries(area.current).map(([metricKey, value]) => {
									const def = METRIC_LABELS[metricKey] ?? {
										label: metricKey,
										format: "number" as const,
									};
									const vma = area.vma[metricKey];
									return (
										<div
											key={metricKey}
											className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0"
										>
											<span className="text-muted-foreground">
												{def.label}
											</span>
											<div className="flex items-center gap-3">
												<span className="font-semibold tabular-nums">
													{formatValue(value, def.format)}
												</span>
												{vma && vma.direction !== "flat" && (
													<span
														className={`text-xs tabular-nums ${
															vma.direction === "up"
																? "text-green-600"
																: "text-red-600"
														}`}
													>
														{vma.percent > 0 ? "+" : ""}
														{vma.percent.toFixed(1)}%
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
