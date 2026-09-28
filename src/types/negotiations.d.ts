export type ViewMode =
	| "iniciar"
	| "curso"
	| "suspenso"
	| "finalizadas"
	| "perdidas";

export type NegotiationStatus =
	| "INICIAR"
	| "CURSO"
	| "SUSPENSO"
	| "FINALIZADAS"
	| "PERDIDAS";

export interface Oferta {
	id: number;
	tipo: "ASEGURADORA" | "LEGALISTAS";
	monto: number;
	fecha: string;
	/** Fecha completa (ISO), para ordenar la línea de tiempo. */
	fechaIso: string;
	aceptada?: boolean;
	notes?: string;
}

/** Abogado de la contraparte, reutilizable entre negociaciones (relevamiento 13). */
export interface AbogadoContraparte {
	id: number;
	nombre: string;
	/** Estudio o ART a la que representa. */
	estudio: string | null;
	telefono: string | null;
	email: string | null;
	activo?: boolean;
	_count?: { negotiations: number };
}

/** Línea de tiempo: mail enviado desde la plataforma o respuesta cargada a mano. */
export interface NegociacionEvento {
	id: number;
	negotiationId: number;
	tipo: "MAIL_ENVIADO" | "RESPUESTA";
	fecha: string;
	contacto: string | null;
	asunto: string | null;
	cuerpo: string | null;
	offer: { id: number; type: "ASEGURADORA" | "LEGALISTAS"; amount: string; accepted: boolean } | null;
	createdBy: { id: number; name: string } | null;
}

export interface NegotiationCase {
	id: number;
	title: string | null;
	number: string | null;
	injury: string | null;
	servicesId: number | null;
	responsibleLawyer: { id: number; name: string; image?: string } | null;
	internalLawyer: { id: number; name: string; image?: string } | null;
	customer: { id: number; name: string } | null;
	parts: { id: number; name: string; partyType: string }[];
}

export interface Negotiation {
	id: number;
	caseId: number;
	/** Nombre del abogado contraparte (lo mantiene el backend). */
	contraparteLawyer: string | null;
	abogadoContraparte: AbogadoContraparte | null;
	/** Expediente de la negociación (para la plantilla del mail). */
	caseFile: { id: number; cuij: string | null; title: string | null } | null;
	incLegalistas: number | null;
	deArt: number | null;
	liquidacion100: number | null;
	liquidacion80: number | null;
	lastOfferAmount: number | null;
	lastOfferSource: string | null;
	agreedAmount: number | null;
	notes: string | null;
	status: NegotiationStatus;
	case: NegotiationCase;
	offers: Oferta[];
	closingId?: number | null;
}
