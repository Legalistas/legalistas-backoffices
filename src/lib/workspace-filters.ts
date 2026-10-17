import { addDays, endOfWeek, format, startOfWeek } from "date-fns";
import type { WorkCard, WorkPriority } from "@/types/workspace";

/** Due-date presets (due dates are days, compared as "YYYY-MM-DD"). */
export type DuePreset = "overdue" | "today" | "thisWeek" | "nextWeek" | "none";
/** Look-back presets for timestamps (created, updated, completed). */
export type PastPreset = "today" | "7d" | "30d";

export interface BoardFilters {
	completion: "all" | "open" | "done";
	mine: boolean;
	/** Assignee ids; 0 = unassigned. Empty = anyone. */
	assignees: number[];
	creators: number[];
	due: DuePreset | null;
	created: PastPreset | null;
	updated: PastPreset | null;
	completed: PastPreset | null;
	priorities: WorkPriority[];
}

export const EMPTY_FILTERS: BoardFilters = {
	completion: "all",
	mine: false,
	assignees: [],
	creators: [],
	due: null,
	created: null,
	updated: null,
	completed: null,
	priorities: [],
};

export const DUE_LABEL: Record<DuePreset, string> = {
	overdue: "Vencidas",
	today: "Hoy",
	thisWeek: "Esta semana",
	nextWeek: "La próxima semana",
	none: "Sin fecha",
};

export const PAST_LABEL: Record<PastPreset, string> = {
	today: "Hoy",
	"7d": "En los últimos 7 días",
	"30d": "En los últimos 30 días",
};

export const countFilters = (f: BoardFilters) =>
	(f.completion !== "all" ? 1 : 0) +
	(f.mine ? 1 : 0) +
	(f.assignees.length ? 1 : 0) +
	(f.creators.length ? 1 : 0) +
	(f.due ? 1 : 0) +
	(f.created ? 1 : 0) +
	(f.updated ? 1 : 0) +
	(f.completed ? 1 : 0) +
	(f.priorities.length ? 1 : 0);

const key = (d: Date) => format(d, "yyyy-MM-dd");
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

/** Monday-to-Sunday week that contains `d`, as day keys. */
const weekOf = (d: Date) => [
	key(startOfWeek(d, { weekStartsOn: 1 })),
	key(endOfWeek(d, { weekStartsOn: 1 })),
];

export const matchesDue = (dueDate: string | null, preset: DuePreset, now: Date) => {
	const d = day(dueDate);
	if (preset === "none") return d === null;
	if (d === null) return false;
	const today = key(now);
	if (preset === "overdue") return d < today;
	if (preset === "today") return d === today;
	const [from, to] = weekOf(preset === "thisWeek" ? now : addDays(now, 7));
	return d >= from && d <= to;
};

export const matchesPast = (iso: string | null | undefined, preset: PastPreset, now: Date) => {
	if (!iso) return false;
	const t = new Date(iso);
	if (preset === "today") return key(t) === key(now);
	const days = preset === "7d" ? 7 : 30;
	return now.getTime() - t.getTime() <= days * 24 * 60 * 60 * 1000;
};

export const matchesFilters = (t: WorkCard, f: BoardFilters, myId: number | null, now = new Date()) => {
	const done = !!t.completedAt;
	if (f.completion === "open" && done) return false;
	if (f.completion === "done" && !done) return false;
	if (f.mine && !t.assignees.some((p) => p.id === myId)) return false;
	if (
		f.assignees.length &&
		!f.assignees.some((id) => (id === 0 ? t.assignees.length === 0 : t.assignees.some((p) => p.id === id)))
	)
		return false;
	if (f.creators.length && !f.creators.includes(t.createdBy?.id ?? -1)) return false;
	if (f.due && !matchesDue(t.dueDate, f.due, now)) return false;
	if (f.created && !matchesPast(t.createdAt, f.created, now)) return false;
	if (f.updated && !matchesPast(t.updatedAt, f.updated, now)) return false;
	if (f.completed && !matchesPast(t.completedAt, f.completed, now)) return false;
	if (f.priorities.length && !f.priorities.includes(t.priority)) return false;
	return true;
};

export type SortKey =
	| "manual"
	| "due"
	| "assignee"
	| "creator"
	| "created"
	| "updated"
	| "completed"
	| "priority"
	| "likes"
	| "title";

const PRIORITY_RANK: Record<WorkPriority, number> = { URGENT: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
const byPosition = (a: WorkCard, b: WorkCard) => a.position - b.position;
/** Nulls last; ties keep the manual order. */
const asc = (x: string | null | undefined, y: string | null | undefined) =>
	x && y ? x.localeCompare(y, "es") : x ? -1 : y ? 1 : 0;
const desc = (x: string | null | undefined, y: string | null | undefined) =>
	x && y ? y.localeCompare(x) : x ? -1 : y ? 1 : 0;

export const SORTERS: Record<SortKey, (a: WorkCard, b: WorkCard) => number> = {
	manual: byPosition,
	due: (a, b) => asc(day(a.dueDate), day(b.dueDate)) || byPosition(a, b),
	assignee: (a, b) => asc(a.assignees[0]?.name, b.assignees[0]?.name) || byPosition(a, b),
	creator: (a, b) => asc(a.createdBy?.name, b.createdBy?.name) || byPosition(a, b),
	created: (a, b) => desc(a.createdAt, b.createdAt) || byPosition(a, b),
	updated: (a, b) => desc(a.updatedAt, b.updatedAt) || byPosition(a, b),
	completed: (a, b) => desc(a.completedAt, b.completedAt) || byPosition(a, b),
	priority: (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || byPosition(a, b),
	likes: (a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0) || byPosition(a, b),
	title: (a, b) => a.title.localeCompare(b.title, "es"),
};
