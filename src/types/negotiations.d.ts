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
	aceptada?: boolean;
	notes?: string;
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
	contraparteLawyer: string | null;
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
