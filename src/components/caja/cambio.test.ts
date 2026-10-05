import { describe, expect, test } from "bun:test";
import { type CampoCambio, recalcularCambio, type ValoresCambio } from "./cambio";

const vacio: ValoresCambio = { pesos: "", dolares: "", cotizacion: "" };

/** Aplica una serie de ediciones seguidas, como si se tipeara en el diálogo. */
const tipear = (pasos: [CampoCambio, string][], inicio = vacio, editados: CampoCambio[] = []) =>
	pasos.reduce(
		(estado, [campo, texto]) => recalcularCambio(estado.valores, estado.editados, campo, texto),
		{ valores: inicio, editados, calculado: null as CampoCambio | null },
	);

describe("recalcularCambio", () => {
	test("con la cotización elegida, los pesos calculan los dólares", () => {
		const r = tipear([
			["cotizacion", "1551,9"],
			["pesos", "400000"],
		]);
		expect(r.valores).toEqual({ pesos: "400000", dolares: "257,75", cotizacion: "1551,9" });
		expect(r.calculado).toBe("dolares");
	});

	test("con la cotización elegida, los dólares calculan los pesos", () => {
		const r = tipear([
			["cotizacion", "1500"],
			["dolares", "275"],
		]);
		expect(r.valores.pesos).toBe("412500");
		expect(r.calculado).toBe("pesos");
	});

	test("con los dos montos reales, se calcula la cotización de la operación", () => {
		const r = tipear([
			["cotizacion", "1551,9"],
			["pesos", "400000"],
			["dolares", "275"],
		]);
		expect(r.valores).toEqual({ pesos: "400000", dolares: "275", cotizacion: "1454,55" });
		expect(r.calculado).toBe("cotizacion");
	});

	test("cambiar de dólar recalcula el monto que no se tocó último", () => {
		const r = tipear([
			["cotizacion", "1551,9"],
			["pesos", "400000"],
			["cotizacion", "1560"],
		]);
		expect(r.valores).toEqual({ pesos: "400000", dolares: "256,41", cotizacion: "1560" });
	});

	test("mientras se escribe el mismo campo, el otro se va actualizando", () => {
		const r = tipear([
			["cotizacion", "1000"],
			["pesos", "1"],
			["pesos", "10"],
			["pesos", "100000"],
		]);
		expect(r.valores.dolares).toBe("100");
		expect(r.editados).toEqual(["cotizacion", "pesos"]);
	});

	test("sin cotización no inventa nada", () => {
		const r = tipear([["pesos", "400000"]]);
		expect(r.valores).toEqual({ pesos: "400000", dolares: "", cotizacion: "" });
		expect(r.calculado).toBeNull();
	});

	test("acepta coma o punto como decimal", () => {
		const r = tipear([
			["cotizacion", "1454.55"],
			["dolares", "100,5"],
		]);
		expect(r.valores.pesos).toBe("146182,28");
	});
});
