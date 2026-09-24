export interface User {
	id: number;
	name: string;
	email: string;
	image: string;
	userProfile?: { phone?: string; birthDate?: string };
}

export interface CasesFiles {
	id: string;
	caseId: string;
	title: string;
	description: string;
	filetype: number;
	proceduralStageId: number;
	observation: string;
	cuij: string;
	courtId: number;
	jurisdictionId?: number | null;
	typeProcessId: number;
	statusProcessId: number;
	startDate: string;
	instanceExpiration: string;
	lastMovementDate?: string;
	endDate: string;
	createdAt: string;
	updatedAt: string;
	court: Court;
	case: Cases;
	filesParts: any[]; // Assuming filesParts is an array of any type
	fileMovements?: CasesFilesMovement[];
	accidentDate?: string;
	// Tipo de lesión de este expediente (se copia del caso al crearlo).
	injury?: string | null;
	instanceExpiration?: string;
}

export interface CasePart {
	id: number;
	caseId: number;
	fileId?: number | null;
	/** Entrada del catálogo reutilizable de la que salió esta parte. */
	partyId?: number | null;
	partyType: string;
	name: string;
	documentNumber?: string | null;
	stateId?: number | null;
	city?: string | null;
	postalCode?: string | null;
	address?: string | null;
	phone?: string | null;
	metadata?: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
	state?: { id: number; name: string } | null;
	file?: { id: number; title: string } | null;
	party?: { id: number; name: string; partyType: string; isActive: boolean } | null;
	/**
	 * Campos que el relevamiento 5.1 eliminó del formulario. Siguen llegando en
	 * las filas viejas, así que el tipo los contempla como opcionales, pero
	 * ninguna pantalla los edita ni los envía.
	 * @deprecated
	 */
	personType?: string | null;
	/** @deprecated Ver personType. */
	documentType?: string | null;
	/** @deprecated El país queda fijo en Argentina. */
	countryId?: number | null;
	/** @deprecated */
	email?: string | null;
	/** @deprecated */
	sponsoringLawyer?: string | null;
	/** @deprecated */
	country?: { id: number; name: string } | null;
}

export interface CaseExpense {
	id: number;
	caseId: number;
	fileId?: number | null;
	description?: string | null;
	amount: number;
	date?: string | null;
	category?: string | null;
	userId: number;
	createdAt: string;
	updatedAt: string;
	file?: { id: number; title: string } | null;
	user?: { id: number; name: string } | null;
}

export interface CaseEvent {
	id: number;
	caseId: number;
	fileId?: number | null;
	type: number;
	subType?: number | null;
	title?: string | null;
	date: string;
	time?: string | null;
	location?: string | null;
	observation?: string | null;
	status: string;
	schedule: number;
	responsibleId: number;
	createdAt: string;
	updatedAt: string;
	file?: {
		id: number;
		title: string;
		cuij?: string;
	} | null;
	responsiblePerson: {
		id: number;
		name: string;
		email: string;
		image?: string;
	};
}

/** Detalle del cómputo automático de un plazo (backend: case-deadlines.service). */
export interface DeadlineCalculationDetail {
	tipo_dias: "business" | "calendar";
	cantidad_dias: number;
	fecha_notificacion: string;
	fecha_inicio_computo: string;
	fecha_vencimiento?: string;
	/** Cálculos viejos (antes del 24/09/2026). */
	fecha_original_vencimiento?: string | null;
	fines_semana_excluidos: number;
	feriados_excluidos: { fecha: string; descripcion: string }[];
	prorrogado_por_inhabil: boolean;
	calculado_at: string;
}

export interface CaseDeadline {
	id: number;
	caseId: number;
	fileId?: number | null;
	jurisdictionId: number;
	deadlineTypeId?: number | null;
	type?: string | null;
	title: string;
	description?: string | null;
	responsibleId: number;
	mode: string;
	notificationDate?: string | null;
	daysCount?: number | null;
	daysType?: string | null;
	dueDate: string;
	dueTime?: string | null;
	advanceNoticeDays: number;
	schedule: number;
	/** JSON guardado como texto (LongText): usar parseCalculationDetail. */
	calculationDetail?: string | DeadlineCalculationDetail | null;
	adjustmentReason?: string | null;
	adjustedAt?: string | null;
	originalDueDate?: string | null;
	status: string;
	createdAt: string;
	updatedAt: string;
	file?: {
		id: number;
		title: string;
		cuij?: string;
	} | null;
	responsiblePerson: {
		id: number;
		name: string;
		email: string;
		image?: string;
	};
	jurisdiction: {
		id: number;
		name: string;
	};
	deadlineType?: {
		id: number;
		code: string;
		name: string;
		daysCount: number;
		daysType: string;
		article?: string | null;
		extendable: boolean;
		peremptory: boolean;
	} | null;
}

export interface CasesFilesMovement {
	id: number;
	mode: number;
	type: number;
	subType?: number | null;
	date: string;
	schedule: number;
	status: string;
	observation: string;
	createdAt: string;
	responsiblePerson: {
		id: number;
		name: string;
		email: string;
		image?: string;
	};
}

export interface Cases {
	id: number;
	number?: string;
	customerId: number;
	title?: string;
	servicesId?: number;
	stageId?: number;
	// Subetapa administrativa (solo Administrativo + Accidente de Trabajo).
	administrativeSubstage?: string | null;
	status?: string;
	statusDate?: Date;
	isActive?: boolean;
	isArchived?: boolean;
	internalLawyerId?: number;
	responsibleLawyerId?: number;
	injury?: string | null;
	accidentDate?: string | null;
	disabilityPercentage?: number | null;
	estadoActual?: string | null;
	informeSavedAt?: string | null;
	informeSentWhatsappAt?: string | null;
	informeSentEmailAt?: string | null;
	informeSentPushAt?: string | null;
	googleReviewLeft?: boolean | null;
	folderName?: string | null;
	createdAt: Date;
	updatedAt: Date;
	customer: User;
	responsibleLawyer?: User;
	internalLawyer?: User;
	files: CasesFiles[];
	notes: CasesNotes[];
	documents: CasesDocuments[];
	logs: CaseLogs[];
	customer: User;
	consultation: CaseConsultations[];
	_count?: { caseEvents: number };
}

interface Jurisdiction {
	id: number;
	name: string;
}

interface Court {
	id: number;
	charter: string;
	courtName: string;
	jurisdiction: Jurisdiction;
}

export interface CasesNotes {
	id: string;
	caseId: string;
	title: string;
	note: string;
	createdAt: string;
	updatedAt: string;
	userId: number;
	user: User;
}

export interface CasesDocuments {
	id: number;
	fileName: string;
	filePath: string;
	fileSize: number;
	fileType: string;
	extension: string;
	uploadedAt: string;
	updatedAt: string;
	caseId: number;
	uploadedById: number;
	description: string;
	isPublic: boolean;
	category: string;
}

export interface CaseLogs {
	id: string;
	caseId: string;
	type: string;
	title: string;
	description: string;
	status: string;
	createdById: number;
	createdBy: User;
	createdAt: string;
	updatedAt: string;
}

export interface CaseConsultations {
	messages: any;
	id: number;
	caseId: number;
	title: string;
	createdAt: string;
	updatedAt: string;
	lastMessagePreview: string;
	unreadMessages: number;
	status: "PENDING" | "OPEN" | "CLOSED";
	consultationMessages: CaseConsultationMessages[];
	cases: Cases; // The 'cases' object within the consultation
	files: ConsultationFile[];
}

export interface CaseConsultationMessages {
	id: number;
	consultationId: number;
	sender: "user" | "responsible";
	content: string;
	timestamp: string;
	files?: ConsultationFile[]; // 👈 Agregado
}

interface ConsultationFile {
	id: number;
	fileName: string;
	filePath: string;
	fileSize: number;
	fileType: string;
	extension: string;
	uploadedAt: string;
	description?: string;
	isPublic: boolean;
	category?: string;
}
