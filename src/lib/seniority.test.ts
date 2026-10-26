import { describe, expect, test } from "bun:test";
import { seniority } from "./seniority";

describe("seniority", () => {
	const now = new Date(2026, 9, 26); // 26/10/2026, local time

	test("years and months", () => {
		expect(seniority("2024-07-01T00:00:00.000Z", now)).toBe("2 años y 3 meses");
	});
	test("a month is not complete until its day comes", () => {
		expect(seniority("2025-10-27T00:00:00.000Z", now)).toBe("11 meses");
		expect(seniority("2025-10-26T00:00:00.000Z", now)).toBe("1 año");
	});
	test("singulars and the first month", () => {
		expect(seniority("2025-09-26T00:00:00.000Z", now)).toBe("1 año y 1 mes");
		expect(seniority("2026-10-01T00:00:00.000Z", now)).toBe("Menos de un mes");
	});
	test("no date", () => {
		expect(seniority(null, now)).toBeNull();
		expect(seniority("not a date", now)).toBeNull();
	});
});
