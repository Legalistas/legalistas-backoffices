import { describe, expect, test } from "bun:test";
import { ALTO_HOJA, calcularHojas, SEPARACION_HOJAS, type Unidad } from "./paginacion";

const MM = 96 / 25.4;
const SUP = 25 * MM;
const INF = 20 * MM;
const PASO = ALTO_HOJA + SEPARACION_HOJAS;
const ABAJO_0 = ALTO_HOJA - INF;
const ARRIBA_1 = PASO + SUP;
const RENGLON = 36;

/** Párrafo de `n` renglones que empieza en `top`; el renglón i empieza en la posición 100 + i. */
const parrafo = (pos: number, top: number, n: number): Unidad => ({
	tipo: "bloque",
	pos,
	top,
	bottom: top + n * RENGLON,
	lineas: Array.from({ length: n }, (_, i) => ({
		top: top + i * RENGLON,
		bottom: top + (i + 1) * RENGLON,
		pos: pos + 1 + i * 10,
	})),
});

describe("calcularHojas", () => {
	test("si todo entra en una hoja no agrega nada", () => {
		const r = calcularHojas([parrafo(0, SUP, 5)], SUP, INF);
		expect(r).toEqual({ espaciadores: [], hojas: 1 });
	});

	test("parte el párrafo en el renglón que no entra y lo baja al margen superior de la hoja siguiente", () => {
		const top = 800;
		const r = calcularHojas([parrafo(0, top, 10)], SUP, INF);
		// Renglón 6: 800 + 7 × 36 = 1052 > fin del área escrita (≈ 1046,9).
		const i = 6;
		expect(r.espaciadores).toEqual([{ pos: 1 + i * 10, alto: ARRIBA_1 - (top + i * RENGLON), enLinea: true }]);
		expect(r.hojas).toBe(2);
	});

	test("no deja un solo renglón al pie: pasa el párrafo entero", () => {
		// Solo el primer renglón entra en la hoja.
		const top = ABAJO_0 - RENGLON - 5;
		const r = calcularHojas([parrafo(0, top, 5)], SUP, INF);
		expect(r.espaciadores).toEqual([{ pos: 0, alto: ARRIBA_1 - top, enLinea: false }]);
	});

	test("no deja un solo renglón arriba de la hoja: baja dos", () => {
		// Entran 4 de 5 renglones: corta antes del 4.º para que bajen 2.
		const top = ABAJO_0 - 4 * RENGLON - 5;
		const r = calcularHojas([parrafo(0, top, 5)], SUP, INF);
		expect(r.espaciadores).toEqual([{ pos: 1 + 3 * 10, alto: ARRIBA_1 - (top + 3 * RENGLON), enLinea: true }]);
	});

	test("un bloque que no se puede partir pasa entero", () => {
		const tabla: Unidad = { tipo: "bloque", pos: 40, top: 1000, bottom: 1100, lineas: [] };
		const r = calcularHojas([parrafo(0, SUP, 2), tabla], SUP, INF);
		expect(r.espaciadores).toEqual([{ pos: 40, alto: ARRIBA_1 - 1000, enLinea: false }]);
	});

	test("después de un salto de página sigue en la hoja siguiente", () => {
		const salto: Unidad = { tipo: "salto", pos: 20, top: 300, bottom: 300, lineas: [] };
		const r = calcularHojas([parrafo(0, SUP, 2), salto, parrafo(30, 320, 2)], SUP, INF);
		expect(r.espaciadores).toEqual([{ pos: 30, alto: ARRIBA_1 - 320, enLinea: false }]);
		expect(r.hojas).toBe(2);
	});

	test("lo que sigue a un corte se mide ya corrido", () => {
		// Dos párrafos: el primero se parte; el segundo termina en la hoja 2.
		const r = calcularHojas([parrafo(0, 800, 10), parrafo(200, 800 + 360, 3)], SUP, INF);
		expect(r.espaciadores).toHaveLength(1);
		expect(r.hojas).toBe(2);
	});
});
