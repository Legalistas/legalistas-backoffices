import { TYPES_PROCCESS } from "@/constant/causes";

interface ExpedienteLike {
	id: number | string;
	title?: string | null;
	cuij?: string | null;
	typeProcessId?: number | null;
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
