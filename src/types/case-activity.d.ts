// Tipos de GET /cases/:id/crm y GET /cases/:id/timeline.

export interface ActivityUser {
	id: number;
	name: string;
	image?: string | null;
}

export interface CaseCrmNote {
	id: number;
	note: string | null;
	createdAt: string;
	user: ActivityUser | null;
	/** Id de la nota del caso si ya se copió al convertir el lead. */
	caseNoteId: number | null;
}

export interface CaseCrmMeeting {
	id: number;
	date: string;
	type: string;
	note: string | null;
	confirmationStatus: string;
	confirmedAt: string | null;
	realizada: boolean;
	realizadaAt: string | null;
	realizadaBy: ActivityUser | null;
	responsibleLawyer: ActivityUser | null;
	user: ActivityUser | null;
}

export interface CaseCrm {
	lead: { id: number; createdAt: string; seller: ActivityUser | null } | null;
	notes: CaseCrmNote[];
	meetings: CaseCrmMeeting[];
}

export type TimelineKind =
	| "caso"
	| "nota"
	| "plazo"
	| "evento"
	| "informe"
	| "escrito"
	| "cedula"
	| "documento"
	| "expediente"
	| "email"
	| "crm";

export interface TimelineItem {
	id: string;
	kind: TimelineKind;
	date: string;
	title: string;
	detail: string | null;
	user: { id: number; name: string } | null;
}
