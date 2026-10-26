import { RRHH_PANEL_ENDPOINT } from "@/constant/api-endpoints";

/** GET on the Panel RR.HH. endpoints; throws with the backend message. */
export async function panelFetch<T>(path: string, token: string | undefined): Promise<T> {
	const res = await fetch(`${RRHH_PANEL_ENDPOINT}${path}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.error || body.message || `Error ${res.status}`);
	return body as T;
}

/** Dates stored without time zone (contracts, leaves, due dates): dd/mm/aaaa. */
export const fechaCorta = (iso: string | null | undefined) =>
	iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" }) : "—";

export const periodoActual = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
