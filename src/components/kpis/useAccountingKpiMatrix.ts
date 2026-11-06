"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/constant/api-endpoints";
import type { KpiMatrixRow, KpiMatrixSection, KpiResponse } from "@/types/kpi";
import { buildPeriodAxis, type PeriodMode } from "./periodMode";

// DPTO. CONTABLE as in "KPIs DTO. CONTABLE 2026" (Jona, 06/11/2026). Contable
// loads the base figures by hand when each month closes (pencil cells, manual
// KPIs); the backend calculates margin, result and ticket
// (backend modules/kpis/accounting.ts). Monthly only: the weekly view shows
// the months too.

/** GET /kpis/accounting: the month's figures; null = not loaded. */
interface AccountingMonth {
	ingresos: number | null;
	egresosOperativos: number | null;
	margen: number | null;
	margenPct: number | null;
	inversiones: number | null;
	retiros: number | null;
	resultado: number | null;
	cantidadCobros: number | null;
	montoCobrado: number | null;
	ticketPromedio: number | null;
	cajaCierre: number | null;
	saldoProyectado: number | null;
	deudaAportes: number | null;
}

type Field = keyof AccountingMonth;

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
	try {
		const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

const sum = (vs: (number | null)[]) => vs.reduce<number>((a, v) => a + (v ?? 0), 0);
/** The last month with a figure (balances and debt are not added up). */
const last = (vs: (number | null)[]) => [...vs].reverse().find((v) => v !== null) ?? null;

export interface UseAccountingKpiMatrixResult {
	sections: KpiMatrixSection[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
	periodLabels: string[];
}

export function useAccountingKpiMatrix(
	year: number,
	_mode: PeriodMode = { type: "year" },
): UseAccountingKpiMatrixResult {
	const { data: session } = useSession();
	const [sections, setSections] = useState<KpiMatrixSection[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const axis = useMemo(() => buildPeriodAxis(year, { type: "year" }), [year]);

	const load = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;
		setLoading(true);
		setError(null);
		try {
			const months = await Promise.all(
				axis.queries.map((qs) =>
					fetchJson<KpiResponse<AccountingMonth>>(`${API_BASE_URL}/kpis/accounting?${qs}`, token),
				),
			);
			if (months.every((m) => m === null)) throw new Error("sin datos");
			const serie = (f: Field) => months.map((m) => m?.data?.[f] ?? null);

			// Loaded by hand: the pencil cell saves it as a manual KPI.
			const cargado = (
				f: Field,
				sourceKey: string,
				label: string,
				opts: Partial<KpiMatrixRow> = {},
			): KpiMatrixRow => ({
				key: f,
				label,
				format: "currency",
				monthlyValues: serie(f),
				editable: true,
				sourceKey,
				...opts,
			});
			const calculado = (f: Field, label: string, opts: Partial<KpiMatrixRow> = {}): KpiMatrixRow => ({
				key: f,
				label,
				format: "currency",
				monthlyValues: serie(f),
				...opts,
			});

			const ingresos = sum(serie("ingresos"));
			const margen = sum(serie("margen"));
			const cobros = sum(serie("cantidadCobros"));

			setSections([
				{
					key: "contable",
					label: "DPTO. CONTABLE",
					subSections: [
						{
							key: "resultado",
							label: "Resultado del negocio (flujo de caja real)",
							rows: [
								cargado("ingresos", "contable_ingresos", "Ingresos del mes (cobrado)"),
								cargado(
									"egresosOperativos",
									"contable_egresos_operativos",
									"Egresos operativos (sin inversiones ni retiros)",
								),
								calculado("margen", "Margen operativo ($)"),
								calculado("margenPct", "Margen operativo (%)", {
									format: "percent",
									accumulated: ingresos ? Math.round((margen / ingresos) * 10000) / 100 : null,
								}),
								cargado("inversiones", "contable_inversiones", "Inversiones (Brixar, Fixer, compra USD)"),
								cargado("retiros", "contable_retiros", "Retiros del dueño"),
								calculado("resultado", "Resultado del ejercicio"),
							],
						},
						{
							key: "cobros",
							label: "Cobros",
							rows: [
								cargado("cantidadCobros", "contable_cantidad_cobros", "Cantidad de cobros", {
									format: "number",
								}),
								cargado(
									"montoCobrado",
									"contable_monto_cobrado",
									"Monto cobrado (honorarios + cuota litis)",
								),
								calculado("ticketPromedio", "Ticket promedio por cobro", {
									accumulated: cobros ? Math.round((sum(serie("montoCobrado")) / cobros) * 100) / 100 : null,
								}),
							],
						},
						{
							key: "caja",
							label: "Caja y previsión",
							rows: [
								cargado("cajaCierre", "contable_caja_cierre", "Caja disponible al cierre", {
									allowNegative: true,
									accumulated: last(serie("cajaCierre")),
								}),
								cargado("saldoProyectado", "contable_saldo_proyectado", "Saldo proyectado a 3 meses", {
									allowNegative: true,
									accumulated: last(serie("saldoProyectado")),
								}),
							],
						},
						{
							key: "previsional",
							label: "Obligaciones previsionales",
							rows: [
								cargado(
									"deudaAportes",
									"contable_deuda_aportes",
									"Deuda de aportes pendiente (Caja de Abogados + Caja Forense)",
									{ accumulated: last(serie("deudaAportes")) },
								),
							],
						},
					],
				},
			]);
		} catch (err) {
			console.error("Error loading Accounting KPI matrix:", err);
			setError("No se pudieron cargar los KPIs Contables");
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, axis]);

	useEffect(() => {
		load();
	}, [load]);

	return { sections, loading, error, refresh: load, periodLabels: axis.labels };
}
