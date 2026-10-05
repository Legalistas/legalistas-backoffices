import { format } from "date-fns";
import { CAJA_ENDPOINT } from "@/constant/api-endpoints";
import type { Caja, CajaMoneda, CajaMovimiento, CajaMovimientosResponse } from "@/types/caja";

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

const usd = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatUSD = (n: number) => `${n < 0 ? "-" : ""}US$ ${usd.format(Math.abs(n))}`;
export const formatMonto = (n: number, moneda: CajaMoneda) =>
	moneda === "USD" ? formatUSD(n) : formatARS(n);

export const MONEDA_LABEL: Record<CajaMoneda, string> = { ARS: "Pesos", USD: "Dólares" };

/** Compra o venta de dólares: las dos puntas del movimiento están en monedas distintas. */
export const esCambio = (m: Pick<CajaMovimiento, "moneda" | "contraparte">) =>
	!!m.contraparte && m.contraparte.moneda !== m.moneda;

/** En una compra salen pesos y entran dólares; en una venta, al revés. */
export const esCompraDeDolares = (m: Pick<CajaMovimiento, "moneda" | "tipo">) =>
	(m.moneda === "ARS") === (m.tipo === "EGRESO");

/** "1.454,55" o "1454.55" → 1454.55 (coma o punto como decimal, sin separador de miles). */
export const leerNumero = (texto: string) => Number(texto.replace(",", "."));

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

/** Todas las páginas de /movimientos con esos filtros (para exportar). */
export async function traerTodosLosMovimientos(
	token: string | undefined,
	filtros: URLSearchParams,
): Promise<CajaMovimientosResponse> {
	const todos: CajaMovimiento[] = [];
	let totales = { ingresos: 0, egresos: 0, ingresosUsd: 0, egresosUsd: 0 };
	for (let page = 1; ; page++) {
		const params = new URLSearchParams(filtros);
		params.set("page", String(page));
		params.set("limit", "200");
		const res = await cajaFetch<CajaMovimientosResponse>(`/movimientos?${params}`, token);
		todos.push(...res.data);
		totales = res.totales;
		if (page >= res.pagination.totalPages) {
			return {
				data: todos,
				totales,
				pagination: { ...res.pagination, page: 1, limit: todos.length },
			};
		}
	}
}

/** "2026-09" → "septiembre 2026"; "2026" → "año 2026". */
export const nombrePeriodo = (periodo: string) => {
	if (periodo.length === 4) return `año ${periodo}`;
	const [y, m] = periodo.split("-").map(Number);
	return new Date(y, m - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
};

/** Primer y último día del período ("YYYY-MM" o "YYYY"). */
export const rangoPeriodo = (periodo: string) =>
	periodo.length === 4
		? { desde: `${periodo}-01-01`, hasta: `${periodo}-12-31` }
		: { desde: `${periodo}-01`, hasta: finDeMes(periodo) };
