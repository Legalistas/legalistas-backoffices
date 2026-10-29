// Aportes de un cierre — las tres tarjetas (pedido de Contabilidad, 09/10/2026):
//   1. 13 % fijo sobre el capital cerrado.
//   2. 7 % fijo de la Caja, sobre el monto que se cargue.
//   3. 5,4 % o 9 % (a elección), sobre el monto que se cargue. En los cierres
//      que salen de una negociación, el 9 % es 9,3 %.
// Cada una se activa por cierre y lleva a mano cuánto aporta el representante;
// lo que resta es de Legalistas. El reparto NO sigue el 25 % de HP/PCL.
// Mismo cálculo que el backend (src/utils/closing-aportes.ts): si cambia uno,
// cambiar el otro. El que vale al guardar es el del backend.

export const PORCENTAJE_CAPITAL = 13;
// The capital card defaults to 13 % but each closing can set its own (Jona, 29/10/2026).
export const porcentajeCapital = (d: AportesDetalle) => {
	const p = Number(d.capital.porcentaje);
	return p > 0 && p <= 100 ? p : PORCENTAJE_CAPITAL;
};
export const PORCENTAJE_CAJA = 7;
/** Los que acepta el backend. */
export const PORCENTAJES_OTRO: readonly number[] = [5.4, 9, 9.3];
/** Los que se ofrecen al cargar: 9 % en un cierre directo, 9,3 % si sale de una negociación. */
export const porcentajesOtro = (desdeNegociacion: boolean): readonly number[] => [
	5.4,
	desdeNegociacion ? 9.3 : 9,
];

export interface AportesDetalle {
	/**
	 * `aseguradora`: el 13 % lo paga la aseguradora (cierres cargados desde el
	 * 13/10/2026). No se reparte con el representante ni va a Gastos e Ingresos:
	 * solo baja el HP de Legalistas. Los cierres anteriores no traen la marca y
	 * siguen con la regla con la que se guardaron. Al guardar manda el servidor.
	 */
	/** `porcentaje`: missing in closings saved before 29/10/2026, which means 13. */
	capital: { activa: boolean; representante: number; aseguradora?: boolean; porcentaje?: number };
	caja: { activa: boolean; base: number; representante: number };
	otro: { activa: boolean; porcentaje: number; base: number; representante: number };
}

export const APORTES_VACIOS: AportesDetalle = {
	capital: { activa: false, representante: 0, aseguradora: true, porcentaje: PORCENTAJE_CAPITAL },
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
		// Si lo paga la aseguradora, el representante no aporta nada ahí.
		capital: tarjeta(
			d.capital.activa,
			porcentajeCapital(d),
			capital,
			d.capital.aseguradora === true ? 0 : d.capital.representante,
		),
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

/** Pago de un aporte del cierre: la fila de Gastos e Ingresos de esa tarjeta. */
export interface AportePago {
	id: number;
	tarjeta: string | null;
	monto: number;
	pagado: boolean;
	/** Del pago en la Caja ("2026-10-09"); null mientras está pendiente. */
	fecha: string | null;
	caja: string | null;
	detalle: string | null;
}

const pesos = (n: number) =>
	new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n);

/** "Aporte pagado el 09/10/2026 · Banco Patagonia · detalle", o lo que falta pagar. */
export const textoPagoAporte = (p: AportePago) =>
	p.pagado
		? [
				`Aporte pagado${p.fecha ? ` el ${p.fecha.split("-").reverse().join("/")}` : ""}`,
				p.caja,
				p.detalle,
			]
				.filter(Boolean)
				.join(" · ")
		: `Sin pagar: ${pesos(p.monto)} pendiente en Gastos e Ingresos`;

/** Nombre corto de cada tarjeta ("13 % capital", "7 % Caja", "9 %"). */
export const nombreTarjeta = (tarjeta: string | null, detalle?: AportesDetalle | null) =>
	tarjeta === "capital"
		? `${String(detalle ? porcentajeCapital(detalle) : PORCENTAJE_CAPITAL).replace(".", ",")} % capital`
		: tarjeta === "caja"
			? `${PORCENTAJE_CAJA} % Caja`
			: `${String(detalle?.otro.porcentaje ?? "5,4 / 9").replace(".", ",")} %`;
