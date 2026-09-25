// Cálculo de la liquidación LRT (Ley 24.557 art. 14 ap. 2 a; IBM del art. 12
// según Ley 27.348 y DNU 669/19). Funciones puras: la calculadora
// (app/admin/calculator/accidents-work) solo maneja estado y pantalla.
//
// Fechas: se trabaja con "YYYY-MM-DD" literales. Nada pasa por `new Date(str)`
// en hora local: en Argentina (UTC-3) eso corría un día para atrás y un
// accidente del 1° de enero quedaba en el año anterior.

export const MESES = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
] as const;

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const DIA_MS = 86_400_000;

export interface FechaLiteral {
	anio: number;
	/** 1-12 */
	mes: number;
	dia: number;
}

/** "2024-03-10" o "2024-03-10T00:00:00.000Z" → { anio: 2024, mes: 3, dia: 10 }. */
export function parseFecha(valor: string | null | undefined): FechaLiteral | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? "");
	if (!m) return null;
	const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
	if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
	return { anio, mes, dia };
}

/** "2024-03-10T00:00:00.000Z" → "2024-03-10" (el día tal cual se guardó). */
export function fechaISO(valor: string | null | undefined): string {
	const f = parseFecha(valor);
	return f ? `${f.anio}-${String(f.mes).padStart(2, "0")}-${String(f.dia).padStart(2, "0")}` : "";
}

/** "2024-03-10" → "10/03/2024". */
export function formatFecha(valor: string | null | undefined): string {
	const f = parseFecha(valor);
	return f ? `${String(f.dia).padStart(2, "0")}/${String(f.mes).padStart(2, "0")}/${f.anio}` : "";
}

/** Hoy en Argentina, "YYYY-MM-DD". */
export function hoyISO(): string {
	return new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

/** Años cumplidos a una fecha. Para el coeficiente 65/edad es la edad a la primera manifestación invalidante (art. 14). */
export function edadALaFecha(
	nacimiento: string | null | undefined,
	fecha: string | null | undefined,
): number | null {
	const n = parseFecha(nacimiento);
	const f = parseFecha(fecha);
	if (!n || !f) return null;
	let edad = f.anio - n.anio;
	if (f.mes < n.mes || (f.mes === n.mes && f.dia < n.dia)) edad--;
	return edad >= 0 ? edad : null;
}

/** Mes y año corridos `delta` meses. */
function moverMes(anio: number, mes: number, delta: number): { anio: number; mes: number } {
	const total = anio * 12 + (mes - 1) + delta;
	return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export interface Periodo {
	anio: number;
	/** 1-12 */
	mes: number;
	/** "nov-23" */
	periodo: string;
}

function periodo(anio: number, mes: number): Periodo {
	return { anio, mes, periodo: `${MESES_CORTOS[mes - 1]}-${String(anio).slice(2)}` };
}

/** Los 12 meses anteriores al del accidente (IBM, art. 12): accidente en nov-24 → nov-23 … oct-24. */
export function periodosIBM(anio: number, mes: number): Periodo[] {
	return Array.from({ length: 12 }, (_, i) => {
		const p = moverMes(anio, mes, i - 12);
		return periodo(p.anio, p.mes);
	});
}

export interface RipteMensual {
	id: number;
	/** "Enero" … "Diciembre" */
	month: string;
	year: number | string;
	value: number | string;
	/** Variación del mes, en %. */
	percentage?: number | string | null;
}

export function buscarRipte(riptes: RipteMensual[], anio: number, mes: number): RipteMensual | null {
	return riptes.find((r) => r.month === MESES[mes - 1] && Number(r.year) === anio) ?? null;
}

/** Mes (1-12) y año de un RIPTE. */
export function mesDeRipte(r: Pick<RipteMensual, "month" | "year">): { anio: number; mes: number } {
	return { anio: Number(r.year), mes: MESES.indexOf(r.month as (typeof MESES)[number]) + 1 };
}

/** Haber actualizado por RIPTE al mes del accidente: haber × RIPTE vigente ÷ RIPTE del mes. */
export function ajustarHaber(
	haber: string | number | null | undefined,
	ripteVigente: number,
	ripteDelMes: number | null,
): number | null {
	const valor = typeof haber === "number" ? haber : Number.parseFloat(haber ?? "");
	if (Number.isNaN(valor) || !ripteDelMes || !ripteVigente) return null;
	return (ripteVigente / ripteDelMes) * valor;
}

export interface FilaVariacion {
	mesPeriodo: string;
	/** Mes cuyo porcentaje se aplica (3 meses antes). */
	mesCorriendo: string;
	riptePercentage: number | null;
	/** Cargado a mano: se conserva aunque se rearme la tabla. */
	editado?: boolean;
}

/**
 * Tabla de variación del RIPTE del DNU 669/19: de `desde` a `hasta` + 1 mes,
 * cada mes con el porcentaje publicado 3 meses antes.
 */
export function filasVariacion(
	riptes: RipteMensual[],
	desde: { anio: number; mes: number },
	hasta: { anio: number; mes: number },
): FilaVariacion[] {
	const filas: FilaVariacion[] = [];
	const fin = moverMes(hasta.anio, hasta.mes, 1);
	const indiceFin = fin.anio * 12 + fin.mes;
	for (let p = { ...desde }; p.anio * 12 + p.mes <= indiceFin; p = moverMes(p.anio, p.mes, 1)) {
		const atras = moverMes(p.anio, p.mes, -3);
		const r = buscarRipte(riptes, atras.anio, atras.mes);
		const pct = r?.percentage;
		filas.push({
			mesPeriodo: periodo(p.anio, p.mes).periodo,
			mesCorriendo: periodo(atras.anio, atras.mes).periodo,
			riptePercentage: pct == null || pct === "" || Number.isNaN(Number(pct)) ? null : Number(pct),
		});
	}
	return filas;
}

/** Variación acumulada del período, en %: ∏(1 + p/100) − 1. Los meses sin dato no suman. */
export function variacionAcumulada(porcentajes: (number | null | undefined)[]): number {
	const factor = porcentajes.reduce<number>(
		(f, p) => (p == null || Number.isNaN(p) ? f : f * (1 + p / 100)),
		1,
	);
	return (factor - 1) * 100;
}

export interface InteresAnual {
	año: number;
	dias: number;
	interesDiario: number;
	interesDelAño: number;
}

/**
 * Interés simple anual (base 365) desde `desde` hasta `hasta`, separado por
 * año calendario. Los días de todas las filas suman exactamente hasta − desde.
 */
export function interesesPorAnio(
	capital: number,
	tasaAnual: number,
	desde: string | null | undefined,
	hasta: string | null | undefined,
): InteresAnual[] {
	const d = parseFecha(desde);
	const h = parseFecha(hasta);
	if (!d || !h) return [];
	const inicio = Date.UTC(d.anio, d.mes - 1, d.dia);
	const fin = Date.UTC(h.anio, h.mes - 1, h.dia);
	if (fin <= inicio) return [];

	const interesDiario = (capital * (tasaAnual / 100)) / 365;
	const filas: InteresAnual[] = [];
	for (let anio = d.anio; anio <= h.anio; anio++) {
		const desdeAnio = Math.max(inicio, Date.UTC(anio, 0, 1));
		const hastaAnio = Math.min(fin, Date.UTC(anio + 1, 0, 1));
		const dias = Math.round((hastaAnio - desdeAnio) / DIA_MS);
		if (dias <= 0) continue;
		filas.push({ año: anio, dias, interesDiario, interesDelAño: interesDiario * dias });
	}
	return filas;
}
