"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	API_BASE_URL,
	MANUAL_KPIS_ENDPOINT,
} from "@/constant/api-endpoints";
import { SOURCE_CHANNEL } from "@/constant/crm";
import type {
	KpiMatrixRow,
	KpiMatrixSection,
	KpiResponse,
	ManualKpiEntry,
} from "@/types/kpi";
import { buildPeriodAxis, type PeriodMode } from "./periodMode";

// ─────────────────────────────────────────────────────────────────────────
// Planilla de KPIs de Ventas.
//
// FUENTE DE VERDAD: "Requerimientos de Sistemas — KPIs de Ventas v1.1"
// (Legalistas, 01/08/2026).
//
// Todo lo que se muestra acá es AUTOMÁTICO desde el Back Office (punto 1
// del doc). Los KPIs manuales de ventas siguen existiendo en el backend y
// en "Cargar valores", pero ya no se listan en esta planilla.
//
// Bloques del doc:
//   2 → Métricas operativas (embudo de 4 etapas)
//   3 → Métricas por vendedora
//   4 → Seguimiento del embudo
//   6 → Canales de ingreso
// ─────────────────────────────────────────────────────────────────────────

// ─── Response del backend ─────────────────────────────────────────────

interface SalesByUser {
	userId: number;
	name: string;
	oportunidadesCreadas: number;
	ganadas: number;
	perdidas: number;
	poderesFirmados: number;
	videollamadasAgendadas: number;
	videollamadasRealizadas: number;
	ausenciasVideollamadas: number;
	tasaConversion: number;
	tiempoPromedioCierreDias: number;
}

interface SalesChannelRow {
	channelId: number | null;
	name: string;
	createdCount: number;
	wonCount: number;
	conversionRate: number;
}

interface SalesData {
	oportunidades: {
		creadas: number;
		ganadas: number;
		perdidas: number;
		stockInicio: number;
		stockFin: number;
		tasaConversionGlobal: number;
	};
	poderesFirmados: { total: number };
	videollamadas: {
		agendadas: number;
		realizadas: number;
		ausencias: number;
	};
	tiempoPromedioCierreDias: number;
	perdidosPorMotivo: Array<{
		reason: string;
		label: string;
		count: number;
	}>;
	/** Perdidos anteriores a la migración, sin motivo cargado. */
	perdidosSinMotivo: number;
	porCanal: SalesChannelRow[];
	byUser: SalesByUser[];
}

/** Response de GET /kpis/sales/by-province (punto 7 del doc). */
export interface SalesProvinceData {
	porProvincia: Array<{
		stateId: number;
		name: string;
		oportunidades: number;
		ventas: number;
		conversionRate: number;
	}>;
	sinProvincia: { oportunidades: number; ventas: number };
	rafaela: {
		oportunidades: number;
		ventas: number;
		conversionRate: number;
		overlapsProvinces: boolean;
		lawyerId: number | null;
	};
	porCiudad: Array<{
		cityId: number;
		name: string;
		provincia: string;
		oportunidades: number;
		ventas: number;
		conversionRate: number;
	}>;
	totales: { oportunidades: number; ventas: number; conversionRate: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
	try {
		const res = await fetch(url, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

/** Clave estable para el bucket "sin canal cargado". */
const NO_CHANNEL_KEY = -1;

// ─── Hook ─────────────────────────────────────────────────────────────

export interface UseSalesKpiMatrixResult {
	sections: KpiMatrixSection[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
	periodLabels: string[];
}

export function useSalesKpiMatrix(
	year: number,
	mode: PeriodMode = { type: "year" },
): UseSalesKpiMatrixResult {
	const { data: session } = useSession();
	const [sections, setSections] = useState<KpiMatrixSection[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const axis = useMemo(() => buildPeriodAxis(year, mode), [year, mode]);
	const ZEROS = axis.zeros;

	const load = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;

		setLoading(true);
		setError(null);

		try {
			const [salesResults, provinceResults, manualResp] = await Promise.all([
				Promise.all(
					axis.queries.map((qs) =>
						fetchJson<KpiResponse<SalesData>>(
							`${API_BASE_URL}/kpis/sales?${qs}`,
							token,
						),
					),
				),
				Promise.all(
					axis.queries.map((qs) =>
						fetchJson<KpiResponse<SalesProvinceData>>(
							`${API_BASE_URL}/kpis/sales/by-province?${qs}`,
							token,
						),
					),
				),
				// Consultas orgánicas/pagas por provincia (punto 7.4) — único
				// dato manual del módulo. Se traen todas las del eje de una y
				// se agrupan por mes en memoria.
				fetchJson<{ entries: ManualKpiEntry[] }>(
					`${MANUAL_KPIS_ENDPOINT}?area=sales&from=${axis.from}&to=${axis.to}`,
					token,
				),
			]);

			// ── Totales del área (embudo) ─────────────────────────────
			const oportunidadesCreadas = ZEROS();
			const videollamadasAgendadas = ZEROS();
			const videollamadasRealizadas = ZEROS();
			const poderesFirmados = ZEROS();
			const tasaConversion = ZEROS();
			const ausenciaVideollamada = ZEROS();
			const tiempoPromedioCierre = ZEROS();

			// ── Seguimiento del embudo ────────────────────────────────
			const cantidadInicioMes = ZEROS();
			const cantidadFinMes = ZEROS();
			const perdidos = ZEROS();

			// ── Provincias (punto 7.1) ────────────────────────────────
			// Solo se listan las provincias con movimiento en algún período:
			// mostrar las 24 siempre, la mayoría en cero, no aporta.
			const provincesMap = new Map<
				number,
				{ name: string; creadas: (number | null)[]; ventas: (number | null)[] }
			>();
			const sinProvinciaCreadas = ZEROS();
			const sinProvinciaVentas = ZEROS();
			const rafaelaCreadas = ZEROS();
			const rafaelaVentas = ZEROS();

			// ── Motivos de pérdida ────────────────────────────────────
			const lostReasonsMap = new Map<
				string,
				{ label: string; values: (number | null)[] }
			>();
			const perdidosSinMotivo = ZEROS();

			// ── Canales ───────────────────────────────────────────────
			const channelsMap = new Map<
				number,
				{ name: string; creadas: (number | null)[]; ventas: (number | null)[] }
			>();

			// ── Por vendedora ─────────────────────────────────────────
			const sellersMap = new Map<
				number,
				{
					name: string;
					creadas: (number | null)[];
					videosAgendadas: (number | null)[];
					videosRealizadas: (number | null)[];
					poderes: (number | null)[];
					tasaConversion: (number | null)[];
					perdidos: (number | null)[];
				}
			>();

			for (let i = 0; i < axis.size; i++) {
				const prov = provinceResults[i]?.data;
				if (prov) {
					for (const p of prov.porProvincia) {
						if (!provincesMap.has(p.stateId)) {
							provincesMap.set(p.stateId, {
								name: p.name,
								creadas: ZEROS(),
								ventas: ZEROS(),
							});
						}
						const entry = provincesMap.get(p.stateId);
						if (!entry) continue;
						entry.creadas[i] = p.oportunidades;
						entry.ventas[i] = p.ventas;
					}
					sinProvinciaCreadas[i] = prov.sinProvincia.oportunidades;
					sinProvinciaVentas[i] = prov.sinProvincia.ventas;
					rafaelaCreadas[i] = prov.rafaela.oportunidades;
					rafaelaVentas[i] = prov.rafaela.ventas;
				}

				const result = salesResults[i];
				if (!result?.data) continue;
				const d = result.data;

				oportunidadesCreadas[i] = d.oportunidades.creadas;
				videollamadasAgendadas[i] = d.videollamadas.agendadas;
				videollamadasRealizadas[i] = d.videollamadas.realizadas;
				poderesFirmados[i] = d.poderesFirmados.total;
				tasaConversion[i] = d.oportunidades.tasaConversionGlobal;
				ausenciaVideollamada[i] = d.videollamadas.ausencias;
				tiempoPromedioCierre[i] = d.tiempoPromedioCierreDias;

				cantidadInicioMes[i] = d.oportunidades.stockInicio;
				cantidadFinMes[i] = d.oportunidades.stockFin;
				perdidos[i] = d.oportunidades.perdidas;

				for (const m of d.perdidosPorMotivo ?? []) {
					if (!lostReasonsMap.has(m.reason)) {
						lostReasonsMap.set(m.reason, {
							label: m.label,
							values: ZEROS(),
						});
					}
					const entry = lostReasonsMap.get(m.reason);
					if (entry) entry.values[i] = m.count;
				}
				perdidosSinMotivo[i] = d.perdidosSinMotivo ?? 0;

				for (const c of d.porCanal ?? []) {
					const key = c.channelId ?? NO_CHANNEL_KEY;
					if (!channelsMap.has(key)) {
						channelsMap.set(key, {
							name: c.name,
							creadas: ZEROS(),
							ventas: ZEROS(),
						});
					}
					const entry = channelsMap.get(key);
					if (!entry) continue;
					entry.creadas[i] = c.createdCount;
					entry.ventas[i] = c.wonCount;
				}

				for (const s of d.byUser) {
					if (!sellersMap.has(s.userId)) {
						sellersMap.set(s.userId, {
							name: s.name,
							creadas: ZEROS(),
							videosAgendadas: ZEROS(),
							videosRealizadas: ZEROS(),
							poderes: ZEROS(),
							tasaConversion: ZEROS(),
							perdidos: ZEROS(),
						});
					}
					const e = sellersMap.get(s.userId);
					if (!e) continue;
					e.creadas[i] = s.oportunidadesCreadas;
					e.videosAgendadas[i] = s.videollamadasAgendadas;
					e.videosRealizadas[i] = s.videollamadasRealizadas;
					e.poderes[i] = s.poderesFirmados;
					e.tasaConversion[i] = s.tasaConversion;
					e.perdidos[i] = s.perdidas;
				}
			}

			// ── Filas de canal ────────────────────────────────────────
			// Los canales activos del catálogo se muestran siempre (aunque
			// estén en cero) para que la planilla no cambie de filas mes a
			// mes. Los inactivos y el bucket "sin canal" solo aparecen si
			// tienen movimiento en el período.
			const activeChannelIds = new Set(
				SOURCE_CHANNEL.filter((c) => c.active).map((c) => c.id),
			);
			const hasData = (arr: (number | null)[]) =>
				arr.some((v) => (v ?? 0) !== 0);

			const channelRows = Array.from(channelsMap.entries()).filter(
				([id, c]) =>
					activeChannelIds.has(id) || hasData(c.creadas) || hasData(c.ventas),
			);

			const buildChannelRows = (
				kind: "creadas" | "ventas",
			): KpiMatrixRow[] =>
				channelRows.map(([id, c]) => ({
					key: `canal-${kind}-${id}`,
					label: id === NO_CHANNEL_KEY ? "Sin canal cargado" : c.name,
					format: "number",
					monthlyValues: kind === "creadas" ? c.creadas : c.ventas,
				}));

			// ── Consultas manuales por provincia (punto 7.4) ──────────
			// En la planilla van solo los totales del mes; el detalle por
			// provincia vive en su propia tabla (ProvinceConsultsGrid).
			const consultasOrganicas = ZEROS();
			const consultasPagas = ZEROS();
			const consultasTotal = ZEROS();

			for (const entry of manualResp?.entries ?? []) {
				if (
					entry.metricKey !== "sales_consultas_organicas" &&
					entry.metricKey !== "sales_consultas_pagas"
				) {
					continue;
				}
				// Parseo directo del string YYYY-MM-DD: `new Date(str)` en ART
				// shiftea al mes anterior.
				const iso = String(entry.periodStart).slice(0, 10);
				const i = axis.bucketIndex(iso);
				if (i < 0) continue;

				const value = Number(entry.value ?? 0);
				const target =
					entry.metricKey === "sales_consultas_organicas"
						? consultasOrganicas
						: consultasPagas;
				target[i] = (target[i] ?? 0) + value;
				consultasTotal[i] = (consultasTotal[i] ?? 0) + value;
			}

			// ── Filas de provincia ────────────────────────────────────
			const provinceRows = Array.from(provincesMap.entries())
				.filter(([, p]) => hasData(p.creadas) || hasData(p.ventas))
				.sort((a, b) => a[1].name.localeCompare(b[1].name));

			const buildProvinceRows = (
				kind: "creadas" | "ventas",
			): KpiMatrixRow[] => {
				const rows: KpiMatrixRow[] = provinceRows.map(([id, p]) => ({
					key: `prov-${kind}-${id}`,
					label: p.name,
					format: "number",
					monthlyValues: kind === "creadas" ? p.creadas : p.ventas,
				}));

				const sinProv = kind === "creadas" ? sinProvinciaCreadas : sinProvinciaVentas;
				if (hasData(sinProv)) {
					rows.push({
						key: `prov-${kind}-sin-dato`,
						label: "Sin provincia cargada",
						format: "number",
						monthlyValues: sinProv,
					});
				}

				// Rafaela es un corte de GESTIÓN (oficina propia vs
				// representantes), no una provincia: se superpone con las filas
				// de arriba y por eso no suma al total.
				rows.push({
					key: `prov-${kind}-rafaela`,
					label: "Rafaela (gestión propia) — no suma al total",
					format: "number",
					monthlyValues: kind === "creadas" ? rafaelaCreadas : rafaelaVentas,
				});

				return rows;
			};

			// ── Filas por vendedora ───────────────────────────────────
			// Layout invertido: cada vendedora es una fila agrupadora (sin
			// valores propios) con sus métricas como sub-filas.
			const sellersSorted = Array.from(sellersMap.entries())
				.map(([userId, s]) => ({ userId, ...s }))
				.sort((a, b) => a.name.localeCompare(b.name));

			const buildMetricsForSeller = (
				s: (typeof sellersSorted)[number],
			): KpiMatrixRow[] => [
				{
					key: `${s.userId}-creadas`,
					label: "Oportunidades creadas",
					indentLevel: 2,
					format: "number",
					monthlyValues: s.creadas,
				},
				{
					key: `${s.userId}-videos-agendadas`,
					label: "Videollamadas agendadas",
					indentLevel: 2,
					format: "number",
					monthlyValues: s.videosAgendadas,
				},
				{
					key: `${s.userId}-videos-realizadas`,
					label: "Videollamadas realizadas",
					indentLevel: 2,
					format: "number",
					monthlyValues: s.videosRealizadas,
				},
				{
					key: `${s.userId}-poderes`,
					label: "Poderes firmados",
					indentLevel: 2,
					format: "number",
					monthlyValues: s.poderes,
				},
				{
					key: `${s.userId}-tasa`,
					label: "Tasa de conversión",
					indentLevel: 2,
					format: "percent",
					monthlyValues: s.tasaConversion,
				},
				{
					key: `${s.userId}-perdidos`,
					label: "Perdidos",
					indentLevel: 2,
					format: "number",
					monthlyValues: s.perdidos,
				},
			];

			// ── Armar matriz ──────────────────────────────────────────
			const matrix: KpiMatrixSection[] = [
				{
					key: "operativas",
					label: "Métricas operativas (El Embudo)",
					subSections: [
						{
							key: "embudo-totales",
							label: "Totales del área",
							rows: [
								{
									key: "oportunidades-creadas",
									label: "Oportunidades creadas",
									format: "number",
									monthlyValues: oportunidadesCreadas,
								},
								{
									key: "videos-agendadas",
									label: "Videollamadas agendadas",
									format: "number",
									monthlyValues: videollamadasAgendadas,
								},
								{
									key: "videos-realizadas",
									label: "Videollamadas realizadas",
									format: "number",
									monthlyValues: videollamadasRealizadas,
								},
								{
									key: "poderes-firmados",
									label: "Poderes firmados",
									format: "number",
									monthlyValues: poderesFirmados,
								},
								{
									key: "tasa-conversion",
									label: "Tasa de conversión",
									format: "percent",
									monthlyValues: tasaConversion,
								},
								{
									key: "ausencia-videollamada",
									label: "Ausencia de videollamada",
									format: "number",
									monthlyValues: ausenciaVideollamada,
								},
								{
									key: "tiempo-cierre",
									label: "Tiempo promedio de cierre (días)",
									format: "number",
									monthlyValues: tiempoPromedioCierre,
								},
							],
						},
						{
							key: "embudo-por-vendedora",
							label: "Por vendedora",
							rows: sellersSorted.map((s) => ({
								key: `seller-${s.userId}`,
								label: s.name,
								format: "number",
								monthlyValues: ZEROS(),
								subRows: buildMetricsForSeller(s),
							})),
						},
					],
				},
				{
					key: "seguimiento-embudo",
					label: "Seguimiento del Embudo",
					subSections: [
						{
							key: "seguimiento",
							label: "Evolución del stock",
							rows: [
								{
									key: "cantidad-inicio",
									label: "Cantidad al inicio del mes",
									format: "number",
									monthlyValues: cantidadInicioMes,
								},
								{
									key: "cantidad-fin",
									label: "Cantidad al finalizar el mes",
									format: "number",
									monthlyValues: cantidadFinMes,
								},
								{
									key: "perdidos",
									label: "Perdidos",
									format: "number",
									// Desglose por motivo (punto 5 del doc) colgando de
									// la fila de perdidos: la suma de las sub-filas da
									// exactamente el total.
									subRows: [
										...Array.from(lostReasonsMap.entries()).map(
											([reason, m]) => ({
												key: `motivo-${reason}`,
												label: m.label,
												indentLevel: 2 as const,
												format: "number" as const,
												monthlyValues: m.values,
											}),
										),
										...(perdidosSinMotivo.some((v) => (v ?? 0) !== 0)
											? [
													{
														key: "motivo-sin-registrar",
														label: "Sin motivo registrado",
														indentLevel: 2 as const,
														format: "number" as const,
														monthlyValues: perdidosSinMotivo,
													},
												]
											: []),
									],
									monthlyValues: perdidos,
								},
							],
						},
					],
				},
				{
					key: "canales",
					label: "Canales de Ingreso",
					subSections: [
						{
							key: "canales-oportunidades",
							label: "Oportunidades creadas por canal",
							rows: buildChannelRows("creadas"),
						},
						{
							key: "canales-ventas",
							label: "Ventas por canal",
							rows: buildChannelRows("ventas"),
						},
					],
				},
				{
					key: "provincias",
					label: "Métricas por Provincia",
					subSections: [
						{
							key: "provincias-oportunidades",
							label: "Oportunidades creadas por provincia",
							rows: buildProvinceRows("creadas"),
						},
						{
							key: "provincias-ventas",
							label: "Ventas por provincia",
							rows: buildProvinceRows("ventas"),
						},
						{
							key: "provincias-consultas",
							label: "Consultas — carga manual de Ventas (punto 7.4)",
							// Solo los totales del mes: el detalle por provincia
							// vive en su propia tabla, debajo de la planilla.
							rows: [
								{
									key: "consultas-organicas",
									label: "Consultas orgánicas",
									format: "number",
									monthlyValues: consultasOrganicas,
								},
								{
									key: "consultas-pagas",
									label: "Consultas pagas",
									format: "number",
									monthlyValues: consultasPagas,
								},
								{
									key: "consultas-total",
									label: "Total de consultas",
									format: "number",
									monthlyValues: consultasTotal,
								},
							],
						},
					],
				},
			];

			setSections(matrix);
		} catch (err) {
			console.error("Error loading Sales KPI matrix:", err);
			setError("No se pudieron cargar los KPIs de Ventas");
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
