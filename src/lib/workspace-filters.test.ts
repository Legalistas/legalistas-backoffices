import { describe, expect, test } from "bun:test";
import type { WorkCard } from "@/types/workspace";
import { EMPTY_FILTERS, matchesDue, matchesFilters, matchesPast, SORTERS } from "./workspace-filters";

// Friday 16/10/2026, 15:00 local time.
const now = new Date(2026, 9, 16, 15, 0);
const day = (s: string) => `${s}T00:00:00.000Z`;

const card = (over: Partial<WorkCard>): WorkCard => ({
	id: 1,
	title: "Tarea",
	columnId: 1,
	position: 1,
	priority: "MEDIUM",
	dueDate: null,
	completedAt: null,
	createdAt: "2026-10-01T12:00:00.000Z",
	updatedAt: "2026-10-01T12:00:00.000Z",
	createdBy: { id: 9, name: "Ana", image: null },
	version: 1,
	assignees: [],
	likes: [],
	subtaskItems: [],
	subtasks: 0,
	comments: 0,
	cases: 0,
	leads: 0,
	attachments: 0,
	cover: null,
	...over,
});

describe("matchesDue", () => {
	test("this week is Monday 12 to Sunday 18; next week 19 to 25", () => {
		expect(matchesDue(day("2026-10-12"), "thisWeek", now)).toBe(true);
		expect(matchesDue(day("2026-10-18"), "thisWeek", now)).toBe(true);
		expect(matchesDue(day("2026-10-19"), "thisWeek", now)).toBe(false);
		expect(matchesDue(day("2026-10-19"), "nextWeek", now)).toBe(true);
		expect(matchesDue(day("2026-10-25"), "nextWeek", now)).toBe(true);
	});

	test("overdue, today and no date", () => {
		expect(matchesDue(day("2026-10-15"), "overdue", now)).toBe(true);
		expect(matchesDue(day("2026-10-16"), "overdue", now)).toBe(false);
		expect(matchesDue(day("2026-10-16"), "today", now)).toBe(true);
		expect(matchesDue(null, "none", now)).toBe(true);
		expect(matchesDue(null, "today", now)).toBe(false);
	});
});

describe("matchesPast", () => {
	test("last 7 days", () => {
		expect(matchesPast("2026-10-10T15:00:00", "7d", now)).toBe(true);
		expect(matchesPast("2026-10-08T15:00:00", "7d", now)).toBe(false);
		expect(matchesPast(null, "7d", now)).toBe(false);
	});
});

describe("matchesFilters", () => {
	test("completion, mine, unassigned (0) and creator", () => {
		const mine = card({ assignees: [{ id: 5, name: "Yo", image: null }] });
		const done = card({ completedAt: "2026-10-16T10:00:00.000Z" });
		expect(matchesFilters(done, { ...EMPTY_FILTERS, completion: "open" }, 5, now)).toBe(false);
		expect(matchesFilters(mine, { ...EMPTY_FILTERS, mine: true }, 5, now)).toBe(true);
		expect(matchesFilters(card({}), { ...EMPTY_FILTERS, mine: true }, 5, now)).toBe(false);
		expect(matchesFilters(card({}), { ...EMPTY_FILTERS, assignees: [0] }, 5, now)).toBe(true);
		expect(matchesFilters(mine, { ...EMPTY_FILTERS, assignees: [0] }, 5, now)).toBe(false);
		expect(matchesFilters(card({}), { ...EMPTY_FILTERS, creators: [9] }, 5, now)).toBe(true);
		expect(matchesFilters(card({}), { ...EMPTY_FILTERS, creators: [7] }, 5, now)).toBe(false);
	});
});

describe("SORTERS", () => {
	test("due date: earliest first, no date last", () => {
		const list = [
			card({ id: 1, dueDate: null }),
			card({ id: 2, dueDate: day("2026-10-20") }),
			card({ id: 3, dueDate: day("2026-10-17") }),
		];
		expect(list.sort(SORTERS.due).map((c) => c.id)).toEqual([3, 2, 1]);
	});
});
