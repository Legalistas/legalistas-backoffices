import { format } from "date-fns";
import { WORKSPACE_ENDPOINT } from "@/constant/api-endpoints";
import type { WorkPriority } from "@/types/workspace";

export class WorkspaceApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

/** fetch against /workspace with the session token. Throws WorkspaceApiError with the backend message. */
export async function workspaceFetch<T>(
	path: string,
	token: string | undefined,
	init: { method?: string; json?: unknown } = {},
): Promise<T> {
	const res = await fetch(`${WORKSPACE_ENDPOINT}${path}`, {
		method: init.method ?? "GET",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new WorkspaceApiError(body.error || body.message || `Error ${res.status}`, res.status);
	}
	return body as T;
}

export const errorMessage = (e: unknown, fallback: string) =>
	e instanceof Error && e.message ? e.message : fallback;

export const PRIORITY_LABEL: Record<WorkPriority, string> = {
	LOW: "Baja",
	MEDIUM: "Media",
	HIGH: "Alta",
	URGENT: "Urgente",
};

/** Due dates are days: stored at 00:00 UTC and read without a timezone. */
export const dayOf = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);
export const todayKey = () => format(new Date(), "yyyy-MM-dd");
export const formatDay = (iso: string | null | undefined) => {
	const d = dayOf(iso);
	return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : "";
};
export const isOverdue = (iso: string | null | undefined, completed: boolean) => {
	const d = dayOf(iso);
	return !completed && !!d && d < todayKey();
};

/** Same math as the backend (position.ts), to reorder before it answers. */
export const positionAt = (sorted: number[], index: number) => {
	if (sorted.length === 0) return 1;
	if (index <= 0) return sorted[0] - 1;
	if (index >= sorted.length) return sorted[sorted.length - 1] + 1;
	return (sorted[index - 1] + sorted[index]) / 2;
};

/** Project colors (Asana-like palette); a project without one gets one by id. */
export const PROJECT_COLORS = [
	"#4ECBC4",
	"#E58EEA",
	"#F1BD6C",
	"#7A6FF0",
	"#62D26F",
	"#F06A6A",
	"#4573D2",
	"#FC979A",
];
export const projectColor = (p: { id: number; color?: string | null }) =>
	p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length];

/** "Buenos días" / "Buenas tardes" / "Buenas noches", by the local hour. */
export const greeting = (d = new Date()) => {
	const h = d.getHours();
	return h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
};

/** Names are stored as "Surname Name(s)": the first name is the second word. */
export const firstName = (name: string | null | undefined) => {
	const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
	return parts[1] ?? parts[0] ?? "";
};

/** Like the case manager: "#3486 | GONZALES FRANCISCO" (client number and name). */
export const caseHeadline = (c: {
	id: number;
	title: string | null;
	customerId?: number;
	customer?: { id: number; name: string | null } | null;
}) =>
	`#${c.customer?.id ?? c.customerId ?? c.id} | ${(c.customer?.name ?? c.title ?? "Sin nombre").toUpperCase()}`;

/** Text left in the editor by a # mention: "GONZALES FRANCISCO · 2265". */
export const caseMentionLabel = (c: {
	id: number;
	number: string | null;
	title: string | null;
	customer?: { name: string | null } | null;
}) => `${(c.customer?.name ?? c.title ?? "Causa").toUpperCase()} · ${c.number ?? c.id}`;
