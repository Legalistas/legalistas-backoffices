import { describe, expect, test } from "bun:test";
import { eventOwner, matchesFilters, NO_FILTERS } from "./calendarFilters";

const interno = { name: "abogado_interno", displayName: "Abogado interno" };
const julieta = { id: 5, name: "Zeballos Julieta", roleUser: [{ role: interno }] };
const jona = { id: 562, name: "Vilella Jonatan", roleUser: [{ role: { name: "director_area_it", displayName: null } }] };

describe("eventOwner", () => {
	test("the responsible owns the event, else its creator", () => {
		expect(eventOwner({ responsiblePerson: julieta, user: jona })?.id).toBe(5);
		expect(eventOwner({ responsiblePerson: null, user: jona })?.id).toBe(562);
		expect(eventOwner({})).toBeNull();
	});
});

describe("matchesFilters", () => {
	const deJulieta = eventOwner({ responsiblePerson: julieta });
	const deJona = eventOwner({ user: jona });

	test("no filters shows everything", () => {
		expect(matchesFilters(deJulieta, NO_FILTERS, 562)).toBe(true);
		expect(matchesFilters(null, NO_FILTERS, 562)).toBe(true);
	});

	test("mine: only the logged-in user's events", () => {
		const f = { ...NO_FILTERS, mine: true };
		expect(matchesFilters(deJona, f, 562)).toBe(true);
		expect(matchesFilters(deJulieta, f, 562)).toBe(false);
		expect(matchesFilters(null, f, 562)).toBe(false);
	});

	test("role and person combine", () => {
		const rol = { ...NO_FILTERS, role: "abogado_interno" };
		expect(matchesFilters(deJulieta, rol, 562)).toBe(true);
		expect(matchesFilters(deJona, rol, 562)).toBe(false);
		expect(matchesFilters(deJulieta, { ...rol, people: [5] }, 562)).toBe(true);
		expect(matchesFilters(deJulieta, { ...rol, people: [562] }, 562)).toBe(false);
	});
});
