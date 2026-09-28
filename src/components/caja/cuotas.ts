// Vista previa de las cuotas de una compra con tarjeta. Espejo de
// backend/src/modules/caja/utils/cuotas.ts (el backend es el que decide; esto
// solo muestra en qué resumen va a caer cada cuota antes de guardar).

const diasDelMes = (anio: number, mes0: number) => new Date(anio, mes0 + 1, 0).getDate();

export const sumarMeses = (periodo: string, n: number) => {
	const [y, m] = periodo.split("-").map(Number);
	const d = new Date(y, m - 1 + n, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Resumen de la primera cuota según la fecha de compra ("YYYY-MM-DD") y el día de cierre. */
export function periodoPrimeraCuota(fecha: string, diaCierre: number | null): string {
	const [y, m, d] = fecha.split("-").map(Number);
	const actual = `${y}-${String(m).padStart(2, "0")}`;
	if (!diaCierre) return sumarMeses(actual, 1);
	return d <= Math.min(diaCierre, diasDelMes(y, m - 1)) ? actual : sumarMeses(actual, 1);
}

/** Vencimiento del resumen ("YYYY-MM-DD"). */
export function vencimientoResumen(
	periodo: string,
	diaCierre: number | null,
	diaVencimiento: number | null,
): string {
	const mesSiguiente = !diaVencimiento || !diaCierre || diaVencimiento <= diaCierre;
	const p = mesSiguiente ? sumarMeses(periodo, 1) : periodo;
	const [y, m] = p.split("-").map(Number);
	const dia = Math.min(diaVencimiento ?? 10, diasDelMes(y, m - 1));
	return `${p}-${String(dia).padStart(2, "0")}`;
}

/** "2026-10" → "Octubre de 2026" (solo la primera letra en mayúscula). */
export const nombreResumen = (periodo: string) => {
	const [y, m] = periodo.split("-").map(Number);
	const texto = new Date(y, m - 1, 1).toLocaleDateString("es-AR", {
		month: "long",
		year: "numeric",
	});
	return texto.charAt(0).toUpperCase() + texto.slice(1);
};
