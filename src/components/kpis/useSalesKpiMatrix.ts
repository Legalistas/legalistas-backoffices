"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	API_BASE_URL,
	MANUAL_KPIS_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	KpiMatrixRow,
	KpiMatrixSection,
	KpiResponse,
	ManualKpiEntry,
} from "@/types/kpi";
import { buildPeriodAxis, type PeriodMode } from "./periodMode";

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
	ventasPorCanal: Array<{
		channelId: number | null;
		wonCount: number;
		createdCount: number;
		conversionRate: number;
	}>;
	byUser: SalesByUser[];
}

// ─── Helpers ──────────────────────────────────────────────────────────

// IDs de sourceChannel (fuente: legalistas_backend/src/constants/sourceChannel.ts)
const CHANNEL_TELEMARKETING = 2;
const CHANNEL_REFERIDO = 8;

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
			const salesPromises = axis.queries.map((qs) =>
				fetchJson<KpiResponse<SalesData>>(
					`${API_BASE_URL}/kpis/sales?${qs}`,
					token,
				),
			);
			const manualPromise = fetchJson<{ entries: ManualKpiEntry[] }>(
				`${MANUAL_KPIS_ENDPOINT}?area=sales&from=${axis.from}&to=${axis.to}`,
				token,
			);

			const [salesResults, manualResp] = await Promise.all([
				Promise.all(salesPromises),
				manualPromise,
			]);
			const manualEntries = manualResp?.entries ?? [];

			// ── Extraer valores mensuales ─────────────────────────────
			const poderesFirmados = ZEROS();
			const tasaConversion = ZEROS();
			const videollamadasTotal = ZEROS();
			const videollamadasAusencias = ZEROS();
			const tiempoPromedioCierre = ZEROS();

			const cantidadInicioMes = ZEROS();
			const cantidadFinalizada = ZEROS();
			const ganados = ZEROS();
			const perdidos = ZEROS();
			const viables = ZEROS();

			const telemarketingVentas = ZEROS();
			const referidosVentas = ZEROS();

			// Sub-filas por vendedora.
			const sellersMap = new Map<
				number,
				{
					name: string;
					llamadas: (number | null)[];
					whatsapp: (number | null)[];
					videosAgendadas: (number | null)[];
					videosRealizadas: (number | null)[];
					ganados: (number | null)[];
					perdidos: (number | null)[];
					poderes: (number | null)[];
					tasaConversion: (number | null)[];
				}
			>();

			for (let i = 0; i < axis.size; i++) {
				const result = salesResults[i];
				if (!result?.data) continue;
				const d = result.data;

				poderesFirmados[i] = d.poderesFirmados.total;
				tasaConversion[i] = d.oportunidades.tasaConversionGlobal;
				videollamadasTotal[i] = d.videollamadas.agendadas;
				videollamadasAusencias[i] = d.videollamadas.ausencias;
				tiempoPromedioCierre[i] = d.tiempoPromedioCierreDias;

				cantidadInicioMes[i] = d.oportunidades.stockInicio;
				cantidadFinalizada[i] = d.oportunidades.stockFin;
				ganados[i] = d.oportunidades.ganadas;
				perdidos[i] = d.oportunidades.perdidas;
				viables[i] = d.oportunidades.stockFin;

				// Ventas por canal específico
				const tele = d.ventasPorCanal.find(
					(c) => c.channelId === CHANNEL_TELEMARKETING,
				);
				const refe = d.ventasPorCanal.find(
					(c) => c.channelId === CHANNEL_REFERIDO,
				);
				telemarketingVentas[i] = tele?.wonCount ?? 0;
				referidosVentas[i] = refe?.wonCount ?? 0;

				for (const s of d.byUser) {
					if (!sellersMap.has(s.userId)) {
						sellersMap.set(s.userId, {
							name: s.name,
							llamadas: ZEROS(),
							whatsapp: ZEROS(),
							videosAgendadas: ZEROS(),
							videosRealizadas: ZEROS(),
							ganados: ZEROS(),
							perdidos: ZEROS(),
							poderes: ZEROS(),
							tasaConversion: ZEROS(),
						});
					}
					const e = sellersMap.get(s.userId);
					if (!e) continue;
					e.videosAgendadas[i] = s.videollamadasAgendadas;
					e.videosRealizadas[i] = s.videollamadasRealizadas;
					e.ganados[i] = s.ganadas;
					e.perdidos[i] = s.perdidas;
					e.poderes[i] = s.poderesFirmados;
					e.tasaConversion[i] = s.tasaConversion;
				}
			}

			// ── Manuales ───────────────────────────────────────────────
			// Los KPIs manuales de ventas (sales_calls, sales_whatsapp,
			// sales_referrals, sales_telemarketing_leads) también se
			// desglosan por usuario (los perUser).
			const manualByKey = new Map<string, (number | null)[]>();
			const manualByKeyUser = new Map<
				string,
				Map<number, { name: string; monthly: (number | null)[] }>
			>();
			for (const entry of manualEntries) {
				// FIX timezone: parseo directo del string YYYY-MM-DD para no caer
				// en el bug de `new Date(str).getMonth()` que en ART shift a mes previo.
				const iso = String(entry.periodStart).slice(0, 10);
				const m = axis.bucketIndex(iso);
				if (m < 0) continue;
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

				// Inyectar en el sellersMap si es perUser (llamadas, whatsapp).
				if (entry.userId && entry.user) {
					if (!sellersMap.has(entry.userId)) {
						sellersMap.set(entry.userId, {
							name: entry.user.name,
							llamadas: ZEROS(),
							whatsapp: ZEROS(),
							videosAgendadas: ZEROS(),
							videosRealizadas: ZEROS(),
							ganados: ZEROS(),
							perdidos: ZEROS(),
							poderes: ZEROS(),
							tasaConversion: ZEROS(),
						});
					}
					const e = sellersMap.get(entry.userId);
					if (!e) continue;
					if (entry.metricKey === "sales_calls") e.llamadas[m] = value;
					if (entry.metricKey === "sales_whatsapp") e.whatsapp[m] = value;
				}
			}

			const manual = (key: string) => manualByKey.get(key) ?? ZEROS();

			const sellersSorted = Array.from(sellersMap.entries())
				.map(([userId, s]) => ({ userId, ...s }))
				.sort((a, b) => a.name.localeCompare(b.name));

			// Layout invertido: por cada vendedora, sus 6 métricas como sub-filas.
			// Evita repetir cada vendedora N veces (una por métrica). La fila
			// header queda vacía — actúa como agrupador visual del listado de
			// métricas de esa vendedora.
			const buildMetricsForSeller = (
				s: (typeof sellersSorted)[number],
			): KpiMatrixRow[] => [
				{
					key: `${s.userId}-llamadas`,
					label: "Llamadas realizadas",
					indentLevel: 2,
					format: "number",
					monthlyValues: s.llamadas,
				},
				{
					key: `${s.userId}-whatsapp`,
					label: "Conversación por mensaje (WhatsApp)",
					indentLevel: 2,
					format: "number",
					monthlyValues: s.whatsapp,
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
			];

			// ── Armar matriz ───────────────────────────────────────────
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
									key: "poderes-firmados",
									label: "Poderes firmados",
									format: "number",
									monthlyValues: poderesFirmados,
								},
								{
									key: "tasa-conversion",
									label: "Tasa de conversión por etapa del embudo",
									format: "percent",
									monthlyValues: tasaConversion,
								},
								{
									key: "videos-total",
									label: "Videollamadas en total",
									format: "number",
									monthlyValues: videollamadasTotal,
								},
								{
									key: "ausencias-videos",
									label: "Ausencias a videollamadas",
									format: "number",
									monthlyValues: videollamadasAusencias,
								},
								{
									key: "tiempo-cierre",
									label: "Tiempo promedio de cierre (días)",
									format: "number",
									monthlyValues: tiempoPromedioCierre,
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
							key: "control-ventas-totales",
							label: "Totales del área",
							rows: [
								{
									key: "total-llamadas",
									label: "Llamadas realizadas",
									format: "number",
									monthlyValues: manual("sales_calls"),
								},
								{
									key: "total-whatsapp",
									label: "Conversación por mensaje (WhatsApp)",
									format: "number",
									monthlyValues: manual("sales_whatsapp"),
								},
								{
									key: "total-videos-agendadas",
									label: "Videollamadas agendadas",
									format: "number",
									monthlyValues: videollamadasTotal,
								},
								{
									key: "total-videos-realizadas",
									label: "Videollamadas realizadas",
									format: "number",
									monthlyValues: ZEROS(),
								},
								{
									key: "total-poderes",
									label: "Poderes firmados",
									format: "number",
									monthlyValues: poderesFirmados,
								},
								{
									key: "total-tasa-conv",
									label: "Tasa de conversión",
									format: "percent",
									monthlyValues: tasaConversion,
								},
							],
						},
						{
							key: "control-ventas-por-vendedora",
							label: "Por vendedora",
							// Layout invertido: cada vendedora es una fila header (sin
							// valores propios) con sus 6 métricas como sub-filas. Antes
							// era al revés (métrica arriba, vendedoras debajo) y cada
							// vendedora se repetía 6 veces.
							rows: sellersSorted.map((s) => ({
								key: `seller-${s.userId}`,
								label: s.name,
								format: "number",
								monthlyValues: ZEROS(),
								subRows: buildMetricsForSeller(s),
							})),
						},
						{
							key: "seguimiento",
							label: "Seguimiento (embudo)",
							rows: [
								{
									key: "cantidad-inicio",
									label: "Cantidad inicio del mes",
									format: "number",
									monthlyValues: cantidadInicioMes,
								},
								{
									key: "cantidad-fin",
									label: "Cantidad finalizada (fin de mes)",
									format: "number",
									monthlyValues: cantidadFinalizada,
								},
								{
									key: "ganados",
									label: "GANADOS",
									format: "number",
									monthlyValues: ganados,
								},
								{
									key: "perdidos",
									label: "PERDIDOS",
									format: "number",
									monthlyValues: perdidos,
								},
								{
									key: "viables",
									label: "VIABLES (stock activo)",
									format: "number",
									monthlyValues: viables,
								},
								{
									key: "rechazo-legal",
									label: "Rechazo Legal (manual)",
									format: "number",
									editable: true,
									sourceKey: "sales_rechazo_legal",
									monthlyValues: manual("sales_rechazo_legal"),
								},
								{
									key: "desistimiento-post-video",
									label: "Desistimiento POST-VIDEOLLAMADA (manual)",
									format: "number",
									editable: true,
									sourceKey: "sales_desistimiento_video",
									monthlyValues: manual("sales_desistimiento_video"),
								},
							],
						},
						{
							key: "ganados-perdidos-por-vendedora",
							label: "Ganados / Perdidos por vendedora",
							// Layout invertido: vendedora arriba, Ganados y Perdidos como
							// sub-filas. Evita repetir cada vendedora en 2 bloques distintos.
							rows: sellersSorted.map((s) => ({
								key: `seller-gp-${s.userId}`,
								label: s.name,
								format: "number",
								monthlyValues: ZEROS(),
								subRows: [
									{
										key: `${s.userId}-ganados`,
										label: "GANADOS",
										indentLevel: 2,
										format: "number",
										monthlyValues: s.ganados,
									},
									{
										key: `${s.userId}-perdidos`,
										label: "PERDIDOS",
										indentLevel: 2,
										format: "number",
										monthlyValues: s.perdidos,
									},
								],
							})),
						},
						{
							key: "telemarketing",
							label: "Telemarketing",
							rows: [
								{
									key: "tele-cantidad",
									label: "CANTIDAD (leads asignados)",
									format: "number",
									editable: true,
									sourceKey: "sales_telemarketing_leads",
									monthlyValues: manual("sales_telemarketing_leads"),
								},
								{
									key: "tele-ventas",
									label: "VENTAS (cerradas desde telemarketing)",
									format: "number",
									monthlyValues: telemarketingVentas,
								},
								{
									key: "tele-costo",
									label: "COSTO (manual)",
									format: "currency",
									editable: true,
									sourceKey: "sales_telemarketing_costo",
									monthlyValues: manual("sales_telemarketing_costo"),
								},
							],
						},
						{
							key: "referidos",
							label: "Referidos",
							rows: [
								{
									key: "ref-cantidad",
									label: "CANTIDAD (referidos recibidos)",
									format: "number",
									editable: true,
									sourceKey: "sales_referrals",
									monthlyValues: manual("sales_referrals"),
								},
								{
									key: "ref-ventas",
									label: "VENTAS (cerradas desde referidos)",
									format: "number",
									monthlyValues: referidosVentas,
								},
								{
									key: "ref-costo",
									label: "COSTO (manual)",
									format: "currency",
									editable: true,
									sourceKey: "sales_referrals_costo",
									monthlyValues: manual("sales_referrals_costo"),
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
