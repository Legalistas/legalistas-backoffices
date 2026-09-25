import { describe, expect, test } from "bun:test";
import {
	ajustarHaber,
	buscarRipte,
	edadALaFecha,
	fechaISO,
	filasVariacion,
	formatFecha,
	interesesPorAnio,
	periodosIBM,
	type RipteMensual,
	variacionAcumulada,
} from "./calculo";

describe("fechas literales", () => {
	test("un accidente del 1° de enero sigue en su año", () => {
		expect(fechaISO("2024-01-01T00:00:00.000Z")).toBe("2024-01-01");
		expect(formatFecha("2024-01-01")).toBe("01/01/2024");
	});

	test("fecha inválida o vacía", () => {
		expect(fechaISO(null)).toBe("");
		expect(formatFecha("31/12/2024")).toBe("");
	});
});

describe("edadALaFecha", () => {
	test("edad a la fecha del accidente, no a hoy", () => {
		expect(edadALaFecha("1980-06-15", "2020-06-14")).toBe(39);
		expect(edadALaFecha("1980-06-15", "2020-06-15")).toBe(40);
	});

	test("sin nacimiento o sin fecha", () => {
		expect(edadALaFecha(null, "2020-01-01")).toBeNull();
		expect(edadALaFecha("1980-06-15", "")).toBeNull();
	});
});

describe("periodosIBM", () => {
	test("los 12 meses anteriores al del accidente", () => {
		const p = periodosIBM(2024, 11);
		expect(p).toHaveLength(12);
		expect(p[0].periodo).toBe("nov-23");
		expect(p[11].periodo).toBe("oct-24");
	});

	test("accidente en enero: de enero a diciembre del año anterior", () => {
		const p = periodosIBM(2024, 1);
		expect(p[0]).toMatchObject({ anio: 2023, mes: 1, periodo: "ene-23" });
		expect(p[11]).toMatchObject({ anio: 2023, mes: 12, periodo: "dic-23" });
	});
});

const riptes: RipteMensual[] = [
	{ id: 1, month: "Enero", year: 2024, value: 100, percentage: 10 },
	{ id: 2, month: "Febrero", year: "2024", value: 110, percentage: 5 },
	{ id: 3, month: "Marzo", year: 2024, value: 115.5, percentage: null },
];

describe("RIPTE", () => {
	test("busca por mes y año aunque el año venga como texto", () => {
		expect(buscarRipte(riptes, 2024, 2)?.id).toBe(2);
		expect(buscarRipte(riptes, 2023, 2)).toBeNull();
	});

	test("haber actualizado al RIPTE vigente", () => {
		expect(ajustarHaber("1000", 120, 100)).toBeCloseTo(1200);
		expect(ajustarHaber("", 120, 100)).toBeNull();
		expect(ajustarHaber("1000", 120, null)).toBeNull();
	});

	test("tabla de variación: porcentaje de 3 meses antes, hasta + 1 mes", () => {
		const filas = filasVariacion(riptes, { anio: 2024, mes: 4 }, { anio: 2024, mes: 5 });
		expect(filas.map((f) => f.mesPeriodo)).toEqual(["abr-24", "may-24", "jun-24"]);
		expect(filas[0]).toMatchObject({ mesCorriendo: "ene-24", riptePercentage: 10 });
		expect(filas[1]).toMatchObject({ mesCorriendo: "feb-24", riptePercentage: 5 });
		expect(filas[2]).toMatchObject({ mesCorriendo: "mar-24", riptePercentage: null });
	});

	test("variación acumulada, no sumada", () => {
		// 1,10 × 1,05 − 1 = 15,5 % (la suma daba 15 %)
		expect(variacionAcumulada([10, 5, null])).toBeCloseTo(15.5);
		expect(variacionAcumulada([])).toBe(0);
	});
});

describe("interesesPorAnio", () => {
	test("los días suman exactamente desde → hasta, partidos por año", () => {
		const filas = interesesPorAnio(365_000, 10, "2023-12-30", "2024-01-10");
		expect(filas.map((f) => [f.año, f.dias])).toEqual([
			[2023, 2],
			[2024, 9],
		]);
		// 365.000 × 10 % / 365 = 100 por día
		expect(filas[0].interesDiario).toBeCloseTo(100);
		expect(filas.reduce((s, f) => s + f.interesDelAño, 0)).toBeCloseTo(1100);
	});

	test("año bisiesto completo en el medio", () => {
		const filas = interesesPorAnio(1000, 8, "2023-06-01", "2025-06-01");
		expect(filas.find((f) => f.año === 2024)?.dias).toBe(366);
		expect(filas.reduce((s, f) => s + f.dias, 0)).toBe(731);
	});

	test("hasta anterior o igual al accidente: sin intereses", () => {
		expect(interesesPorAnio(1000, 8, "2024-05-01", "2024-05-01")).toEqual([]);
		expect(interesesPorAnio(1000, 8, "2024-05-01", "2024-04-01")).toEqual([]);
	});
});
