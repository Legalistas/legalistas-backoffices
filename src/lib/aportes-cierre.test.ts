import { describe, expect, test } from "bun:test";
import { APORTES_VACIOS, algunaTarjetaActiva, calcularAportes } from "./aportes-cierre";

// Mismos casos que backend/src/utils/closing-aportes.test.ts: los dos cálculos
// tienen que dar igual.
describe("calcularAportes", () => {
	test("las tarjetas apagadas no suman", () => {
		expect(calcularAportes(APORTES_VACIOS, 5_000_000, true)).toMatchObject({
			total: 0,
			representante: 0,
			legalistas: 0,
		});
		expect(algunaTarjetaActiva(APORTES_VACIOS)).toBe(false);
	});

	test("las tres juntas: 13 % del capital, 7 % de la Caja y 9 %", () => {
		const c = calcularAportes(
			{
				capital: { activa: true, representante: 100_000 },
				caja: { activa: true, base: 1_000_000, representante: 20_000 },
				otro: { activa: true, porcentaje: 9, base: 500_000, representante: 45_000 },
			},
			2_000_000,
			true,
		);
		expect(c.tarjetas.capital).toEqual({ aporte: 260_000, representante: 100_000, legalistas: 160_000 });
		expect(c.tarjetas.caja).toEqual({ aporte: 70_000, representante: 20_000, legalistas: 50_000 });
		expect(c.tarjetas.otro).toEqual({ aporte: 45_000, representante: 45_000, legalistas: 0 });
		expect([c.total, c.representante, c.legalistas]).toEqual([375_000, 165_000, 210_000]);
	});

	test("5,4 % en la tercera", () => {
		const c = calcularAportes(
			{ ...APORTES_VACIOS, otro: { activa: true, porcentaje: 5.4, base: 1_000_000, representante: 0 } },
			0,
			true,
		);
		expect(c.total).toBe(54_000);
	});

	test("el representante no aporta más que el aporte, y sin representante no aporta", () => {
		const detalle = { ...APORTES_VACIOS, caja: { activa: true, base: 100_000, representante: 999_999 } };
		expect(calcularAportes(detalle, 0, true).tarjetas.caja).toEqual({
			aporte: 7_000,
			representante: 7_000,
			legalistas: 0,
		});
		expect(calcularAportes(detalle, 0, false).legalistas).toBe(7_000);
	});
});
