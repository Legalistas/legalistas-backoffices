import type { Employment } from "@/types/users";

export interface RrhhFiltersState {
	startDate: string;
	endDate: string;
	area: string;
}

export interface EmployeeWithEmployment {
	id: number;
	name: string;
	email: string;
	employment: Employment | null;
}

export interface LeaveSummary {
	userId: number;
	type:
		| "VACATION"
		| "SICK"
		| "STUDY"
		| "MATERNITY"
		| "PATERNITY"
		| "UNPAID"
		| "OTHER";
	status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
	startDate: string;
	endDate: string;
	daysRequested: number;
}

export interface RrhhStatsCard {
	activos: number;
	altas: number;
	bajas: number;
	antiguedadPromedio: number;
	costoMensualTotal: number;
}

export interface MonthlyTurnoverItem {
	month: string;
	altas: number;
	bajas: number;
}

export interface MonthlyAbsenteeismItem {
	month: string;
	VACATION: number;
	SICK: number;
	STUDY: number;
	MATERNITY: number;
	PATERNITY: number;
	UNPAID: number;
	OTHER: number;
}

export interface CostByAreaItem {
	area: string;
	total: number;
	count: number;
}

export interface TenureBucketItem {
	range: string;
	count: number;
}
