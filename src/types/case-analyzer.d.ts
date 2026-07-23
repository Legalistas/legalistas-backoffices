// Tipos del módulo Case Analyzer (Proyecto 4). Mirror del payload que
// devuelven los endpoints en src/modules/case-analyzer del backend.

export type CaseAnalysisStatus =
	| "PENDING"
	| "PROCESSING"
	| "DONE"
	| "FAILED"
	| "CANCELLED";

export type AiProviderName = "openai" | "anthropic";

// Item de la lista — sin `report` completo (solo metadatos + progreso).
export interface CaseAnalysisListItem {
	id: number;
	status: CaseAnalysisStatus;
	provider: AiProviderName;
	model: string;
	sourceFileName: string;
	sourceSizeMb: string; // Prisma Decimal serializa como string
	totalChunks: number | null;
	processedChunks: number | null;
	tokensInput: number | null;
	tokensOutput: number | null;
	costUsd: string | null;
	errorMessage: string | null;
	startedAt: string | null;
	finishedAt: string | null;
	createdAt: string;
	requestedBy: { id: number; name: string } | null;
}

export interface CaseAnalysisListResponse {
	caseId: number;
	analyses: CaseAnalysisListItem[];
}

// Bloques del informe estructurado (backend engine/types.ts → AnalysisReport).
export interface AnalysisReport {
	summary: {
		facts: string;
		parties: string[];
		subject: string;
		claimType: string;
	};
	procedural: {
		currentStage: string;
		lastMovement: string;
		nextPossibleSteps: string[];
	};
	evidence: {
		produced: string[];
		missing: string[];
		weakPoints: string[];
		strongPoints: string[];
	};
	assessment: {
		successProbability: "MUY_BAJA" | "BAJA" | "MEDIA" | "ALTA" | "MUY_ALTA";
		reasoning: string;
		keyRisks: string[];
	};
	jurisprudence: Array<{
		caseName: string;
		court: string;
		year: number | null;
		summary: string;
		relevance: string;
		url?: string;
	}>;
	nextAction: {
		type: "ESCRITO" | "NEGOCIACION" | "PRUEBA" | "OTRO";
		title: string;
		outline: string;
		urgency: "BAJA" | "MEDIA" | "ALTA";
	};
	meta: {
		provider: string;
		model: string;
		chunksProcessed: number;
		generatedAt: string;
	};
}

// Response completo del detalle — incluye report si status=DONE + presigned URL.
export interface CaseAnalysisDetail extends CaseAnalysisListItem {
	caseId: number;
	sourceUrl: string | null;
	report: AnalysisReport | null;
}

// Response del POST (upload + encolar).
export interface CreateAnalysisResponse {
	analysisId: number;
	status: CaseAnalysisStatus;
	provider: AiProviderName;
	model: string;
	fileName: string;
	sizeMb: number;
	createdAt: string;
	message: string;
}
