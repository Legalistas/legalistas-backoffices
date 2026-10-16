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

/** fetch contra /workspace con el token de la sesión. Tira WorkspaceApiError con el mensaje del backend. */
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

/** Las fechas de vencimiento son días: se guardan a las 00:00 UTC y se leen sin zona horaria. */
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

/** Mismo cálculo que el backend (position.ts), para reordenar antes de que responda. */
export const positionAt = (sorted: number[], index: number) => {
	if (sorted.length === 0) return 1;
	if (index <= 0) return sorted[0] - 1;
	if (index >= sorted.length) return sorted[sorted.length - 1] + 1;
	return (sorted[index - 1] + sorted[index]) / 2;
};
