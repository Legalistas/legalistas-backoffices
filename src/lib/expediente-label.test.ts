import { describe, expect, test } from "bun:test";
import { demandadosLabel } from "./expediente-label";

describe("demandadosLabel", () => {
	test("solo los demandados (también los tipos viejos), sin repetir", () => {
		expect(
			demandadosLabel([
				{ name: "Toani Samanta", partyType: "ACTOR" },
				{ name: "PREVENCION ART S.A.", partyType: "DEMANDADO" },
				{ name: "Prevencion ART S.A.", partyType: "demandado" },
			]),
		).toBe("PREVENCION ART S.A.");
	});

	test("dos: A y B; más de dos: A y otros; ninguno: vacío", () => {
		const d = (name: string) => ({ name, partyType: "DEMANDADO" });
		expect(demandadosLabel([d("A"), { name: "B", partyType: "art" }])).toBe("A y B");
		expect(demandadosLabel([d("A"), d("B"), d("C")])).toBe("A y otros");
		expect(demandadosLabel([{ name: "X", partyType: "ACTOR" }])).toBe("");
		expect(demandadosLabel(undefined)).toBe("");
	});
});
