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

interface AccountingData {
	ingresos: {
		operativos: number;
		rafaela: number;
		representantes: number;
		internos: number;
	};
	gastos: {
		total: number;
		porSubtipo: Record<string, number>;
	};
	resultado: {
		margenOperativo: number;
		utilidadBruta: number;
		resultadoEjercicio: number;
	};
	estadoResultado: {
		ingresosOperativos: number;
		distribucionRepresentantes: number;
		utilidadBruta: number;
		remuneraciones: number;
		gastosLegales: number;
		marketing: number;
		administracion: number;
		servicios: number;
		brixar: number;
		fixer: number;
		inversiones: number;
		tarjetas: number;
		personalAgustin: number;
		resultadoEjercicio: number;
	};
	cobros: {
		honorarios: { count: number; monto: number };
		pcl: { count: number; monto: number };
		total: number;
	};
	cierres: {
		count: number;
		capitalCerrado: number;
		tiqPromedio: number;
	};
	caja: {
		saldoActual: number;
		aCobrarProximos: number;
		aPagarProximos: number;
		gastosVencidos: number;
	};
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

export interface UseAccountingKpiMatrixResult {
	sections: KpiMatrixSection[];
	loading: boolean;
	error: string | null;
	refresh: () => void;
}

export function useAccountingKpiMatrix(
	year: number,
): UseAccountingKpiMatrixResult {
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
			const accPromises = MONTHS.map((m) =>
				fetchJson<KpiResponse<AccountingData>>(
					`${API_BASE_URL}/kpis/accounting?month=${m}&year=${year}`,
					token,
				),
			);
			const manualPromise = fetchJson<{ entries: ManualKpiEntry[] }>(
				`${MANUAL_KPIS_ENDPOINT}?area=cx&from=${year}-01-01&to=${year}-12-31`,
				token,
			);

			const [accResults, _manualResp] = await Promise.all([
				Promise.all(accPromises),
				manualPromise,
			]);

			// ── Extraer valores mensuales ─────────────────────────────
			const ingresosOperativos = ZEROS();
			const ingresosRafaela = ZEROS();
			const ingresosReps = ZEROS();
			const ingresosInternos = ZEROS();

			const gastosTotal = ZEROS();
			const remuneraciones = ZEROS();
			const gastosLegales = ZEROS();
			const gastosMarketing = ZEROS();
			const gastosAdministracion = ZEROS();
			const gastosServicios = ZEROS();
			const gastosBrixar = ZEROS();
			const gastosFixer = ZEROS();
			const gastosTarjetas = ZEROS();
			const gastosReferentes = ZEROS();
			const gastosPersonalAgustin = ZEROS();

			const margenOperativo = ZEROS();
			const utilidadBruta = ZEROS();
			const resultadoEjercicio = ZEROS();

			const cobrosHpMonto = ZEROS();
			const cobrosPclMonto = ZEROS();
			const cobrosTotal = ZEROS();

			const capitalCerrado = ZEROS();
			const tiqPromedio = ZEROS();

			const saldoCaja = ZEROS();
			const aCobrar = ZEROS();
			const aPagar = ZEROS();
			const vencidos = ZEROS();

			for (let i = 0; i < 12; i++) {
				const r = accResults[i];
				if (!r?.data) continue;
				const d = r.data;

				ingresosOperativos[i] = d.ingresos.operativos;
				ingresosRafaela[i] = d.ingresos.rafaela;
				ingresosReps[i] = d.ingresos.representantes;
				ingresosInternos[i] = d.ingresos.internos;

				gastosTotal[i] = d.gastos.total;
				remuneraciones[i] = d.estadoResultado.remuneraciones;
				gastosLegales[i] = d.estadoResultado.gastosLegales;
				gastosMarketing[i] = d.estadoResultado.marketing;
				gastosAdministracion[i] = d.estadoResultado.administracion;
				gastosServicios[i] = d.estadoResultado.servicios;
				gastosBrixar[i] = d.estadoResultado.brixar;
				gastosFixer[i] = d.estadoResultado.fixer;
				gastosTarjetas[i] = d.estadoResultado.tarjetas;
				gastosReferentes[i] = d.estadoResultado.distribucionRepresentantes;
				gastosPersonalAgustin[i] = d.estadoResultado.personalAgustin;

				margenOperativo[i] = d.resultado.margenOperativo;
				utilidadBruta[i] = d.resultado.utilidadBruta;
				resultadoEjercicio[i] = d.resultado.resultadoEjercicio;

				cobrosHpMonto[i] = d.cobros.honorarios.monto;
				cobrosPclMonto[i] = d.cobros.pcl.monto;
				cobrosTotal[i] = d.cobros.total;

				capitalCerrado[i] = d.cierres.capitalCerrado;
				tiqPromedio[i] = d.cierres.tiqPromedio;

				saldoCaja[i] = d.caja.saldoActual;
				aCobrar[i] = d.caja.aCobrarProximos;
				aPagar[i] = d.caja.aPagarProximos;
				vencidos[i] = d.caja.gastosVencidos;
			}

			// ── Armar matriz ────────────────────────────────────────────
			const matrix: KpiMatrixSection[] = [
				{
					key: "ingresos",
					label: "Ingresos",
					subSections: [
						{
							key: "ingresos-main",
							label: "Ingresos del período",
							rows: [
								{
									key: "ing-operativos",
									label: "Ingresos operativos del mes",
									format: "currency",
									monthlyValues: ingresosOperativos,
								},
								{
									key: "ing-rafaela",
									label: "Ingresos Rafaela",
									format: "currency",
									monthlyValues: ingresosRafaela,
								},
								{
									key: "ing-reps",
									label: "Ingresos representantes",
									format: "currency",
									monthlyValues: ingresosReps,
								},
								{
									key: "ing-internos",
									label: "Ingresos internos (sin vincular)",
									format: "currency",
									monthlyValues: ingresosInternos,
								},
							],
						},
					],
				},
				{
					key: "gastos",
					label: "Gastos por categoría",
					subSections: [
						{
							key: "gastos-main",
							label: "Egresos del período",
							rows: [
								{
									key: "g-total",
									label: "Total gastos operativos",
									format: "currency",
									monthlyValues: gastosTotal,
								},
								{
									key: "g-legales",
									label: "Gastos legales",
									format: "currency",
									monthlyValues: gastosLegales,
								},
								{
									key: "g-marketing",
									label: "Marketing",
									format: "currency",
									monthlyValues: gastosMarketing,
								},
								{
									key: "g-admin",
									label: "Administración",
									format: "currency",
									monthlyValues: gastosAdministracion,
								},
								{
									key: "g-servicios",
									label: "Servicios",
									format: "currency",
									monthlyValues: gastosServicios,
								},
								{
									key: "g-brixar",
									label: "Brixar",
									format: "currency",
									monthlyValues: gastosBrixar,
								},
								{
									key: "g-fixer",
									label: "Fixer",
									format: "currency",
									monthlyValues: gastosFixer,
								},
								{
									key: "g-tarjetas",
									label: "Tarjetas",
									format: "currency",
									monthlyValues: gastosTarjetas,
								},
								{
									key: "g-remuneraciones",
									label: "Remuneraciones (Capital humano)",
									format: "currency",
									monthlyValues: remuneraciones,
								},
							],
						},
					],
				},
				{
					key: "estado-resultado",
					label: "Estado de resultado",
					subSections: [
						{
							key: "er-main",
							label: "Cálculo automático",
							rows: [
								{
									key: "er-ingresos",
									label: "Ingresos operativos",
									format: "currency",
									monthlyValues: ingresosOperativos,
								},
								{
									key: "er-referentes",
									label: "(-) Distribución representantes",
									format: "currency",
									monthlyValues: gastosReferentes,
								},
								{
									key: "er-utilidad-bruta",
									label: "= Utilidad bruta",
									format: "currency",
									monthlyValues: utilidadBruta,
								},
								{
									key: "er-remun",
									label: "(-) Capital humano / Remuneraciones",
									format: "currency",
									monthlyValues: remuneraciones,
								},
								{
									key: "er-legales",
									label: "(-) Gastos legales",
									format: "currency",
									monthlyValues: gastosLegales,
								},
								{
									key: "er-marketing",
									label: "(-) Marketing",
									format: "currency",
									monthlyValues: gastosMarketing,
								},
								{
									key: "er-admin",
									label: "(-) Administración",
									format: "currency",
									monthlyValues: gastosAdministracion,
								},
								{
									key: "er-servicios",
									label: "(-) Servicios",
									format: "currency",
									monthlyValues: gastosServicios,
								},
								{
									key: "er-brixar",
									label: "(-) Brixar",
									format: "currency",
									monthlyValues: gastosBrixar,
								},
								{
									key: "er-fixer",
									label: "(-) Fixer",
									format: "currency",
									monthlyValues: gastosFixer,
								},
								{
									key: "er-tarjetas",
									label: "(-) Tarjetas",
									format: "currency",
									monthlyValues: gastosTarjetas,
								},
								{
									key: "er-personal-agus",
									label: "(-) Personal Agustín",
									format: "currency",
									monthlyValues: gastosPersonalAgustin,
								},
								{
									key: "er-resultado",
									label: "= Resultado del ejercicio",
									format: "currency",
									monthlyValues: resultadoEjercicio,
								},
								{
									key: "er-margen",
									label: "Margen operativo",
									format: "currency",
									monthlyValues: margenOperativo,
								},
							],
						},
					],
				},
				{
					key: "cobros",
					label: "Cobros (Honorarios y PCL)",
					subSections: [
						{
							key: "cobros-main",
							label: "Cobros del período",
							rows: [
								{
									key: "cob-hp",
									label: "Honorarios cobrados (monto)",
									format: "currency",
									monthlyValues: cobrosHpMonto,
								},
								{
									key: "cob-pcl",
									label: "PCL cobrados (monto)",
									format: "currency",
									monthlyValues: cobrosPclMonto,
								},
								{
									key: "cob-total",
									label: "Total cobros del período",
									format: "currency",
									monthlyValues: cobrosTotal,
								},
								{
									key: "capital-cerrado",
									label: "Capital cerrado del período",
									format: "currency",
									monthlyValues: capitalCerrado,
								},
								{
									key: "tiq-promedio",
									label: "TIQ promedio (capital / cierres)",
									format: "currency",
									monthlyValues: tiqPromedio,
								},
							],
						},
					],
				},
				{
					key: "caja",
					label: "Caja y pendientes",
					subSections: [
						{
							key: "caja-main",
							label: "Estado de caja",
							rows: [
								{
									key: "saldo-caja",
									label: "Saldo caja actual",
									format: "currency",
									monthlyValues: saldoCaja,
								},
								{
									key: "a-cobrar",
									label: "A cobrar próximos",
									format: "currency",
									monthlyValues: aCobrar,
								},
								{
									key: "a-pagar",
									label: "A pagar próximos",
									format: "currency",
									monthlyValues: aPagar,
								},
								{
									key: "vencidos",
									label: "Gastos vencidos",
									format: "currency",
									monthlyValues: vencidos,
								},
							],
						},
					],
				},
			];

			setSections(matrix);
		} catch (err) {
			console.error("Error loading Accounting KPI matrix:", err);
			setError("No se pudieron cargar los KPIs Contables");
		} finally {
			setLoading(false);
		}
	}, [session?.user?.accessToken, year]);

	useEffect(() => {
		load();
	}, [load]);

	return { sections, loading, error, refresh: load };
}
