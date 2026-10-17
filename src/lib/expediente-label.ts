import { TYPES_PROCCESS } from "@/constant/causes";

interface ExpedienteLike {
	id: number | string;
	title?: string | null;
	cuij?: string | null;
	typeProcessId?: number | null;
	/** 1 = administrativo, 2 = judicial. */
	filetype?: number | null;
	parts?: Array<{ name?: string | null; partyType?: string | null }>;
}

/**
 * "Carátula — CUIJ". La carátula la arma el backend con las partes y el tipo
 * de proceso (relevamiento 6.1) y se guarda en `title`. Solo si no hay título
 * se arma acá con lo que venga: "Actor C/ Demandado S/ TipoProceso".
 */
export function getExpedienteLabel(
	f: ExpedienteLike,
	customerName?: string,
): string {
	const cuij = f.cuij ? ` — ${f.cuij}` : "";
	if (f.title?.trim()) return `${f.title.trim()}${cuij}`;

	const parts = f.parts || [];
	const actor = parts.find(
		(p) => p.partyType === "actor" || p.partyType === "demandante",
	);
	const demandado = parts.find((p) => p.partyType === "demandado");
	const actorName = actor?.name || customerName || "";
	const demandadoName = demandado?.name || (actorName ? "Sin partes" : "");
	const partesLabel = actorName ? `${actorName} C/ ${demandadoName}` : "";
	const processType = f.typeProcessId
		? TYPES_PROCCESS.find((t) => t.id === f.typeProcessId)?.value
		: "";
	const caratula = partesLabel
		? `${partesLabel}${processType ? ` S/ ${processType}` : ""}`
		: `Expediente #${f.id}`;
	return `${caratula}${cuij}`;
}

/** "2 expedientes · Nº 21-23701468-2, 21-23701470-9" (debajo del título de la causa). */
export const resumenExpedientes = (files: { cuij?: string | null }[] | undefined) => {
	const cantidad = files?.length ?? 0;
	if (!files || cantidad === 0) return "Sin expedientes";
	const numeros = files.map((f) => f.cuij?.trim()).filter(Boolean);
	const texto = `${cantidad} ${cantidad === 1 ? "expediente" : "expedientes"}`;
	return numeros.length ? `${texto} · Nº ${numeros.join(", ")}` : texto;
};
