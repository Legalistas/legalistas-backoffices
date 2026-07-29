export type CompetenceGround = "DOMICILIO" | "PRESTACION" | "REPORTA";

export type SrtProcedureType =
	| "DIVERGENCIA_INCAPACIDAD"
	| "RECHAZO_ACCIDENTE_TRABAJO"
	| "RECHAZO_ACCIDENTE_IN_ITINERE"
	| "RECHAZO_ENFERMEDAD_PROF"
	| "DIVERGENCIA_PRESTACIONES";

export type ContingencyType =
	| "ACCIDENTE_TRABAJO"
	| "IN_ITINERE"
	| "ENFERMEDAD_PROF";

export type Anexo4Reason = "ALTA" | "REINGRESO" | "PRESTACIONES";

/**
 * Entrada del historial de formularios generados
 * (payload de GET /cases/:id/srt-forms).
 */
export interface SrtFormListItem {
	id: number;
	procedureType: SrtProcedureType;
	procedureLabel: string;
	lawyerUserId: number | null;
	lawyerName: string | null;
	generatedByUserId: number;
	generatedByName: string | null;
	pdfPath: string | null;
	minioObjectKey: string | null;
	createdAt: string;
}

/**
 * Info del caso — bloques A-E comunes a todos los formularios SRT + JSON
 * por anexo. Payload del endpoint GET /cases/:caseId/srt-info.
 */
export interface CaseSrtInfo {
	id: number | null;
	caseId: number;
	// Bloque A — Trabajador
	workerFullName: string | null;
	workerCuil: string | null;
	workerDni: string | null;
	workerAddress: string | null;
	workerCity: string | null;
	workerState: string | null;
	workerZip: string | null;
	workerPhone: string | null;
	// Bloque B — Letrada
	lawyerUserId: number | null;
	// Bloque C — Empleador
	employerName: string | null;
	employerCuit: string | null;
	workplace: string | null;
	workplaceCity: string | null;
	workplaceState: string | null;
	// Bloque D — ART
	artName: string | null;
	artCuit: string | null;
	// Bloque E — Competencia
	cmNumber: string | null;
	cmJurisdiction: string | null;
	competenceGround: CompetenceGround | null;
	competenceAddress: string | null;
	// Campos específicos por anexo (JSON)
	anexoIData: Record<string, unknown> | null;
	anexoIIData: Record<string, unknown> | null;
	anexoIIIData: Record<string, unknown> | null;
	anexoIVData: Record<string, unknown> | null;
	updatedAt: string | null;
}

/**
 * Abogado del maestro SRT (user con rol abogado_representante + matrícula).
 * Payload del endpoint GET /lawyers.
 */
export interface SrtLawyer {
	userId: number;
	name: string;
	email: string | null;
	isBlocked: boolean;
	cuit: string | null;
	phone: string | null;
	srtMatricula: string | null;
	srtElectronicDomicile: string | null;
	srtBarJurisdiction: string | null;
	srtLegalOffice: string | null;
	legalAddress: {
		street: string | null;
		streetNumber: string | null;
		city: string | null;
		zip: string | null;
		stateId: number | null;
		stateName: string | null;
		countryId: number | null;
	} | null;
	hasLawyerRole: boolean;
	isCompleteLawyer: boolean;
}

/** User elegible para ser promovido a abogado (sin rol asignado aún). */
export interface EligibleUser {
	id: number;
	name: string;
	email: string | null;
}

/**
 * Defaults derivados del caso — sirven para prefill del formulario SRT
 * cuando la info todavía no fue cargada. Vienen en el mismo response que
 * GET /cases/:id/srt-info.
 */
export interface CaseSrtDefaults {
	/** Datos del cliente/trabajador del caso (customer). */
	worker: {
		fullName: string | null;
		dni: string | null;
		cuil: string | null;
		phone: string | null;
		address: string | null;
		city: string | null;
		state: string | null;
		zip: string | null;
	} | null;
	/**
	 * Abogado responsable del caso (responsibleLawyer). Se muestra como
	 * fallback en Asistencia letrada cuando no hay `lawyerUserId` seteado
	 * en la info SRT. Subset de SrtLawyer sin los flags de maestro
	 * (isBlocked/hasLawyerRole/isCompleteLawyer).
	 */
	representativeLawyer: Omit<
		SrtLawyer,
		"isBlocked" | "hasLawyerRole" | "isCompleteLawyer"
	> | null;
}
