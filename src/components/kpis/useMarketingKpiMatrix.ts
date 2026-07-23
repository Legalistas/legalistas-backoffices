"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
	API_BASE_URL,
	MANUAL_KPIS_ENDPOINT,
} from "@/constant/api-endpoints";
import type {
	KpiMatrixSection,
	KpiResponse,
	ManualKpiEntry,
} from "@/types/kpi";

// ─── Response del backend ─────────────────────────────────────────────

interface ChannelStats {
	created: number;
	won: number;
	conversionRate: number;
}

interface MarketingData {
	canales: {
		instagram: ChannelStats;
		facebook: ChannelStats;
		tiktok: ChannelStats;
		formularios: ChannelStats;
	};
	organicos: {
		consultas: number;
		ventas: number;
		conversionRate: number;
	};
	totales: {
		consultas: number;
		ventas: number;
		conversionGlobal: number;
	};
	breakdown: Array<{
		channelId: number;
		name: string;
		created: number;
		won: number;
		conversionRate: number;
	}>;
}

// ─── Helpers ──────────────────────────────────────────────────────────

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const ZEROS = (): (number | null)[] => new Array(12).fill(0);

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

export interface UseMarketingKpiMatrixResult {
	sections: KpiMatrixSection[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
}

export function useMarketingKpiMatrix(year: number): UseMarketingKpiMatrixResult {
	const { data: session } = useSession();
	const [sections, setSections] = useState<KpiMatrixSection[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		const token = session?.user?.accessToken;
		if (!token) return;

		setLoading(true);
		setError(null);

		try {
			const mktPromises = MONTHS.map((m) =>
				fetchJson<KpiResponse<MarketingData>>(
					`${API_BASE_URL}/kpis/marketing?month=${m}&year=${year}`,
					token,
				),
			);
			const manualPromise = fetchJson<{ entries: ManualKpiEntry[] }>(
				`${MANUAL_KPIS_ENDPOINT}?area=marketing&from=${year}-01-01&to=${year}-12-31`,
				token,
			);

			const [mktResults, manualResp] = await Promise.all([
				Promise.all(mktPromises),
				manualPromise,
			]);
			const manualEntries = manualResp?.entries ?? [];

			// ── Automáticos por mes ─────────────────────────────────────
			const consultasOrganicas = ZEROS();
			const ventasOrganicas = ZEROS();
			const formulariosRecibidos = ZEROS();
			const ventasFormularios = ZEROS();
			const ventasInstagram = ZEROS();
			const ventasFacebook = ZEROS();
			const ventasTiktok = ZEROS();
			const totalConsultas = ZEROS();
			const totalVentasMarketing = ZEROS();
			const conversionGlobal = ZEROS();

			for (let i = 0; i < 12; i++) {
				const r = mktResults[i];
				if (!r?.data) continue;
				const d = r.data;

				consultasOrganicas[i] = d.organicos.consultas;
				ventasOrganicas[i] = d.organicos.ventas;
				formulariosRecibidos[i] = d.canales.formularios.created;
				ventasFormularios[i] = d.canales.formularios.won;
				ventasInstagram[i] = d.canales.instagram.won;
				ventasFacebook[i] = d.canales.facebook.won;
				ventasTiktok[i] = d.canales.tiktok.won;
				totalConsultas[i] = d.totales.consultas;
				totalVentasMarketing[i] = d.totales.ventas;
				conversionGlobal[i] = d.totales.conversionGlobal;
			}

			// ── Manuales ────────────────────────────────────────────────
			const manualByKey = new Map<string, (number | null)[]>();
			for (const entry of manualEntries) {
				// FIX timezone: parseo directo del string YYYY-MM-DD para no caer
				// en el bug de `new Date(str).getMonth()` que en ART shift a mes previo.
				const iso = String(entry.periodStart).slice(0, 10);
				const m = Number(iso.split("-")[1]) - 1;
				const value = Number(entry.value ?? 0);
				if (!manualByKey.has(entry.metricKey)) {
					manualByKey.set(entry.metricKey, ZEROS());
				}
				const arr = manualByKey.get(entry.metricKey);
				if (arr) arr[m] = (arr[m] ?? 0) + value;
			}
			const manual = (key: string) => manualByKey.get(key) ?? ZEROS();

			// Total de contenido = reels + posteos + historia.
			const totalContenido = manual("mkt_reels").map(
				(_, i) =>
					(manual("mkt_reels")[i] ?? 0) +
					(manual("mkt_posteos")[i] ?? 0) +
					(manual("mkt_historia")[i] ?? 0),
			);

			// ── Armar matriz ────────────────────────────────────────────
			const matrix: KpiMatrixSection[] = [
				{
					key: "produccion-contenido",
					label: "1. Producción de contenido",
					subSections: [
						{
							key: "contenido-main",
							label: "Contenido publicado",
							rows: [
								{
									key: "reels",
									label: "Reels",
									format: "number",
									editable: true,
									sourceKey: "mkt_reels",
									monthlyValues: manual("mkt_reels"),
								},
								{
									key: "posteos",
									label: "Posteos estáticos",
									format: "number",
									editable: true,
									sourceKey: "mkt_posteos",
									monthlyValues: manual("mkt_posteos"),
								},
								{
									key: "historia",
									label: "Historias",
									format: "number",
									editable: true,
									sourceKey: "mkt_historia",
									monthlyValues: manual("mkt_historia"),
								},
								{
									key: "contenido-total",
									label: "TOTAL contenido",
									format: "number",
									monthlyValues: totalContenido,
								},
								{
									key: "blog",
									label: "Artículos publicados en el blog",
									format: "number",
									editable: true,
									sourceKey: "mkt_blog_articulos",
									monthlyValues: manual("mkt_blog_articulos"),
								},
							],
						},
					],
				},
				{
					key: "metricas-performance",
					label: "2. Métricas de performance",
					subSections: [
						{
							key: "consultas-canales",
							label: "Canales de ingreso",
							rows: [
								{
									key: "consultas-organicas",
									label: "Consultas orgánicas",
									format: "number",
									monthlyValues: consultasOrganicas,
								},
								{
									key: "ventas-organicas",
									label: "Total ventas orgánico",
									format: "number",
									monthlyValues: ventasOrganicas,
								},
								{
									key: "ventas-ig",
									label: "Ventas Instagram",
									format: "number",
									monthlyValues: ventasInstagram,
								},
								{
									key: "ventas-fb",
									label: "Ventas Facebook",
									format: "number",
									monthlyValues: ventasFacebook,
								},
								{
									key: "ventas-tt",
									label: "Ventas TikTok",
									format: "number",
									monthlyValues: ventasTiktok,
								},
								{
									key: "formularios",
									label: "Formularios recibidos",
									format: "number",
									monthlyValues: formulariosRecibidos,
								},
								{
									key: "ventas-form",
									label: "Ventas formularios",
									format: "number",
									monthlyValues: ventasFormularios,
								},
							],
						},
						{
							key: "factibilidad",
							label: "Factibilidad",
							rows: [
								{
									key: "factibles",
									label: "Consultas factibles",
									format: "number",
									editable: true,
									sourceKey: "mkt_factibles",
									monthlyValues: manual("mkt_factibles"),
								},
								{
									key: "pct-fact",
									label: "% Factibilidad global",
									format: "percent",
									editable: true,
									sourceKey: "mkt_pct_factibilidad",
									monthlyValues: manual("mkt_pct_factibilidad"),
								},
							],
						},
						{
							key: "paid-media",
							label: "Paid Media (Brenda)",
							rows: [
								{
									key: "invertido-meta",
									label: "Invertido en Meta",
									format: "currency",
									editable: true,
									sourceKey: "mkt_invertido_meta",
									monthlyValues: manual("mkt_invertido_meta"),
								},
								{
									key: "invertido-google",
									label: "Invertido en Google Ads",
									format: "currency",
									editable: true,
									sourceKey: "mkt_invertido_google_ads",
									monthlyValues: manual("mkt_invertido_google_ads"),
								},
								{
									key: "consultas-pagas",
									label: "Consultas pagas",
									format: "number",
									editable: true,
									sourceKey: "mkt_consultas_pagas",
									monthlyValues: manual("mkt_consultas_pagas"),
								},
								{
									key: "cpl",
									label: "CPL — Costo por lead",
									format: "currency",
									editable: true,
									sourceKey: "mkt_cpl",
									monthlyValues: manual("mkt_cpl"),
								},
								{
									key: "cpv",
									label: "Costo por venta",
									format: "currency",
									editable: true,
									sourceKey: "mkt_costo_por_venta",
									monthlyValues: manual("mkt_costo_por_venta"),
								},
							],
						},
						{
							key: "totales-mkt",
							label: "Totales de marketing",
							rows: [
								{
									key: "total-consultas",
									label: "Total consultas del período",
									format: "number",
									monthlyValues: totalConsultas,
								},
								{
									key: "total-ventas-mkt",
									label: "Total ventas marketing",
									format: "number",
									monthlyValues: totalVentasMarketing,
								},
								{
									key: "conversion-global-mkt",
									label: "% Conversión global",
									format: "percent",
									monthlyValues: conversionGlobal,
								},
							],
						},
					],
				},
				{
					key: "metricas-operativas-mkt",
					label: "3. Métricas operativas (redes)",
					subSections: [
						{
							key: "instagram",
							label: "Instagram",
							rows: [
								{
									key: "ig-seg",
									label: "Seguidores",
									format: "number",
									editable: true,
									sourceKey: "mkt_ig_seguidores",
									monthlyValues: manual("mkt_ig_seguidores"),
								},
								{
									key: "ig-alcance",
									label: "Alcance",
									format: "number",
									editable: true,
									sourceKey: "mkt_ig_alcance",
									monthlyValues: manual("mkt_ig_alcance"),
								},
								{
									key: "ig-inter",
									label: "Interacciones",
									format: "number",
									editable: true,
									sourceKey: "mkt_ig_interacciones",
									monthlyValues: manual("mkt_ig_interacciones"),
								},
								{
									key: "ig-vis",
									label: "Visualizaciones",
									format: "number",
									editable: true,
									sourceKey: "mkt_ig_visualizaciones",
									monthlyValues: manual("mkt_ig_visualizaciones"),
								},
								{
									key: "ig-eng",
									label: "Engagement rate (%)",
									format: "percent",
									editable: true,
									sourceKey: "mkt_ig_engagement",
									monthlyValues: manual("mkt_ig_engagement"),
								},
								{
									key: "ig-perfil",
									label: "Visitas al perfil",
									format: "number",
									editable: true,
									sourceKey: "mkt_ig_visitas_perfil",
									monthlyValues: manual("mkt_ig_visitas_perfil"),
								},
							],
						},
						{
							key: "facebook",
							label: "Facebook",
							rows: [
								{
									key: "fb-seg",
									label: "Seguidores",
									format: "number",
									editable: true,
									sourceKey: "mkt_fb_seguidores",
									monthlyValues: manual("mkt_fb_seguidores"),
								},
								{
									key: "fb-alcance",
									label: "Alcance",
									format: "number",
									editable: true,
									sourceKey: "mkt_fb_alcance",
									monthlyValues: manual("mkt_fb_alcance"),
								},
								{
									key: "fb-inter",
									label: "Interacciones",
									format: "number",
									editable: true,
									sourceKey: "mkt_fb_interacciones",
									monthlyValues: manual("mkt_fb_interacciones"),
								},
								{
									key: "fb-vis",
									label: "Visualizaciones",
									format: "number",
									editable: true,
									sourceKey: "mkt_fb_visualizaciones",
									monthlyValues: manual("mkt_fb_visualizaciones"),
								},
							],
						},
						{
							key: "tiktok",
							label: "TikTok",
							rows: [
								{
									key: "tt-seg",
									label: "Seguidores",
									format: "number",
									editable: true,
									sourceKey: "mkt_tt_seguidores",
									monthlyValues: manual("mkt_tt_seguidores"),
								},
								{
									key: "tt-alcance",
									label: "Alcance",
									format: "number",
									editable: true,
									sourceKey: "mkt_tt_alcance",
									monthlyValues: manual("mkt_tt_alcance"),
								},
								{
									key: "tt-inter",
									label: "Interacciones",
									format: "number",
									editable: true,
									sourceKey: "mkt_tt_interacciones",
									monthlyValues: manual("mkt_tt_interacciones"),
								},
								{
									key: "tt-vis",
									label: "Visualizaciones",
									format: "number",
									editable: true,
									sourceKey: "mkt_tt_visualizaciones",
									monthlyValues: manual("mkt_tt_visualizaciones"),
								},
							],
						},
						{
							key: "agustin-tt",
							label: "Agustín TikTok",
							rows: [
								{
									key: "agus-tt-seg",
									label: "Seguidores",
									format: "number",
									editable: true,
									sourceKey: "mkt_agustin_tt_seguidores",
									monthlyValues: manual("mkt_agustin_tt_seguidores"),
								},
								{
									key: "agus-tt-vis",
									label: "Visualizaciones",
									format: "number",
									editable: true,
									sourceKey: "mkt_agustin_tt_visualizaciones",
									monthlyValues: manual("mkt_agustin_tt_visualizaciones"),
								},
							],
						},
						{
							key: "seo",
							label: "SEO",
							rows: [
								{
									key: "seo-pos",
									label: "Posición media en Google",
									format: "number",
									editable: true,
									sourceKey: "mkt_seo_posicion_google",
									monthlyValues: manual("mkt_seo_posicion_google"),
								},
								{
									key: "seo-clics",
									label: "Clics totales",
									format: "number",
									editable: true,
									sourceKey: "mkt_seo_clics_totales",
									monthlyValues: manual("mkt_seo_clics_totales"),
								},
								{
									key: "seo-impresiones",
									label: "Impresiones totales",
									format: "number",
									editable: true,
									sourceKey: "mkt_seo_impresiones",
									monthlyValues: manual("mkt_seo_impresiones"),
								},
								{
									key: "seo-ctr",
									label: "CTR frío (%)",
									format: "percent",
									editable: true,
									sourceKey: "mkt_seo_ctr",
									monthlyValues: manual("mkt_seo_ctr"),
								},
							],
						},
					],
				},
			];

			setSections(matrix);
		} catch (err) {
			console.error("Error loading Marketing KPI matrix:", err);
			setError("No se pudieron cargar los KPIs de Marketing");
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, year]);

	useEffect(() => {
		load();
	}, [load]);

	return { sections, loading, error, refresh: load };
}
