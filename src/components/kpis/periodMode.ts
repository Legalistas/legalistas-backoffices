// Ejes de fetch para la Planilla — común a los 4 hooks (legal/sales/mkt/acc).
// La Planilla puede pedirse en modo "year" (12 columnas mensuales, default
// histórico) o "month-weeks" (4-6 columnas semanales del mes elegido).

import { findWeekIndex, weekRangesOfMonth } from "./weekRanges";

export type PeriodMode =
	| { type: "year" }
	| { type: "month-weeks"; month: number };

export interface PeriodAxis {
	/**
	 * Cantidad de columnas de período (12 en year, 4-6 en month-weeks).
	 * Los arrays `monthlyValues` de la Planilla se dimensionan a `size`.
	 */
	size: number;
	/** Labels para el header de la matriz. */
	labels: string[];
	/**
	 * Query string por columna. En year: `month=1&year=Y` … `month=12&year=Y`.
	 * En month-weeks: `week=W&year=isoY` por cada semana.
	 */
	queries: string[];
	/** Genera un array de `size` posiciones inicializado en 0. */
	zeros: () => (number | null)[];
	/**
	 * Dado un periodStart en formato YYYY-MM-DD (de un manual KPI), devuelve
	 * el índice de la columna en la que debe caer, o -1 si queda fuera.
	 */
	bucketIndex: (periodStartISO: string) => number;
	/**
	 * Rango total del período (para pedir manual KPIs en un solo request).
	 * En year: 01/01..31/12 del año; en month-weeks: lunes de S1..domingo de última.
	 */
	from: string;
	to: string;
}

export function buildPeriodAxis(year: number, mode: PeriodMode): PeriodAxis {
	if (mode.type === "month-weeks") {
		const ranges = weekRangesOfMonth(year, mode.month);
		const size = ranges.length;
		return {
			size,
			labels: ranges.map((r) => r.label),
			queries: ranges.map((r) => `week=${r.weekNumber}&year=${r.isoYear}`),
			zeros: () => new Array(size).fill(0),
			bucketIndex: (iso) => findWeekIndex(ranges, iso),
			from: ranges[0]?.mondayISO ?? `${year}-01-01`,
			to: ranges[size - 1]?.sundayISO ?? `${year}-12-31`,
		};
	}
	// year (default)
	const size = 12;
	return {
		size,
		labels: [
			"ENERO",
			"FEBRERO",
			"MARZO",
			"ABRIL",
			"MAYO",
			"JUNIO",
			"JULIO",
			"AGOSTO",
			"SEPTIEMBRE",
			"OCTUBRE",
			"NOVIEMBRE",
			"DICIEMBRE",
		],
		queries: Array.from({ length: 12 }, (_, i) => `month=${i + 1}&year=${year}`),
		zeros: () => new Array(12).fill(0),
		bucketIndex: (iso) => Number(iso.slice(5, 7)) - 1,
		from: `${year}-01-01`,
		to: `${year}-12-31`,
	};
}
