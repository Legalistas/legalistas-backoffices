import { format } from "date-fns";
import { CAJA_ENDPOINT } from "@/constant/api-endpoints";
import type { Caja } from "@/types/caja";

export class CajaApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
	}
}

/** fetch contra /caja con el token de la sesión. Tira CajaApiError con el mensaje del backend. */
export async function cajaFetch<T>(
	path: string,
	token: string | undefined,
	init: { method?: string; json?: unknown } = {},
): Promise<T> {
	const res = await fetch(`${CAJA_ENDPOINT}${path}`, {
		method: init.method ?? "GET",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new CajaApiError(body.error || body.message || `Error ${res.status}`, res.status);
	}
	return body as T;
}

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
export const formatARS = (n: number) => ars.format(n);

export const MESES = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
];

/** { year, month0 } → "YYYY-MM" */
export const mesParam = (year: number, month0: number) =>
	`${year}-${String(month0 + 1).padStart(2, "0")}`;

/** Último día del mes "YYYY-MM" → "YYYY-MM-DD". */
export const finDeMes = (mes: string) => {
	const [y, m] = mes.split("-").map(Number);
	return `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};

/** "2026-09-11" → "11/09/2026" (sin pasar por Date para no correr el día). */
export const formatFecha = (iso: string) => iso.split("-").reverse().join("/");

export const hoyISO = () => format(new Date(), "yyyy-MM-dd");

/** Cajas donde se puede cargar un movimiento (las que no agrupan sub-cajas), con etiqueta "Padre › Hija". */
export function cajasOperables(cajas: Caja[]): { caja: Caja; label: string }[] {
	return cajas.flatMap((c) =>
		c.esContenedora
			? c.hijas.map((h) => ({ caja: h, label: `${c.nombre} › ${h.nombre}` }))
			: [{ caja: c, label: c.nombre }],
	);
}

/** Todas las cajas en una lista plana (padres e hijas). */
export const aplanarCajas = (cajas: Caja[]): Caja[] => cajas.flatMap((c) => [c, ...c.hijas]);
