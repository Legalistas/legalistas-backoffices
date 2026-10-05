import { leerNumero } from "./api";
import { aTexto } from "./CotizacionSelect";

// Cuenta de una compra o venta de dólares: pesos = dólares × cotización.
// Con dos de los tres datos se calcula el tercero.

export type CampoCambio = "pesos" | "dolares" | "cotizacion";
export type ValoresCambio = Record<CampoCambio, string>;

const CAMPOS: CampoCambio[] = ["pesos", "dolares", "cotizacion"];

/**
 * Aplica un cambio en uno de los tres campos y calcula el que corresponde.
 * Quedan fijos los dos últimos que se tocaron; el otro se recalcula:
 *  - cotización elegida + pesos → dólares (lo habitual: "con $400.000 al MEP, ¿cuántos dólares?")
 *  - cotización + dólares → pesos
 *  - pesos + dólares (los montos reales de la operación) → cotización
 * `editados` va del más viejo al más nuevo.
 */
export function recalcularCambio(
	valores: ValoresCambio,
	editados: CampoCambio[],
	campo: CampoCambio,
	texto: string,
): { valores: ValoresCambio; editados: CampoCambio[]; calculado: CampoCambio | null } {
	const nuevos = { ...valores, [campo]: texto };
	const orden = [...editados.filter((c) => c !== campo), campo];
	const fijos = orden.slice(-2);
	const libre = CAMPOS.find((c) => !fijos.includes(c)) as CampoCambio;

	const pesos = leerNumero(nuevos.pesos);
	const dolares = leerNumero(nuevos.dolares);
	const cotizacion = leerNumero(nuevos.cotizacion);
	let calculado: CampoCambio | null = null;

	if (libre === "dolares" && pesos > 0 && cotizacion > 0) {
		nuevos.dolares = aTexto(pesos / cotizacion);
		calculado = "dolares";
	} else if (libre === "pesos" && dolares > 0 && cotizacion > 0) {
		nuevos.pesos = aTexto(dolares * cotizacion);
		calculado = "pesos";
	} else if (libre === "cotizacion" && pesos > 0 && dolares > 0) {
		nuevos.cotizacion = aTexto(pesos / dolares);
		calculado = "cotizacion";
	}

	return { valores: nuevos, editados: orden, calculado };
}
