// Helpers de rango semanal ISO 8601 usados por la Planilla en modo "semana".
// Todos los cálculos se hacen en local time (no UTC) para que los cortes
// coincidan con el calendario que ve el usuario.

export interface IsoWeekRange {
	/** Número de semana ISO (1..53). */
	weekNumber: number;
	/** Año ISO al que pertenece esa semana (puede diferir del calendario). */
	isoYear: number;
	/** Fecha del lunes de esa semana (00:00 local). */
	monday: Date;
	/** Fecha del domingo de esa semana (00:00 local). */
	sunday: Date;
	/** Etiqueta para el header — ej: "S28 07/07-13/07". */
	label: string;
	/** monday en YYYY-MM-DD. */
	mondayISO: string;
	/** sunday en YYYY-MM-DD. */
	sundayISO: string;
}

function pad(n: number): string {
	return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Número de semana ISO 8601 y año ISO al que pertenece `date`. */
export function isoWeekOf(date: Date): { weekNumber: number; isoYear: number } {
	// Trabajamos en UTC solo para evitar drifts por DST al mover 4 días.
	const d = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	const dayNum = d.getUTCDay() || 7; // lunes=1 … domingo=7
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	const weekNumber = Math.ceil(
		((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
	);
	return { weekNumber, isoYear: d.getUTCFullYear() };
}

/**
 * Devuelve los rangos semanales ISO que tocan el mes calendario dado.
 * Suele ser 4-6 semanas. La primera puede empezar en el mes anterior y la
 * última terminar en el siguiente — se listan de todas formas porque el
 * usuario suele querer ver toda la semana, no solo los días del mes.
 */
export function weekRangesOfMonth(
	year: number,
	month1Based: number,
): IsoWeekRange[] {
	const firstOfMonth = new Date(year, month1Based - 1, 1);
	const lastOfMonth = new Date(year, month1Based, 0);

	// Movernos al lunes de la primera semana que toca el mes.
	const startMonday = new Date(firstOfMonth);
	const dow = (startMonday.getDay() + 6) % 7; // lunes=0 … domingo=6
	startMonday.setDate(startMonday.getDate() - dow);

	const result: IsoWeekRange[] = [];
	const cursor = new Date(startMonday);
	// Loop hasta que el lunes actual pase el último día del mes.
	// Máximo 6 semanas (cap defensivo).
	for (let i = 0; i < 6 && cursor <= lastOfMonth; i++) {
		const monday = new Date(cursor);
		const sunday = new Date(cursor);
		sunday.setDate(sunday.getDate() + 6);
		const { weekNumber, isoYear } = isoWeekOf(monday);
		result.push({
			weekNumber,
			isoYear,
			monday,
			sunday,
			mondayISO: toISODate(monday),
			sundayISO: toISODate(sunday),
			label: `S${weekNumber} ${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}-${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`,
		});
		cursor.setDate(cursor.getDate() + 7);
	}
	return result;
}

/**
 * Dado un array de rangos semanales y una fecha (YYYY-MM-DD), devuelve el
 * índice del rango al que pertenece esa fecha, o -1 si queda fuera. Se usa
 * para hacer bucket de manual KPIs en modo semana.
 */
export function findWeekIndex(
	ranges: IsoWeekRange[],
	dateISO: string,
): number {
	for (let i = 0; i < ranges.length; i++) {
		if (dateISO >= ranges[i].mondayISO && dateISO <= ranges[i].sundayISO) {
			return i;
		}
	}
	return -1;
}
