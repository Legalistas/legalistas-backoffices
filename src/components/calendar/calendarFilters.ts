// Calendar filters by role and person (Legales request, 05/11/2026).

export interface OwnerRole {
	name: string;
	displayName: string | null;
}

/** The person an event belongs to, with her roles. */
export interface EventOwner {
	id: number;
	name: string;
	roles: OwnerRole[];
}

interface ApiPerson {
	id: number;
	name: string | null;
	roleUser?: { role: OwnerRole }[];
}

export interface CalendarFilters {
	/** Only the events of the logged-in user ("Mis tareas"). */
	mine: boolean;
	/** Role name, e.g. "abogado_interno". */
	role: string | null;
	/** User ids; empty = everyone. */
	people: number[];
}

export const NO_FILTERS: CalendarFilters = { mine: false, role: null, people: [] };

/** The event's responsible, or whoever created it when there is none (as Google sync does). */
export function eventOwner(ev: {
	responsiblePerson?: ApiPerson | null;
	user?: ApiPerson | null;
}): EventOwner | null {
	const p = ev.responsiblePerson ?? ev.user;
	if (!p) return null;
	return { id: p.id, name: p.name ?? "", roles: (p.roleUser ?? []).map((r) => r.role) };
}

/** All filters combine (AND): role + person shows that person's events, if she has the role. */
export function matchesFilters(
	owner: EventOwner | null,
	f: CalendarFilters,
	myId: number | null,
): boolean {
	if (f.mine && (!owner || owner.id !== myId)) return false;
	if (f.role && !owner?.roles.some((r) => r.name === f.role)) return false;
	if (f.people.length > 0 && !(owner && f.people.includes(owner.id))) return false;
	return true;
}

export const hasFilters = (f: CalendarFilters) => f.mine || !!f.role || f.people.length > 0;

export const roleLabel = (r: OwnerRole) => r.displayName?.trim() || r.name;

const storageKey = (userId: number) => `calendar-filters:${userId}`;

/** The user's last filters in this browser; none when storage is unavailable. */
export function loadFilters(userId: number): CalendarFilters {
	try {
		const raw = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "null");
		if (!raw || typeof raw !== "object") return NO_FILTERS;
		return {
			mine: raw.mine === true,
			role: typeof raw.role === "string" ? raw.role : null,
			people: Array.isArray(raw.people) ? raw.people.filter(Number.isInteger) : [],
		};
	} catch {
		return NO_FILTERS;
	}
}

export function saveFilters(userId: number, f: CalendarFilters) {
	try {
		localStorage.setItem(storageKey(userId), JSON.stringify(f));
	} catch {
		// Private mode or blocked storage: the filters just are not remembered.
	}
}
