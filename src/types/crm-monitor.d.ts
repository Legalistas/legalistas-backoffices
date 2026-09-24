// Tipos del módulo CRM Monitor (Proyecto 3). Mirror del payload que devuelve
// GET /crm-monitor/report en el backend (src/modules/crm-monitor).

export type AlertSeverity = "INFO" | "WARN" | "CRITICAL";
export type AlertAudience = "PRIVATE" | "TEAM";
export type AlertEntityType = "CASE" | "OPPORTUNITY" | "NEGOTIATION";

export type MonitorRuleKey =
	| "cases-stalled"
	| "opportunities-stalled"
	| "negotiations-stalled";

export interface CrmAlert {
	id: number;
	ruleKey: MonitorRuleKey | string;
	severity: AlertSeverity;
	audience: AlertAudience;
	entityType: AlertEntityType;
	entityId: number;
	responsibleUserId: number | null;
	ageDays: number;
	weekOf: string; // ISO date
	message: string;
	payload: Record<string, unknown> | null;
	createdAt: string;
	acknowledgedAt: string | null;
	acknowledgedById: number | null;
}

export interface MonitorReportUser {
	id: number;
	name: string;
	email: string | null;
}

export interface MonitorReportTotals {
	all: number;
	byRule: Record<string, number>;
	bySeverity: { info: number; warn: number; critical: number };
}

export interface MonitorReportResponse {
	weekOf: string; // ISO date
	totals: MonitorReportTotals;
	byRule: Record<string, CrmAlert[]>;
	byResponsible: Array<{ userId: number | null; count: number }>;
	users: MonitorReportUser[];
}

// Copia local de RUN engine result — sirve para el botón "Ejecutar ahora".
export interface EngineRunResult {
	weekOf: string;
	ranAt: string;
	rules: Array<{
		key: string;
		detected: number;
		inserted: number;
		skipped: number;
		errorMessage?: string;
		durationMs: number;
	}>;
	totalDetected: number;
	totalInserted: number;
}
