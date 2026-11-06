import { describe, expect, test } from "bun:test";
import type { Nodo } from "./OrganigramaPorJefe";
import { layoutOrganigrama } from "./organigramaPdf";

const nodo = (id: number, hijos: Nodo[] = [], representante = false): Nodo => ({
	id,
	nombre: `Persona ${id}`,
	puesto: "",
	image: null,
	representante,
	hijos,
});

const boxOf = (l: ReturnType<typeof layoutOrganigrama>, id: number) => {
	const b = l.boxes.find((x) => x.n.id === id);
	if (!b) throw new Error(`sin caja ${id}`);
	return b;
};

describe("layoutOrganigrama", () => {
	test("the boss is centered over her team, one level below", () => {
		const l = layoutOrganigrama([nodo(1, [nodo(2), nodo(3)])]);
		const [jefa, a, b] = [boxOf(l, 1), boxOf(l, 2), boxOf(l, 3)];
		expect(a.y).toBe(b.y);
		expect(a.y).toBeGreaterThan(jefa.y);
		expect(jefa.x).toBeCloseTo((a.x + b.x) / 2);
		expect(b.x).toBeGreaterThan(a.x);
	});

	test("representatives stack in one column instead of widening the row", () => {
		const reps = [4, 5, 6, 7, 8].map((id) => nodo(id, [], true));
		const l = layoutOrganigrama([nodo(1, [nodo(2), ...reps])]);
		const xs = new Set(reps.map((r) => boxOf(l, r.id).x));
		expect(xs.size).toBe(1);
		const ys = reps.map((r) => boxOf(l, r.id).y);
		expect([...ys].sort((p, q) => p - q)).toEqual(ys);
		// Two slots wide (the teammate and the column), not six.
		expect(l.width).toBeLessThan(52 * 3);
		expect(l.labels).toHaveLength(1);
		expect(l.height).toBeGreaterThan(boxOf(l, 8).y);
	});
});
