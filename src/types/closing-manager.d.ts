export interface Lawyer {
	id: number;
	name: string;
	image: string | null;
}

export interface Case {
	id: number;
	number: string;
	customerId: number;
	title: string;
	status: string;
	isActive: boolean;
	internalLawyerId: number;
	responsibleLawyerId: number;
	createdAt: string;
	updatedAt: string;
	isArchived: boolean;
	servicesId: number;
	stageId: number;
	statusDate: string | null;
	responsibleLawyer: Lawyer;
	internalLawyer?: Lawyer;
}

export interface ChargeCollector {
	id: number;
	name: string;
	image: string | null;
}

export interface ClosingManagerEntry {
	id: number;
	caseId: number;
	negotiationId?: number | null;
	date: string;
	type: string;

	// Capital
	capitalAmount: number;
	capitalState: string;

	// Honorarios Pactados (HP)
	hpAgreed: number;
	hpTotal: number;
	hpDistribution: boolean;
	feeStatus: string;
	hpChargedAt?: string | null;
	hpChargedById?: number | null;
	hpChargedBy?: ChargeCollector | null;

	// PCL (Pacto de Cuota Litis)
	pclAgreed: number | null;
	pclTotal: number | null;
	pclDistribution: boolean;
	pclStatus: string | null;
	pclChargedAt?: string | null;
	pclChargedById?: number | null;
	pclChargedBy?: ChargeCollector | null;

	// Aportes
	contributionsAmount: number;
	applyContributions: boolean;
	// % que se asigna al representante sobre los aportes (default 25 si no viene del backend)
	aportesRepresentantePercent?: number | null;

	// Detalle
	detail: string | null;

	createdAt: string;
	updatedAt: string;

	// Relaciones
	case: Case;
	negotiation?: {
		id: number;
		status: string;
	} | null;

	// Campos calculados (retornados por el backend)
	hpRepresentante: number;
	hpLegalistas: number;
	pclRepresentante: number;
	pclLegalistas: number;
	aportesRepresentante: number;
	aportesLegalistas: number;
	montoTransferir: number;

	// Progreso de cobro (pagos parciales HP/PCL vinculados desde Caja)
	hpPaid: number;
	hpRemaining: number;
	pclPaid: number;
	pclRemaining: number;

	// Gastos de la causa (solo lectura, desde CasesExpenses)
	totalCaseExpenses: number;
}

export interface ClosingPayment {
	id: number;
	amount: number;
	date: string;
	description: string | null;
	createdAt: string;
	user: ChargeCollector | null;
}

export interface ClosingPaymentsApiResponse {
	data: ClosingPayment[];
	total: number;
}

export interface Pagination {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface ClosingManagerApiResponse {
	data: ClosingManagerEntry[];
	meta: Pagination;
}

export interface ClosingKpis {
	view: "monthly" | "annual";
	month?: number;
	year: number;
	count: number;
	totalCapital: number;
	totalHonorarios: number;
	totalNetoLegalistas: number;
	totalTransferir: number;
}

export interface ClosingKpisApiResponse {
	data: ClosingKpis;
}
