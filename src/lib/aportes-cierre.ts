// Aportes de un cierre — las tres tarjetas (pedido de Contabilidad, 09/10/2026):
//   1. 13 % fijo sobre el capital cerrado.
//   2. 7 % fijo de la Caja, sobre el monto que se cargue.
//   3. 5,4 % o 9 % (a elección), sobre el monto que se cargue.
// Cada una se activa por cierre y lleva a mano cuánto aporta el representante;
// lo que resta es de Legalistas. El reparto NO sigue el 25 % de HP/PCL.
// Mismo cálculo que el backend (src/utils/closing-aportes.ts): si cambia uno,
// cambiar el otro. El que vale al guardar es el del backend.

export const PORCENTAJE_CAPITAL = 13;
export const PORCENTAJE_CAJA = 7;
export const PORCENTAJES_OTRO: readonly number[] = [5.4, 9];

export interface AportesDetalle {
	capital: { activa: boolean; representante: number };
	caja: { activa: boolean; base: number; representante: number };
	otro: { activa: boolean; porcentaje: number; base: number; representante: number };
}

export const APORTES_VACIOS: AportesDetalle = {
	capital: { activa: false, representante: 0 },
	caja: { activa: false, base: 0, representante: 0 },
	otro: { activa: false, porcentaje: 5.4, base: 0, representante: 0 },
};

export interface TarjetaAporte {
	aporte: number;
	representante: number;
	legalistas: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const positivo = (n: unknown) => {
	const v = Number(n);
	return Number.isFinite(v) && v > 0 ? r2(v) : 0;
};

/** Aporte de cada tarjeta y su reparto. Sin representante en el cierre, todo es de Legalistas. */
export function calcularAportes(d: AportesDetalle, capital: number, conRepresentante: boolean) {
	const tarjeta = (
		activa: boolean,
		porcentaje: number,
		base: unknown,
		representante: unknown,
	): TarjetaAporte => {
		const aporte = activa ? r2((positivo(base) * porcentaje) / 100) : 0;
		const rep = conRepresentante ? Math.min(positivo(representante), aporte) : 0;
		return { aporte, representante: rep, legalistas: r2(aporte - rep) };
	};
	const porcentajeOtro = PORCENTAJES_OTRO.includes(Number(d.otro.porcentaje))
		? Number(d.otro.porcentaje)
		: PORCENTAJES_OTRO[0];

	const tarjetas = {
		capital: tarjeta(d.capital.activa, PORCENTAJE_CAPITAL, capital, d.capital.representante),
		caja: tarjeta(d.caja.activa, PORCENTAJE_CAJA, d.caja.base, d.caja.representante),
		otro: tarjeta(d.otro.activa, porcentajeOtro, d.otro.base, d.otro.representante),
	};
	const suma = (campo: keyof TarjetaAporte) =>
		r2(tarjetas.capital[campo] + tarjetas.caja[campo] + tarjetas.otro[campo]);

	return {
		tarjetas,
		total: suma("aporte"),
		representante: suma("representante"),
		legalistas: suma("legalistas"),
	};
}

export const algunaTarjetaActiva = (d: AportesDetalle) =>
	d.capital.activa || d.caja.activa || d.otro.activa;
