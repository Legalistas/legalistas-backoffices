"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	KPI_LEGAL_ENDPOINT,
	MANUAL_KPIS_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	KpiLegalData,
	KpiMatrixRow,
	KpiMatrixSection,
	KpiResponse,
	ManualKpiEntry,
} from "@/types/kpi";
import { buildPeriodAxis, type PeriodMode } from "./periodMode";

// ─── Helpers ──────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
	try {
		const res = await fetch(url, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

// ─── Hook ─────────────────────────────────────────────────────────────

export interface UseKpiMatrixDataResult {
	sections: KpiMatrixSection[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
	/** Labels de las columnas de período. */
	periodLabels: string[];
}

export function useKpiMatrixData(
	year: number,
	mode: PeriodMode = { type: "year" },
): UseKpiMatrixDataResult {
	const { data: session } = useSession();
	const [sections, setSections] = useState<KpiMatrixSection[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// Memoizamos para estabilizar identidad — sin esto el useCallback abajo
	// se regenera en cada render y dispara refetch infinito.
	const axis = useMemo(() => buildPeriodAxis(year, mode), [year, mode]);
	const ZEROS = axis.zeros;

	const load = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;

		setLoading(true);
		setError(null);

		try {
			// N llamadas paralelas a /kpis/legal (una por columna de período) +
			// 1 a /manual-kpis para todo el rango.
			const legalPromises = axis.queries.map((qs) =>
				fetchJson<KpiResponse<KpiLegalData>>(
					`${KPI_LEGAL_ENDPOINT}?${qs}`,
					token,
				),
			);

			const manualPromise = fetchJson<{ entries: ManualKpiEntry[] }>(
				`${MANUAL_KPIS_ENDPOINT}?from=${axis.from}&to=${axis.to}`,
				token,
			);

			const [legalResults, manualResp] = await Promise.all([
				Promise.all(legalPromises),
				manualPromise,
			]);
			const manualEntries = manualResp?.entries ?? [];

			// ── Extraer valores mensuales del backend ───────────────────
			const cierres = ZEROS();
			const cierresJudiciales = ZEROS();
			const cierresSrt = ZEROS();
			const cierresExtrajudiciales = ZEROS();
			const cierresRafaela = ZEROS();
			const cierresReps = ZEROS();
			const capitalTotal = ZEROS();
			const capitalRafaela = ZEROS();
			const capitalReps = ZEROS();
			const ticketPromedio = ZEROS();
			const pctSobreActivas = ZEROS();
			const cobradasInterno = ZEROS();
			const cobradasReps = ZEROS();

			const ingresosTotal = ZEROS();
			const ingresosJudiciales = ZEROS();
			const ingresosSrt = ZEROS();
			const ingresosRafaela = ZEROS();
			const ingresosReps = ZEROS();

			const negocActivas = ZEROS();
			const negocIniciadas = ZEROS();
			const tasaExito = ZEROS();

			const casosSinMov60 = ZEROS();
			const casosSinMov90 = ZEROS();

			const repsTotal = ZEROS();
			const repsNuevos = ZEROS();
			const reunionesReps = ZEROS();

			const consultasBO = ZEROS();
			const usuariosPlataforma = ZEROS();

			// Sub-filas dinámicas por abogado interno.
			const internalLawyerMap = new Map<
				number,
				{
					name: string;
					causasActivas: (number | null)[];
					ingresos: (number | null)[];
					cierres: (number | null)[];
					capitalCerrado: (number | null)[];
					ticketPromedio: (number | null)[];
					reunionesRealizadas: (number | null)[];
					tasaConversion: (number | null)[];
				}
			>();

			for (let i = 0; i < axis.size; i++) {
				const result = legalResults[i];
				if (!result?.data) continue;
				const d = result.data;

				cierres[i] = d.cierres.total;
				cierresJudiciales[i] = d.cierres.judiciales;
				cierresSrt[i] = d.cierres.srt;
				cierresExtrajudiciales[i] = d.cierres.extrajudiciales;
				cierresRafaela[i] = d.cierres.rafaela;
				cierresReps[i] = d.cierres.representantes;
				capitalTotal[i] = d.cierres.capitalTotal;
				capitalRafaela[i] = d.cierres.capitalRafaela;
				capitalReps[i] = d.cierres.capitalRepresentantes;
				ticketPromedio[i] = d.cierres.ticketPromedio;
				pctSobreActivas[i] = d.cierres.porcentajeSobreActivas;
				cobradasInterno[i] = d.cierres.cobradasInterno;
				cobradasReps[i] = d.cierres.cobradasReps;

				ingresosTotal[i] = d.ingresos.total;
				ingresosJudiciales[i] = d.ingresos.judiciales;
				ingresosSrt[i] = d.ingresos.srt;
				ingresosRafaela[i] = d.ingresos.rafaela;
				ingresosReps[i] = d.ingresos.representantes;

				negocActivas[i] = d.negociaciones.activas;
				negocIniciadas[i] = d.negociaciones.iniciadas;
				tasaExito[i] = d.negociaciones.tasaExito;

				casosSinMov60[i] = d.causasSinMovimiento.count60Dias;
				casosSinMov90[i] = d.causasSinMovimiento.count90Dias;

				repsTotal[i] = d.representantes.totalActivos;
				repsNuevos[i] = d.representantes.nuevosDelPeriodo;
				reunionesReps[i] = d.representantes.reunionesRealizadas;

				consultasBO[i] = d.cx.consultasBO;
				usuariosPlataforma[i] = d.plataforma.usuariosActivos;

				// Vista por abogado interno: acumular por mes.
				for (const lawyer of d.porAbogadoInterno) {
					if (!internalLawyerMap.has(lawyer.userId)) {
						internalLawyerMap.set(lawyer.userId, {
							name: lawyer.name,
							causasActivas: ZEROS(),
							ingresos: ZEROS(),
							cierres: ZEROS(),
							capitalCerrado: ZEROS(),
							ticketPromedio: ZEROS(),
							reunionesRealizadas: ZEROS(),
							tasaConversion: ZEROS(),
						});
					}
					const entry = internalLawyerMap.get(lawyer.userId);
					if (!entry) continue;
					entry.causasActivas[i] = lawyer.causasActivas;
					entry.ingresos[i] = lawyer.ingresos;
					entry.cierres[i] = lawyer.cierres;
					entry.capitalCerrado[i] = lawyer.capitalCerrado;
					entry.ticketPromedio[i] = lawyer.ticketPromedio;
					entry.reunionesRealizadas[i] = lawyer.reunionesRealizadas;
					entry.tasaConversion[i] = lawyer.tasaConversion;
				}
			}

			// ── Manuales — solo los 11 realmente manuales ───────────────
			// Ya no hay lecturas "manual(legal_cierres_*)" etc — todo viene
			// del backend arriba. Los únicos manuales acá son los que están
			// en el catálogo: 4 sales + 6 legales + 1 cx.
			const manualByKey = new Map<string, (number | null)[]>();
			const manualByKeyUser = new Map<
				string,
				Map<number, { name: string; monthly: (number | null)[] }>
			>();

			for (const entry of manualEntries) {
				// FIX timezone: `new Date("2026-07-01").getMonth()` en ART (UTC-3)
				// devuelve Junio en vez de Julio porque Node/browser parsea el
				// string como UTC medianoche → 21:00 ART del día anterior.
				// Parseo directo del string YYYY-MM-DD sin conversión de TZ.
				const iso = String(entry.periodStart).slice(0, 10);
				// En year → índice del mes; en month-weeks → índice de la semana.
				const m = axis.bucketIndex(iso);
				if (m < 0) continue; // fuera del rango visible
				const value = Number(entry.value ?? 0);

				if (!manualByKey.has(entry.metricKey)) {
					manualByKey.set(entry.metricKey, ZEROS());
				}
				const arr = manualByKey.get(entry.metricKey);
				if (arr) arr[m] = (arr[m] ?? 0) + value;

				if (entry.userId && entry.user) {
					if (!manualByKeyUser.has(entry.metricKey)) {
						manualByKeyUser.set(entry.metricKey, new Map());
					}
					const userMap = manualByKeyUser.get(entry.metricKey);
					if (!userMap) continue;
					if (!userMap.has(entry.userId)) {
						userMap.set(entry.userId, {
							name: entry.user.name,
							monthly: ZEROS(),
						});
					}
					const userEntry = userMap.get(entry.userId);
					if (!userEntry) continue;
					userEntry.monthly[m] = (userEntry.monthly[m] ?? 0) + value;
				}
			}

			const manual = (key: string) => manualByKey.get(key) ?? ZEROS();

			// Total de telegramas = suma de los 3 tipos (calculado).
			const telegramasTotal = manual("legal_telegrams_alta").map(
				(_, i) =>
					(manual("legal_telegrams_alta")[i] ?? 0) +
					(manual("legal_telegrams_denuncia")[i] ?? 0) +
					(manual("legal_telegrams_tratamiento")[i] ?? 0),
			);

			// Sub-filas por abogado interno (todas comparten la misma lista).
			const internalLawyersSorted = Array.from(internalLawyerMap.entries())
				.map(([userId, l]) => ({ userId, ...l }))
				.sort((a, b) => a.name.localeCompare(b.name));

			const buildLawyerSubRows = (
				fieldKey: keyof (typeof internalLawyersSorted)[number],
				format: "number" | "currency" | "percent" = "number",
			): KpiMatrixRow[] =>
				internalLawyersSorted.map((l) => ({
					key: `${String(fieldKey)}-${l.userId}`,
					label: l.name,
					indentLevel: 2,
					format,
					monthlyValues: l[fieldKey] as (number | null)[],
				}));

			// ── Armar secciones ─────────────────────────────────────────
			const matrix: KpiMatrixSection[] = [
				{
					key: "estrategicas",
					label: "Métricas estratégicas",
					subSections: [
						{
							key: "estrategicas-main",
							label: "Estratégicas",
							rows: [
								{
									key: "cierres-total",
									label: "Cantidad de cierres (administrativos y judiciales)",
									format: "number",
									monthlyValues: cierres,
								},
								{
									key: "capitales-cerrados",
									label: "Capitales cerrados",
									format: "currency",
									monthlyValues: capitalTotal,
								},
								{
									key: "cierres-rep",
									label: "Cierres por representantes",
									format: "number",
									monthlyValues: cierresReps,
								},
								{
									key: "capital-rep",
									label: "Capitales representantes",
									format: "currency",
									monthlyValues: capitalReps,
								},
								{
									key: "comentarios-positivos",
									label: "Nuevos comentarios positivos",
									format: "number",
									editable: true,
									sourceKey: "cx_google_reviews_positive",
									monthlyValues: manual("cx_google_reviews_positive"),
								},
								{
									key: "usuarios-plataforma",
									label:
										"Cantidad de usuarios de plataforma (clientes activos)",
									format: "number",
									monthlyValues: usuariosPlataforma,
								},
							],
						},
					],
				},
				{
					key: "operativas",
					label: "Métricas operativas",
					subSections: [
						{
							key: "control-legal",
							label: "Control del sistema legal",
							rows: [
								{
									key: "casos-sin-mov-60",
									label: "Casos sin movimientos por más de 60 días",
									format: "number",
									monthlyValues: casosSinMov60,
								},
								{
									key: "casos-sin-mov-90",
									label: "Casos sin movimientos por más de 90 días",
									format: "number",
									monthlyValues: casosSinMov90,
								},
								{
									key: "casos-total",
									label: "Cantidad de casos legalistas (ingresos del período)",
									format: "number",
									monthlyValues: ingresosTotal,
								},
								{
									key: "causas-neg",
									label: "Cantidad de causas en negociación (activas)",
									format: "number",
									monthlyValues: negocActivas,
								},
								{
									key: "neg-iniciadas",
									label: "Negociaciones iniciadas en el período",
									format: "number",
									monthlyValues: negocIniciadas,
								},
								{
									key: "neg-tasa-exito",
									label: "Tasa de éxito en negociaciones",
									format: "percent",
									monthlyValues: tasaExito,
								},
							],
						},
						{
							key: "impacto-ingresos",
							label: "Impacto en ingresos",
							rows: [
								{
									key: "ing-casos-nuevos",
									label: "Ingresos de casos nuevos",
									format: "number",
									monthlyValues: ingresosTotal,
								},
								{
									key: "ing-judiciales",
									label: "Ingresos judiciales",
									format: "number",
									monthlyValues: ingresosJudiciales,
								},
								{
									key: "ing-srt",
									label: "Ingresos SRT",
									format: "number",
									monthlyValues: ingresosSrt,
								},
								{
									key: "ing-rafaela",
									label: "Rafaela",
									format: "number",
									monthlyValues: ingresosRafaela,
								},
								{
									key: "ing-reps",
									label: "Representantes",
									format: "number",
									monthlyValues: ingresosReps,
								},
							],
						},
						{
							key: "impacto-cierres",
							label: "Impacto en cierres",
							rows: [
								{
									key: "c-jud",
									label: "Cierres judiciales",
									format: "number",
									monthlyValues: cierresJudiciales,
								},
								{
									key: "c-srt",
									label: "Cierres SRT",
									format: "number",
									monthlyValues: cierresSrt,
								},
								{
									key: "c-extra",
									label: "Cierres extrajudiciales",
									format: "number",
									monthlyValues: cierresExtrajudiciales,
								},
								{
									key: "c-rafa",
									label: "Cierres Rafaela",
									format: "number",
									monthlyValues: cierresRafaela,
								},
								{
									key: "capital-rafa",
									label: "Capital Rafaela",
									format: "currency",
									monthlyValues: capitalRafaela,
								},
								{
									key: "cobradas",
									label: "Cantidad de causas cobradas",
									format: "number",
									monthlyValues: cobradasInterno.map(
										(v, i) => (v ?? 0) + (cobradasReps[i] ?? 0),
									),
									subRows: [
										{
											key: "cobradas-interno",
											label: "Interno",
											indentLevel: 2,
											format: "number",
											monthlyValues: cobradasInterno,
										},
										{
											key: "cobradas-reps",
											label: "Representantes",
											indentLevel: 2,
											format: "number",
											monthlyValues: cobradasReps,
										},
									],
								},
								{
									key: "pct-cierres-activas",
									label: "Porcentaje de cierres sobre causas activas",
									format: "percent",
									monthlyValues: pctSobreActivas,
								},
								{
									key: "ticket-promedio",
									label: "Ticket promedio por cierre",
									format: "currency",
									monthlyValues: ticketPromedio,
								},
							],
						},
						{
							key: "cx",
							label: "Experiencia de cliente",
							rows: [
								{
									key: "consultas-bo",
									label: "Consultas atendidas por BO",
									format: "number",
									monthlyValues: consultasBO,
								},
								{
									key: "reclamos-neg",
									label: "Reclamos recibidos / Comentarios negativos",
									format: "number",
									editable: true,
									sourceKey: "cx_reclamos_negativos",
									monthlyValues: manual("cx_reclamos_negativos"),
								},
								{
									key: "comentarios-pos-cx",
									label: "Comentarios positivos en Google",
									format: "number",
									editable: true,
									sourceKey: "cx_google_reviews_positive",
									monthlyValues: manual("cx_google_reviews_positive"),
								},
							],
						},
						{
							key: "red-reps",
							label: "Red de Representantes",
							rows: [
								{
									key: "reps-total",
									label: "Total de representantes",
									format: "number",
									monthlyValues: repsTotal,
								},
								{
									key: "reps-nuevos",
									label: "Cantidad de representantes nuevos",
									format: "number",
									monthlyValues: repsNuevos,
								},
								{
									key: "reuniones-reps",
									label: "Cantidad de reuniones realizadas con representantes",
									format: "number",
									monthlyValues: reunionesReps,
								},
								{
									key: "videos-reps",
									label: "Cantidad de videos de representantes",
									format: "number",
									editable: true,
									sourceKey: "legal_videos_reps",
									monthlyValues: manual("legal_videos_reps"),
								},
							],
						},
						{
							key: "equipo-interno",
							label: "Equipo interno",
							rows: [
								{
									key: "reuniones-interno",
									label: "Reuniones",
									format: "number",
									monthlyValues: ZEROS(),
									subRows: buildLawyerSubRows("reunionesRealizadas"),
								},
								{
									key: "ventas-por-abogado",
									label: "Ventas por abogado",
									format: "number",
									monthlyValues: ZEROS(),
									subRows: buildLawyerSubRows("cierres"),
								},
								{
									key: "conversion-interno",
									label: "Tasa de conversión",
									format: "percent",
									monthlyValues: ZEROS(),
									subRows: buildLawyerSubRows("tasaConversion", "percent"),
								},
								{
									key: "ingresos-por-abogado-interno",
									label: "Ingresos por abogado interno",
									format: "number",
									monthlyValues: ZEROS(),
									subRows: buildLawyerSubRows("ingresos"),
								},
								{
									key: "capital-interno",
									label: "Capital cerrado por abogado",
									format: "currency",
									monthlyValues: ZEROS(),
									subRows: buildLawyerSubRows("capitalCerrado", "currency"),
								},
								{
									key: "ticket-interno",
									label: "Ticket promedio por abogado",
									format: "currency",
									monthlyValues: ZEROS(),
									subRows: buildLawyerSubRows("ticketPromedio", "currency"),
								},
								{
									key: "causas-activas-interno",
									label: "Causas activas asignadas",
									format: "number",
									monthlyValues: ZEROS(),
									subRows: buildLawyerSubRows("causasActivas"),
								},
								{
									key: "tel-responsables",
									label: "Telegramas responsables",
									format: "number",
									editable: true,
									sourceKey: "legal_telegrams_responsables",
									monthlyValues: manual("legal_telegrams_responsables"),
								},
								{
									key: "tel-tipo",
									label: "Telegramas por tipo (total)",
									format: "number",
									monthlyValues: telegramasTotal,
									subRows: [
										{
											key: "tel-denuncia",
											label: "Denuncia",
											indentLevel: 2,
											format: "number",
											editable: true,
											sourceKey: "legal_telegrams_denuncia",
											monthlyValues: manual("legal_telegrams_denuncia"),
										},
										{
											key: "tel-alta",
											label: "Alta",
											indentLevel: 2,
											format: "number",
											editable: true,
											sourceKey: "legal_telegrams_alta",
											monthlyValues: manual("legal_telegrams_alta"),
										},
										{
											key: "tel-trat",
											label: "Tratamiento",
											indentLevel: 2,
											format: "number",
											editable: true,
											sourceKey: "legal_telegrams_tratamiento",
											monthlyValues: manual("legal_telegrams_tratamiento"),
										},
									],
								},
							],
						},
						{
							key: "equipo-expansion",
							label: "Equipo y expansión",
							rows: [
								{
									key: "ofertas-laborales",
									label: "Ofertas laborales",
									format: "number",
									monthlyValues: manual("legal_cvs_internos").map(
										(v, i) => (v ?? 0) + (manual("legal_cvs_reps")[i] ?? 0),
									),
									subRows: [
										{
											key: "cvs-internos",
											label: "CVs internos",
											indentLevel: 2,
											format: "number",
											editable: true,
											sourceKey: "legal_cvs_internos",
											monthlyValues: manual("legal_cvs_internos"),
										},
										{
											key: "cvs-reps",
											label: "CVs representantes",
											indentLevel: 2,
											format: "number",
											editable: true,
											sourceKey: "legal_cvs_reps",
											monthlyValues: manual("legal_cvs_reps"),
										},
									],
								},
								{
									key: "incorporados",
									label: "Incorporados",
									format: "number",
									monthlyValues: manual("legal_incorporados_internos").map(
										(v, i) =>
											(v ?? 0) + (manual("legal_incorporados_reps")[i] ?? 0),
									),
									subRows: [
										{
											key: "inc-internos",
											label: "Internos",
											indentLevel: 2,
											format: "number",
											editable: true,
											sourceKey: "legal_incorporados_internos",
											monthlyValues: manual("legal_incorporados_internos"),
										},
										{
											key: "inc-reps",
											label: "Representantes",
											indentLevel: 2,
											format: "number",
											editable: true,
											sourceKey: "legal_incorporados_reps",
											monthlyValues: manual("legal_incorporados_reps"),
										},
									],
								},
								{
									key: "reuniones-expansion",
									label: "Reuniones del equipo de expansión",
									format: "number",
									editable: true,
									sourceKey: "legal_reuniones_expansion",
									monthlyValues: manual("legal_reuniones_expansion"),
								},
							],
						},
					],
				},
			];

			setSections(matrix);
		} catch (err) {
			console.error("Error loading KPI matrix:", err);
			setError("No se pudieron cargar los KPIs");
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, axis, ZEROS]);

	useEffect(() => {
		load();
	}, [load]);

	return {
		sections,
		loading,
		error,
		refresh: load,
		periodLabels: axis.labels,
	};
}
