// Tipos de parte del relevamiento 5.2.
// Espejo de `backend/src/constants/parties.ts` — si cambia uno, cambia el otro.

export const PARTY_TYPES = [
	"ACTOR",
	"DEMANDADO",
	"TERCERO_CITADO_GARANTIA",
	"TESTIGO",
	"PERITO",
] as const;

export type PartyType = (typeof PARTY_TYPES)[number];

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
	ACTOR: "Actor",
	DEMANDADO: "Demandado",
	TERCERO_CITADO_GARANTIA: "Tercero citado en garantía",
	TESTIGO: "Testigo",
	PERITO: "Perito",
};

/**
 * Etiquetas de los tipos viejos, para no mostrar el código crudo en las partes
 * que todavía no se migraron. Solo lectura: el formulario nunca los ofrece.
 */
export const LEGACY_PARTY_TYPE_LABELS: Record<string, string> = {
	DEMANDANTE: "Actor",
	TERCERO: "Tercero citado en garantía",
	actor: "Actor",
	demandado: "Demandado",
	art: "Demandado",
	abogado: "Letrado (dato heredado)",
};

/** Etiqueta legible de cualquier tipo, nuevo o heredado. */
export function partyTypeLabel(value: string | null | undefined): string {
	if (!value) return "—";
	return (
		PARTY_TYPE_LABELS[value as PartyType] ??
		LEGACY_PARTY_TYPE_LABELS[value] ??
		value
	);
}

/** Entidad del catálogo reutilizable. */
export interface CatalogParty {
	id: number;
	name: string;
	normalizedName: string;
	partyType: string;
	address: string | null;
	city: string | null;
	stateId: number | null;
	postalCode: string | null;
	phone: string | null;
	documentNumber: string | null;
	isActive: boolean;
	notes: string | null;
	state?: { id: number; name: string } | null;
}
