export type ScheduledType = "income" | "expense";
export type ScheduledStatus = "pending" | "paid" | "cancelled";

export interface ScheduledTransaction {
	id: number;
	type: ScheduledType;
	dueDate: string;
	concept: string;
	detail: string | null;
	amount: number | string;
	status: ScheduledStatus;
	paidAt: string | null;
	createdById: number;
	createdAt: string;
	updatedAt: string;
	createdBy?: {
		id: number;
		name: string;
		image: string | null;
	};
}

export interface ScheduledSummary {
	pending: {
		income: { count: number; amount: number };
		expense: { count: number; amount: number };
	};
	currentMonth: {
		income: { count: number; amount: number };
		expense: { count: number; amount: number };
	};
	overdueExpense: { count: number; amount: number };
}

export interface ScheduledFormPayload {
	type: ScheduledType;
	dueDate: string;
	concept: string;
	detail?: string | null;
	amount: number;
}
